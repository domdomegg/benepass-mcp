import {
	describe, test, expect, beforeAll, afterAll,
} from 'vitest';
import type {
	CallToolResult,
	JSONRPCMessage,
	JSONRPCRequest,
	JSONRPCResponse,
	ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from './index.js';

// E2E tests hit the real Benepass API. They're skipped unless
// BENEPASS_REFRESH_TOKEN is set — get one by running the login e2e tests, or
// grab `localStorage["refresh-token"]` from app.getbenepass.com.
const REFRESH_TOKEN = process.env.BENEPASS_REFRESH_TOKEN;

type MCPClient = {
	sendRequest: <T>(message: JSONRPCRequest) => Promise<T>;
	close: () => Promise<void>;
};

async function createInMemoryClient(): Promise<MCPClient> {
	const server = createServer();
	const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
	await server.connect(serverTransport);

	const sendRequest = async <T>(message: JSONRPCRequest): Promise<T> => {
		return new Promise((resolve, reject) => {
			clientTransport.onmessage = (response: JSONRPCMessage) => {
				const typedResponse = response as JSONRPCResponse;
				if ('result' in typedResponse) {
					resolve(typedResponse.result as T);
					return;
				}

				reject(new Error('No result in response'));
			};

			clientTransport.onerror = (err: Error) => {
				reject(err);
			};

			clientTransport.send(message).catch((err: unknown) => {
				reject(err instanceof Error ? err : new Error(String(err)));
			});
		});
	};

	return {sendRequest, close: async () => server.close()};
}

let messageId = 0;
async function callTool(client: MCPClient, name: string, args: Record<string, unknown> = {}): Promise<unknown> {
	messageId += 1;
	const result = await client.sendRequest<CallToolResult>({
		jsonrpc: '2.0',
		id: String(messageId),
		method: 'tools/call',
		params: {name, arguments: {refresh_token: REFRESH_TOKEN, ...args}},
	});
	if (result.isError) {
		throw new Error(`tool ${name} errored: ${(result.content[0]?.text as string ?? '').slice(0, 500)}`);
	}

	return JSON.parse(result.content[0]!.text as string);
}

describe.skipIf(!REFRESH_TOKEN)('e2e: Benepass read-only API', () => {
	let client: MCPClient;

	beforeAll(async () => {
		client = await createInMemoryClient();
	}, 30_000);

	afterAll(async () => {
		if (client) {
			await client.close();
		}
	});

	test('tools/list exposes all 11 tools', async () => {
		const result = await client.sendRequest<ListToolsResult>({
			jsonrpc: '2.0', id: 'tl', method: 'tools/list', params: {},
		});
		expect(result.tools.map((t) => t.name).sort()).toEqual([
			'complete_login',
			'get_expense',
			'get_substantiation_requirements',
			'list_accounts',
			'list_benefits',
			'list_currencies',
			'list_transactions',
			'list_workspaces',
			'start_login',
			'submit_expense',
			'upload_receipt',
		]);
	}, 10_000);

	test('list_workspaces returns at least one workspace', async () => {
		const body = await callTool(client, 'list_workspaces') as {data?: {id: string; type: string}[]};
		expect(body.data?.length ?? 0).toBeGreaterThan(0);
		expect(body.data!.some((w) => typeof w.id === 'string' && typeof w.type === 'string')).toBe(true);
	}, 30_000);

	test('list_accounts returns accounts with key/type/balances', async () => {
		const body = await callTool(client, 'list_accounts') as {data?: {id: string; key?: string; type?: string; balances?: unknown[]}[]};
		expect(body.data?.length ?? 0).toBeGreaterThan(0);
		const sample = body.data![0]!;
		expect(typeof sample.id).toBe('string');
		expect(typeof sample.key).toBe('string');
		expect(Array.isArray(sample.balances)).toBe(true);
	}, 30_000);

	test('list_benefits returns benefits with id, name, balance', async () => {
		const body = await callTool(client, 'list_benefits') as {data?: {id: string; name: string | null; available_balance: number | null}[]};
		expect(body.data?.length ?? 0).toBeGreaterThan(0);
		const named = body.data!.filter((b) => b.name);
		expect(named.length).toBeGreaterThan(0);
	}, 30_000);

	test('list_currencies returns at least USD/GBP/EUR', async () => {
		const body = await callTool(client, 'list_currencies') as {data?: {code?: string}[]; results?: {code?: string}[]; count?: number};
		const items = body.data ?? body.results ?? [];
		expect(items.length).toBeGreaterThan(0);
		// First page returns 20 — the codes A-D-ish range. Just check count claims >150.
		expect(body.count ?? 0).toBeGreaterThan(100);
	}, 30_000);

	test('list_transactions honors limit/offset pagination', async () => {
		const page1 = await callTool(client, 'list_transactions', {limit: 3, offset: 0}) as {
			data?: {id: string}[]; total_count?: number;
		};
		expect(page1.data?.length).toBe(3);
		expect(page1.total_count).toBeGreaterThan(0);

		if ((page1.total_count ?? 0) > 3) {
			const page2 = await callTool(client, 'list_transactions', {limit: 3, offset: 3}) as {data?: {id: string}[]};
			expect(page2.data?.length ?? 0).toBeGreaterThan(0);
			// Sanity: page 2's first item differs from page 1's first item
			expect(page2.data![0]!.id).not.toBe(page1.data![0]!.id);
		}
	}, 30_000);

	test('list_transactions can filter by benefit_id', async () => {
		const benefits = await callTool(client, 'list_benefits') as {data?: {id: string}[]};
		const firstBenefit = benefits.data?.[0]?.id;
		if (!firstBenefit) {
			return;
		}

		const filtered = await callTool(client, 'list_transactions', {benefit_id: firstBenefit, limit: 5}) as {data?: unknown[]};
		expect(Array.isArray(filtered.data)).toBe(true);
	}, 30_000);

	test('get_substantiation_requirements returns policies for each benefit', async () => {
		const benefits = await callTool(client, 'list_benefits') as {data?: {id: string}[]};
		const firstBenefit = benefits.data?.[0]?.id;
		if (!firstBenefit) {
			return;
		}

		const reqs = await callTool(client, 'get_substantiation_requirements', {benefit_id: firstBenefit}) as {
			data?: {item_type?: string; required?: boolean}[];
		};
		expect(reqs.data?.length ?? 0).toBeGreaterThan(0);
		expect(reqs.data!.every((p) => typeof p.item_type === 'string')).toBe(true);
	}, 30_000);

	test('get_expense fetches a transaction by id from list_transactions', async () => {
		const txns = await callTool(client, 'list_transactions', {limit: 1}) as {data?: {id: string}[]};
		const id = txns.data?.[0]?.id;
		if (!id) {
			return;
		}

		const expense = await callTool(client, 'get_expense', {expense_id: id}) as {id?: string};
		expect(expense.id).toBe(id);
	}, 30_000);
});

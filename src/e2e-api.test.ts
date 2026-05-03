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
// BENEPASS_REFRESH_TOKEN is set — get one by running `node poc.mjs` from the
// auth POC, or grab `localStorage["refresh-token"]` from app.getbenepass.com.
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

describe.skipIf(!REFRESH_TOKEN)('e2e: Benepass', () => {
	let client: MCPClient;

	beforeAll(async () => {
		client = await createInMemoryClient();
	}, 30_000);

	afterAll(async () => {
		if (client) {
			await client.close();
		}
	});

	test('lists all expected tools', async () => {
		const result = await client.sendRequest<ListToolsResult>({
			jsonrpc: '2.0', id: '1', method: 'tools/list', params: {},
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

	test('list_workspaces returns the user\'s workspaces', async () => {
		const result = await client.sendRequest<CallToolResult>({
			jsonrpc: '2.0', id: '2', method: 'tools/call',
			params: {name: 'list_workspaces', arguments: {refresh_token: REFRESH_TOKEN}},
		});
		const body = JSON.parse(result.content[0]!.text as string);
		expect(body).toMatchObject({object: 'list', data: expect.any(Array)});
		expect(body.data.length).toBeGreaterThan(0);
	}, 30_000);

	test('list_currencies returns currency objects', async () => {
		const result = await client.sendRequest<CallToolResult>({
			jsonrpc: '2.0', id: '3', method: 'tools/call',
			params: {name: 'list_currencies', arguments: {refresh_token: REFRESH_TOKEN}},
		});
		const body = JSON.parse(result.content[0]!.text as string);
		// Benepass mixes pagination shapes — currencies uses DRF-style {count, results}, others use {object: list, data}
		const items = body.data ?? body.results;
		expect(items).toEqual(expect.any(Array));
		expect(items.length).toBeGreaterThan(0);
	}, 30_000);

	test('list_transactions returns the standard pagination shape', async () => {
		const result = await client.sendRequest<CallToolResult>({
			jsonrpc: '2.0', id: '4', method: 'tools/call',
			params: {name: 'list_transactions', arguments: {refresh_token: REFRESH_TOKEN, page_size: 2}},
		});
		const body = JSON.parse(result.content[0]!.text as string);
		expect(body).toMatchObject({object: 'list', data: expect.any(Array), metadata: expect.any(Object)});
	}, 30_000);
});

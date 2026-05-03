import {
	describe, test, expect, beforeAll, afterAll,
} from 'vitest';
import type {
	CallToolResult, JSONRPCMessage, JSONRPCRequest, JSONRPCResponse,
} from '@modelcontextprotocol/sdk/types.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from './index.js';

// Completes the login round-trip started by `e2e-start-login.test.ts`.
//
// Usage:
//   1. Run e2e-start-login.test.ts with BENEPASS_TEST_EMAIL set — copy the
//      challenge_session it logs and the OTP from your email.
//   2. Run this with all three env vars:
//      BENEPASS_TEST_EMAIL=...
//      BENEPASS_TEST_OTP=...
//      BENEPASS_TEST_CHALLENGE_SESSION=...
//
// Cognito sessions expire ~3 minutes after start_login, so don't dawdle.
const TEST_EMAIL = process.env.BENEPASS_TEST_EMAIL;
const TEST_OTP = process.env.BENEPASS_TEST_OTP;
const TEST_CHALLENGE_SESSION = process.env.BENEPASS_TEST_CHALLENGE_SESSION;
const HAVE_ALL = Boolean(TEST_EMAIL && TEST_OTP && TEST_CHALLENGE_SESSION);

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

describe.skipIf(!HAVE_ALL)('e2e: Benepass complete_login', () => {
	let client: MCPClient;

	beforeAll(async () => {
		client = await createInMemoryClient();
	}, 30_000);

	afterAll(async () => {
		if (client) {
			await client.close();
		}
	});

	test('complete_login mints a refresh token from a real OTP', async () => {
		const result = await client.sendRequest<CallToolResult>({
			jsonrpc: '2.0',
			id: '1',
			method: 'tools/call',
			params: {
				name: 'complete_login',
				arguments: {
					email: TEST_EMAIL,
					otp: TEST_OTP,
					challenge_session: TEST_CHALLENGE_SESSION,
				},
			},
		});

		expect(result.isError).not.toBe(true);
		const body = JSON.parse(result.content[0]!.text as string);
		expect(body.refresh_token).toEqual(expect.any(String));
		expect((body.refresh_token as string).length).toBeGreaterThan(100);
		expect(body.access_token_expires_in_seconds).toBeGreaterThan(0);

		// Print prominently so a human (or follow-up `BENEPASS_REFRESH_TOKEN=... npx vitest run e2e-api.test.ts`)
		// can pick it up without scrolling.
		console.error(`\n[e2e-complete-login] refresh_token=${body.refresh_token}\n`);
	}, 30_000);
});

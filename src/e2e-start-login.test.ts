import {
	describe, test, expect, beforeAll, afterAll,
} from 'vitest';
import type {
	CallToolResult, JSONRPCMessage, JSONRPCRequest, JSONRPCResponse,
} from '@modelcontextprotocol/sdk/types.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from './index.js';

// E2E tests for `start_login`. Hits the real Benepass Cognito user pool and
// triggers an OTP email to BENEPASS_TEST_EMAIL each run, so it's skipped
// unless that env var is set.
//
// Pair with `e2e-complete-login.test.ts` to exercise the full login round-trip:
//   1. Run this — copy `challenge_session` from the test output.
//   2. Read the OTP from your email.
//   3. Run e2e-complete-login.test.ts with BENEPASS_TEST_OTP and
//      BENEPASS_TEST_CHALLENGE_SESSION set.
const TEST_EMAIL = process.env.BENEPASS_TEST_EMAIL;

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

describe.skipIf(!TEST_EMAIL)('e2e: Benepass start_login', () => {
	let client: MCPClient;

	beforeAll(async () => {
		client = await createInMemoryClient();
	}, 30_000);

	afterAll(async () => {
		if (client) {
			await client.close();
		}
	});

	test('start_login triggers a CUSTOM_CHALLENGE and returns a session', async () => {
		const result = await client.sendRequest<CallToolResult>({
			jsonrpc: '2.0',
			id: '1',
			method: 'tools/call',
			params: {name: 'start_login', arguments: {email: TEST_EMAIL}},
		});

		const body = JSON.parse(result.content[0]!.text as string);
		expect(body).toMatchObject({
			challenge_name: 'CUSTOM_CHALLENGE',
			challenge_session: expect.any(String),
		});
		const challengeSession = body.challenge_session as string;
		expect(challengeSession.length).toBeGreaterThan(100);

		// Print prominently so the follow-up complete_login step can grab it.
		// (Don't add other tests to this file that would consume the session —
		// Cognito invalidates it on any RespondToAuthChallenge call.)
		console.error(`\n[e2e-start-login] challenge_session=${challengeSession}\n`);
	}, 30_000);
});

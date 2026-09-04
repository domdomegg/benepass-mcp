import {
	describe, it, expect, vi, afterEach,
} from 'vitest';
import {initiateAuth} from './cognito.js';

const PROTOCOL_SELECTOR_CHALLENGE = {
	ChallengeName: 'CUSTOM_CHALLENGE',
	ChallengeParameters: {
		USERNAME: 'user@example.com',
		challenge_type: 'protocol_selector',
		magic_link_v1_available: 'false',
		schema_version: '1',
	},
	Session: 'session-from-initiate-auth',
};

const OTP_CHALLENGE = {
	ChallengeName: 'CUSTOM_CHALLENGE',
	ChallengeParameters: {USERNAME: 'user@example.com'},
	Session: 'session-from-protocol-selector',
};

function mockCognito(...responses: unknown[]) {
	const fetchMock = vi.fn();
	for (const body of responses) {
		fetchMock.mockResolvedValueOnce({ok: true, text: async () => JSON.stringify(body)});
	}

	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

/** The parsed JSON body of the nth fetch call. */
function bodyOf(fetchMock: ReturnType<typeof vi.fn>, index: number): Record<string, any> {
	return JSON.parse(fetchMock.mock.calls[index]![1].body as string);
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('initiateAuth', () => {
	it('answers the protocol_selector challenge so an OTP is actually sent', async () => {
		const fetchMock = mockCognito(PROTOCOL_SELECTOR_CHALLENGE, OTP_CHALLENGE);

		const result = await initiateAuth('user@example.com');

		// Two round trips: InitiateAuth, then the selector answer. Without the second one Cognito
		// never triggers the email, and the caller is left holding a session for the wrong stage.
		expect(fetchMock).toHaveBeenCalledTimes(2);

		const second = bodyOf(fetchMock, 1);
		expect(second.Session).toBe('session-from-initiate-auth');
		expect(second.ChallengeResponses).toMatchObject({
			USERNAME: 'user@example.com',
			ANSWER: 'email_code_v0',
			challenge_type: 'protocol_selector',
			schema_version: '1',
		});
		expect(second.ClientMetadata).toEqual({protocol: 'email_code_v0', schema_version: '1'});

		// The caller gets the OTP-stage session, so complete_login pairs the code with the right one.
		expect(result.Session).toBe('session-from-protocol-selector');
	});

	it('passes a non-selector challenge straight through', async () => {
		const fetchMock = mockCognito(OTP_CHALLENGE);

		const result = await initiateAuth('user@example.com');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result.Session).toBe('session-from-protocol-selector');
	});
});

import {CLIENT_ID, COGNITO_IDP_URL, COGNITO_TOKEN_URL} from './constants.js';

type AuthResult = {
	AccessToken: string;
	RefreshToken: string;
	IdToken: string;
	ExpiresIn: number;
	TokenType: string;
};

type ChallengeResponse = {
	ChallengeName: string;
	ChallengeParameters?: Record<string, string>;
	Session?: string;
	AuthenticationResult?: AuthResult;
};

type TokenResponse = {
	access_token: string;
	id_token: string;
	expires_in: number;
	token_type: string;
};

async function callCognitoIdp<T>(target: 'InitiateAuth' | 'RespondToAuthChallenge', body: unknown): Promise<T> {
	const response = await fetch(COGNITO_IDP_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-amz-json-1.1',
			'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
		},
		body: JSON.stringify(body),
	});

	const text = await response.text();
	if (!response.ok) {
		throw new Error(`Cognito ${target} ${response.status}: ${text.slice(0, 500)}`);
	}

	return JSON.parse(text) as T;
}

/** The protocol the `protocol_selector` challenge must be answered with to get an emailed code.
 *
 * Benepass's sign-on app (signon.benefitsapi.com) offers `email_code_v0` and, where the account has
 * it enabled, a magic link. We always pick the code: an MCP client can be handed six digits, but it
 * cannot click a link in a mailbox.
 */
const EMAIL_CODE_PROTOCOL = 'email_code_v0';
const PROTOCOL_SELECTOR_SCHEMA_VERSION = '1';

/** Is this challenge the protocol selector rather than the OTP prompt? */
function isProtocolSelector(challenge: ChallengeResponse): boolean {
	const params = challenge.ChallengeParameters ?? {};
	return params.challenge_type === 'protocol_selector'
		&& params.schema_version === PROTOCOL_SELECTOR_SCHEMA_VERSION
		&& typeof challenge.Session === 'string';
}

/** Start the email-OTP login. Cognito triggers a CUSTOM_CHALLENGE that emails an OTP.
 *
 * Benepass's custom auth is TWO challenges, not one. `InitiateAuth` returns a `protocol_selector`
 * challenge asking which delivery method to use; **no email is sent until that is answered**. Only
 * then does the OTP challenge (and the actual email) arrive. Answering the selector here keeps the
 * two-stage flow an implementation detail: callers still get back a session to pair with the code.
 *
 * The selector is skipped when absent, so this stays correct for accounts or future schema versions
 * that go straight to the OTP challenge.
 */
export async function initiateAuth(email: string): Promise<ChallengeResponse> {
	const challenge = await callCognitoIdp<ChallengeResponse>('InitiateAuth', {
		AuthFlow: 'CUSTOM_AUTH',
		ClientId: CLIENT_ID,
		AuthParameters: {USERNAME: email},
	});

	if (!isProtocolSelector(challenge)) {
		return challenge;
	}

	// Mirrors the sign-on app: the challenge parameters are echoed back into ChallengeResponses
	// alongside USERNAME + ANSWER, and the chosen protocol is repeated in ClientMetadata (which is
	// what the Create-Auth-Challenge Lambda reads to decide what to send).
	return callCognitoIdp<ChallengeResponse>('RespondToAuthChallenge', {
		ChallengeName: 'CUSTOM_CHALLENGE',
		ClientId: CLIENT_ID,
		Session: challenge.Session,
		ChallengeResponses: {
			...challenge.ChallengeParameters,
			USERNAME: email,
			ANSWER: EMAIL_CODE_PROTOCOL,
		},
		ClientMetadata: {
			protocol: EMAIL_CODE_PROTOCOL,
			schema_version: PROTOCOL_SELECTOR_SCHEMA_VERSION,
		},
	});
}

/** Complete the email-OTP login by responding with the code. */
export async function respondToAuthChallenge(args: {
	email: string;
	otp: string;
	session: string;
	challengeName?: string;
}): Promise<ChallengeResponse> {
	return callCognitoIdp<ChallengeResponse>('RespondToAuthChallenge', {
		ChallengeName: args.challengeName ?? 'CUSTOM_CHALLENGE',
		ClientId: CLIENT_ID,
		Session: args.session,
		ChallengeResponses: {
			USERNAME: args.email,
			ANSWER: args.otp,
		},
	});
}

/** Exchange a refresh token for a fresh access token via Cognito's OAuth endpoint. */
export async function exchangeRefreshToken(refreshToken: string): Promise<TokenResponse> {
	const response = await fetch(COGNITO_TOKEN_URL, {
		method: 'POST',
		headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: CLIENT_ID,
			refresh_token: refreshToken,
		}).toString(),
	});

	const text = await response.text();
	if (!response.ok) {
		const truncated = text.slice(0, 500);
		if (response.status === 400) {
			throw new Error(`Refresh token rejected (HTTP 400 invalid_grant). It has likely expired or been revoked — call \`start_login\` and \`complete_login\` again to get a fresh refresh token. Raw: ${truncated}`);
		}

		throw new Error(`Token exchange failed (HTTP ${response.status}): ${truncated}`);
	}

	return JSON.parse(text) as TokenResponse;
}

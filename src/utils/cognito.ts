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

/** Start the email-OTP login. Cognito triggers a CUSTOM_CHALLENGE that emails an OTP. */
export async function initiateAuth(email: string): Promise<ChallengeResponse> {
	return callCognitoIdp<ChallengeResponse>('InitiateAuth', {
		AuthFlow: 'CUSTOM_AUTH',
		ClientId: CLIENT_ID,
		AuthParameters: {USERNAME: email},
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

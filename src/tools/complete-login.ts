import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {respondToAuthChallenge} from '../utils/cognito.js';

const inputSchema = strictSchemaWithAliases({
	email: z.string().email().describe('The email address registered with Benepass — must match the value passed to start_login.'),
	otp: z.string().min(1).describe('The one-time code from the email.'),
	challenge_session: z.string().min(1).describe('The session token returned by start_login.'),
	challenge_name: z.string().min(1).optional().describe('The challenge name returned by start_login (default: "CUSTOM_CHALLENGE"). Usually unnecessary.'),
});

export function registerCompleteLogin(server: McpServer): void {
	server.registerTool(
		'complete_login',
		{
			title: 'Complete login',
			description: `Second step of email-OTP login. Verifies the OTP and returns a \`refresh_token\` that all other tools take as their first argument.

The refresh token is the durable credential — keep it for the rest of the session (and across sessions if you want — its lifetime is at least hours, possibly days). When it expires, calls return an "invalid_grant" error and you'll need to repeat start_login + complete_login.`,
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const result = await respondToAuthChallenge({
				email: args.email,
				otp: args.otp,
				session: args.challenge_session,
				challengeName: args.challenge_name,
			});

			if (!result.AuthenticationResult) {
				throw new Error(`No AuthenticationResult returned. The OTP may have been wrong or the session expired. Cognito returned: ${JSON.stringify(result)}`);
			}

			if (!result.AuthenticationResult.RefreshToken) {
				throw new Error(`Cognito returned an AuthenticationResult without a RefreshToken — this MCP can't continue without one. Response: ${JSON.stringify(result)}`);
			}

			return jsonResult({
				refresh_token: result.AuthenticationResult.RefreshToken,
				access_token_expires_in_seconds: result.AuthenticationResult.ExpiresIn,
				message: 'Login complete. Pass `refresh_token` as the first argument to all other tools.',
			});
		},
	);
}

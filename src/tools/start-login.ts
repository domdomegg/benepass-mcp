import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {initiateAuth} from '../utils/cognito.js';

const inputSchema = strictSchemaWithAliases({
	email: z.string().email().describe('The email address registered with Benepass.'),
}, {
	username: 'email',
});

export function registerStartLogin(server: McpServer): void {
	server.registerTool(
		'start_login',
		{
			title: 'Start login',
			description: `First step of email-OTP login. Triggers Benepass to send a one-time code to the given email address. Returns a \`challenge_session\` token that must be passed back to \`complete_login\` along with the OTP.

The challenge session is short-lived (Cognito default ~3 minutes) — read the OTP from email and call \`complete_login\` promptly.

If you have a Gmail MCP available, you can poll inbox for the new message from Benepass to fully automate the login flow.`,
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const result = await initiateAuth(args.email);
			if (!result.Session) {
				throw new Error(`Unexpected response from Cognito InitiateAuth: ${JSON.stringify(result)}`);
			}

			return jsonResult({
				challenge_name: result.ChallengeName,
				challenge_session: result.Session,
				message: `One-time code sent to ${args.email}. Read the OTP from your email, then call complete_login with email, otp, and challenge_session.`,
			});
		},
	);
}

import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerGetCurrentUser(server: McpServer): void {
	server.registerTool(
		'get_current_user',
		{
			title: 'Get current user',
			description: 'Get the Benepass user profile for the configured `refresh_token` — name, email, country, timezone, addresses. Useful for "who am I" confirmation and for picking up locale context (`country`, `timezone`) when reasoning about benefits.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, '/v2/me/');
			return jsonResult(data);
		},
	);
}

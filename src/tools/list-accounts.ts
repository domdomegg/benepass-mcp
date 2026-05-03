import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerListAccounts(server: McpServer): void {
	server.registerTool(
		'list_accounts',
		{
			title: 'List accounts',
			description: 'List the user\'s benefit accounts in the given workspace, with their balances, statuses, and the benefits they enrol the user into. Use this to discover what benefits the user has access to before submitting an expense.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, '/v2/me/accounts/');
			return jsonResult(data);
		},
	);
}

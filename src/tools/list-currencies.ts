import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerListCurrencies(server: McpServer): void {
	server.registerTool(
		'list_currencies',
		{
			title: 'List currencies',
			description: 'List Benepass currency objects (e.g. USD, GBP, EUR) with their `crcy_xxx` ids. `submit_expense` accepts both ISO codes (e.g. "GBP") and these ids — but the ids must come from this endpoint.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, '/v2/me/currencies/');
			return jsonResult(data);
		},
	);
}

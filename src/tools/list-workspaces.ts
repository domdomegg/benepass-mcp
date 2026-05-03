import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
});

export function registerListWorkspaces(server: McpServer): void {
	server.registerTool(
		'list_workspaces',
		{
			title: 'List workspaces',
			description: `List the Benepass workspaces the current user belongs to. Most users have one \`type=employment\` workspace (your job's benefits) and possibly a \`type=user\` workspace.

The \`employment\` workspace is what holds benefits, accounts, and expenses. Other tools accept its id via \`workspace_id\` — most will auto-pick it if you don't specify, but listing first is useful if you have multiple employments.`,
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args, {requireWorkspace: false});
			const data = await apiGet(auth, '/v2/me/workspaces/');
			return jsonResult(data);
		},
	);
}

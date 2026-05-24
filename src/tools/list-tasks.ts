import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerListTasks(server: McpServer): void {
	server.registerTool(
		'list_tasks',
		{
			title: 'List tasks',
			description: 'List the user\'s action-required items in the given workspace (e.g. a receipt needed to substantiate a transaction, onboarding steps to complete).',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, '/v2/me/tasks/');
			return jsonResult(data);
		},
	);
}

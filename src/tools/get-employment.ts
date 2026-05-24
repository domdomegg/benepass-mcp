import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerGetEmployment(server: McpServer): void {
	server.registerTool(
		'get_employment',
		{
			title: 'Get employment',
			description: 'Fetch the user\'s employment record for the given workspace (e.g. employer, employment status, hire date).',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, '/v2/me/employment/');
			return jsonResult(data);
		},
	);
}

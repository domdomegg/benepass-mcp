import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerListAvailableCards(server: McpServer): void {
	server.registerTool(
		'list_available_cards',
		{
			title: 'List available cards',
			description: 'List the card types the user is eligible to issue/request in the given workspace (i.e. cards available to create, not yet held).',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, '/v2/me/cards/available/');
			return jsonResult(data);
		},
	);
}

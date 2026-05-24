import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		card_id: z.string().min(1).describe('The card id (e.g. `card_xxx`) — see `list_cards`.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'card_id',
	},
);

export function registerGetCard(server: McpServer): void {
	server.registerTool(
		'get_card',
		{
			title: 'Get card',
			description: 'Fetch a single benefit/spending card by id, returning its full record including status, last four digits, and linked benefits.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, `/v2/me/cards/${args.card_id}/`);
			return jsonResult(data);
		},
	);
}

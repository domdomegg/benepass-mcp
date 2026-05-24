import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPatchJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		card_id: z.string().min(1).describe('The card id to update (e.g. `card_xxx`) — see `list_cards`.'),
		status: z.string().min(1).describe('The new card status (e.g. lock/unlock/active/frozen).'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'card_id',
	},
);

export function registerSetCardStatus(server: McpServer): void {
	server.registerTool(
		'set_card_status',
		{
			title: 'Set card status',
			description: 'Change a benefit card\'s status — the equivalent of locking/unlocking (or freezing/activating) a card in the Benepass app. PATCHes `/v2/me/cards/{card_id}/` with `{status}`.',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiPatchJson(auth, `/v2/me/cards/${args.card_id}/`, {status: args.status});
			return jsonResult(data);
		},
	);
}

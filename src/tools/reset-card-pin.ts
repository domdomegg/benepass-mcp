import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		card_id: z.string().min(1).describe('The card id to reset the PIN for (e.g. `card_xxx`) — see `list_cards`.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'card_id',
	},
);

export function registerResetCardPin(server: McpServer): void {
	server.registerTool(
		'reset_card_pin',
		{
			title: 'Reset card PIN',
			description: 'Reset the PIN for a benefit card — the equivalent of requesting a PIN reset in the Benepass app. POSTs `/v2/me/cards/{card_id}/reset-pin/` (no body).',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiPostJson(auth, `/v2/me/cards/${args.card_id}/reset-pin/`, {});
			return jsonResult(data);
		},
	);
}

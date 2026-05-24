import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const shippingAddressSchema = z.object({
	line1: z.string().min(1).optional().describe('Street address line 1.'),
	line2: z.string().min(1).optional().describe('Street address line 2.'),
	city: z.string().min(1).optional().describe('City.'),
	state: z.string().min(1).optional().describe('State / region.'),
	country: z.string().min(1).optional().describe('Country.'),
	postal_code: z.string().min(1).optional().describe('Postal / ZIP code.'),
}).strict();

const inputSchema = strictSchemaWithAliases({
	spending_instrument_id: z.string().min(1).describe('The spending instrument id to issue the card against — see `list_available_cards`.'),
	shipping_address: shippingAddressSchema.optional().describe('Optional shipping address for a physical card. If omitted, the server uses the address on file.'),
	ip_address: z.string().min(1).optional().describe('Optional originating IP address. The server fills this in if omitted.'),
	timestamp: z.string().min(1).optional().describe('Optional ISO timestamp for the order. The server fills this in if omitted.'),
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerOrderCard(server: McpServer): void {
	server.registerTool(
		'order_card',
		{
			title: 'Order card',
			description: 'Order/issue a new benefit card — the equivalent of requesting a card in the Benepass app. POSTs `/v2/me/cards/` with the `spending_instrument_id` (required; see `list_available_cards`) and an optional structured `shipping_address`. `ip_address` and `timestamp` are optional and filled by the server if omitted.',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const body: Record<string, unknown> = {
				spending_instrument_id: args.spending_instrument_id,
				...(args.ip_address !== undefined ? {ip_address: args.ip_address} : {}),
				...(args.timestamp !== undefined ? {timestamp: args.timestamp} : {}),
				...(args.shipping_address !== undefined ? {shipping_address: args.shipping_address} : {}),
			};
			const data = await apiPostJson(auth, '/v2/me/cards/', body);
			return jsonResult(data);
		},
	);
}

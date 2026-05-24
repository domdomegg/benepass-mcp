import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		merchant_id: z.string().min(1).describe('The merchant id — see `list_merchants`.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'merchant_id',
	},
);

export function registerGetMerchant(server: McpServer): void {
	server.registerTool(
		'get_merchant',
		{
			title: 'Get merchant',
			description: 'Fetch a single merchant by id, returning its full record.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, `/v2/me/merchants/${args.merchant_id}/`);
			return jsonResult(data);
		},
	);
}

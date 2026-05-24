import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiDelete} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	account_id: z.string().min(1).describe('The HSA benefit account id (e.g. `account_xxx`) — see `list_accounts`.'),
	link_id: z.string().min(1).describe('The asset-link id to remove — see `add_hsa_investment_asset_link` / the account\'s HSA investment details.'),
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerRemoveHsaInvestmentAssetLink(server: McpServer): void {
	server.registerTool(
		'remove_hsa_investment_asset_link',
		{
			title: 'Remove HSA investment asset link',
			description: 'Remove an Alpaca investment asset link from an HSA investment account. US HSA only. DELETEs `/v2/me/accounts/{account_id}/hsa-investments/asset-links/{link_id}/`.',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiDelete(auth, `/v2/me/accounts/${args.account_id}/hsa-investments/asset-links/${args.link_id}/`);
			return jsonResult(data);
		},
	);
}

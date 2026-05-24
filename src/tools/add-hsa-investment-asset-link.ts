import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		account_id: z.string().min(1).describe('The HSA benefit account id (e.g. `account_xxx`) — see `list_accounts`.'),
		alpaca_investment: z.record(z.unknown()).describe('The Alpaca investment payload to link, passed through to the API.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'account_id',
	},
);

export function registerAddHsaInvestmentAssetLink(server: McpServer): void {
	server.registerTool(
		'add_hsa_investment_asset_link',
		{
			title: 'Add HSA investment asset link',
			description: 'Link an Alpaca investment asset to an HSA investment account. US HSA only. POSTs `/v2/me/accounts/{account_id}/hsa-investments/asset-links/` with `{alpaca_investment}`.',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiPostJson(auth, `/v2/me/accounts/${args.account_id}/hsa-investments/asset-links/`, {alpaca_investment: args.alpaca_investment});
			return jsonResult(data);
		},
	);
}

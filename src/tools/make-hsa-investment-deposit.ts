import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		account_id: z.string().min(1).describe('The HSA benefit account id (e.g. `account_xxx`) — see `list_accounts`.'),
		amount: z.number().describe('The amount to deposit into the HSA investment account. Passed through to the API as-is.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'account_id',
	},
);

export function registerMakeHsaInvestmentDeposit(server: McpServer): void {
	server.registerTool(
		'make_hsa_investment_deposit',
		{
			title: 'Make HSA investment deposit',
			description: 'Deposit cash from an HSA into its investment account. US HSA only. POSTs `/v2/me/accounts/{account_id}/hsa-investments/deposits/` with `{amount}`.',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiPostJson(auth, `/v2/me/accounts/${args.account_id}/hsa-investments/deposits/`, {amount: args.amount});
			return jsonResult(data);
		},
	);
}

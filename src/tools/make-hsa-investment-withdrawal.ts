import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		account_id: z.string().min(1).describe('The HSA benefit account id (e.g. `account_xxx`) — see `list_accounts`.'),
		amount: z.number().describe('The amount to withdraw from the HSA investment account back to cash. Passed through to the API as-is.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'account_id',
	},
);

export function registerMakeHsaInvestmentWithdrawal(server: McpServer): void {
	server.registerTool(
		'make_hsa_investment_withdrawal',
		{
			title: 'Make HSA investment withdrawal',
			description: 'Withdraw funds from an HSA investment account back to cash. US HSA only. POSTs `/v2/me/accounts/{account_id}/hsa-investments/withdrawals/` with `{amount}`.',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiPostJson(auth, `/v2/me/accounts/${args.account_id}/hsa-investments/withdrawals/`, {amount: args.amount});
			return jsonResult(data);
		},
	);
}

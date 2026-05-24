import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		account_id: z.string().min(1).describe('The benefit account id to pay out (e.g. `account_xxx`) — see `list_accounts`.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'account_id',
	},
);

export function registerRequestAccountPayout(server: McpServer): void {
	server.registerTool(
		'request_account_payout',
		{
			title: 'Request account payout',
			description: 'Trigger a payout for a benefit account — the equivalent of requesting a payout/disbursement of an account balance in the Benepass app. POSTs `/v2/me/accounts/{account_id}/payouts/` (no body). Funds go to the linked payout bank account (see `list_bank_accounts`).',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiPostJson(auth, `/v2/me/accounts/${args.account_id}/payouts/`, {});
			return jsonResult(data);
		},
	);
}

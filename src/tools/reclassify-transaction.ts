import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPatchJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';
import {resolveAccountId} from '../utils/resolve-account.js';

const inputSchema = strictSchemaWithAliases(
	{
		transaction_id: z.string().min(1).describe('The card transaction id to reclassify (e.g. `txn_xxx`) — see `list_transactions`.'),
		benefit_id: z.string().min(1).optional().describe('Benefit id to move the transaction to (e.g. `benefit_xxx`) — see `list_benefits`. Resolved to the matching benefit account automatically.'),
		account_id: z.string().min(1).optional().describe('Benefit account id to move the transaction to (e.g. `account_xxx`). Direct alternative to `benefit_id` — see `list_accounts`.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'transaction_id',
	},
);

export function registerReclassifyTransaction(server: McpServer): void {
	server.registerTool(
		'reclassify_transaction',
		{
			title: 'Reclassify transaction',
			description: `Move a card transaction to a different benefit — the equivalent of changing which benefit a card charge is paid from in the Benepass app. Pass either \`benefit_id\` (resolved to the matching benefit account) or \`account_id\` directly.

Only benefits eligible for that transaction are accepted; if you pick an ineligible benefit the Benepass API rejects the change and the error is surfaced verbatim. PATCHes \`/v2/me/transactions/{transaction_id}/\` with \`{account: "<account_id>"}\`.`,
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const accountId = await resolveAccountId(auth, args);
			const data = await apiPatchJson(auth, `/v2/me/transactions/${args.transaction_id}/`, {account: accountId});
			return jsonResult(data);
		},
	);
}

import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet, apiPatchJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		expense_id: z.string().min(1).describe('The expense id to update (e.g. `expense_xxx`) — see `submit_expense` / `get_expense`.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
		note: z.string().min(1).optional().describe('New value for the expense\'s `note` substantiation item (a short description of the purchase). Replaces the existing note.'),
		receipt_urls: z.array(z.string().min(1)).optional().describe('New receipt presigned URLs from `upload_receipt`, replacing the existing receipt(s) on the expense. Use this to fix or replace an attached receipt.'),
	},
	{
		id: 'expense_id',
		transaction_id: 'expense_id',
	},
);

// The shape get_expense (GET /v2/me/transactions/{id}/) returns for the claim.
type Expense = {
	claim?: {
		id?: string;
		substantiation_items?: {id: string; item_type: string}[];
	};
};

export function registerUpdateExpense(server: McpServer): void {
	server.registerTool(
		'update_expense',
		{
			title: 'Update expense',
			description: `Update the substantiation (note and/or receipt) on an existing expense's claim — the equivalent of editing an expense in the Benepass app and clicking "Save changes". Use this to fix or replace a receipt that was attached incorrectly, or to amend the note.

Workflow:
1. (If replacing a receipt) Call \`upload_receipt\` for the new file and collect the returned \`presigned_url\`.
2. Call this tool with the \`expense_id\` and the new \`note\` and/or \`receipt_urls\`.

It looks up the expense's claim and its existing substantiation items, then PATCHes \`/v2/me/claims/{claim_id}/\`, setting the value of the matching note/receipt item. Only the items you pass are changed. Re-submitting a receipt typically moves the expense back to "in review".`,
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			if (args.note === undefined && args.receipt_urls === undefined) {
				throw new Error('Pass at least one of `note` or `receipt_urls` to update.');
			}

			const auth = await resolveAuth(args);

			// Fetch the expense to resolve its claim id and the ids of the existing
			// substantiation items — the update endpoint references items by id, not type.
			const expense = await apiGet(auth, `/v2/me/transactions/${args.expense_id}/`) as Expense;
			const {claim} = expense;
			if (!claim?.id) {
				throw new Error(`Expense ${args.expense_id} has no claim to update.`);
			}

			const items = claim.substantiation_items ?? [];
			const findItem = (type: string): string => {
				const match = items.find((i) => i.item_type === type);
				if (!match) {
					throw new Error(`This expense's claim has no "${type}" substantiation item to update (items: ${items.map((i) => i.item_type).join(', ') || 'none'}).`);
				}

				return match.id;
			};

			const substantiationItems: {id: string; item_detail: {value: unknown}}[] = [];
			if (args.note !== undefined) {
				substantiationItems.push({id: findItem('note'), item_detail: {value: args.note}});
			}

			if (args.receipt_urls !== undefined) {
				substantiationItems.push({id: findItem('receipt'), item_detail: {value: args.receipt_urls}});
			}

			const data = await apiPatchJson(auth, `/v2/me/claims/${claim.id}/`, {substantiation_items: substantiationItems});
			return jsonResult(data);
		},
	);
}

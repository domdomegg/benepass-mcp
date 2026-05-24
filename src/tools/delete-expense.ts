import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiDelete} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		expense_id: z.string().min(1).describe('The expense id to withdraw/delete (e.g. `expense_xxx`) — see `submit_expense` / `get_expense`.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'expense_id',
	},
);

export function registerDeleteExpense(server: McpServer): void {
	server.registerTool(
		'delete_expense',
		{
			title: 'Delete expense',
			description: 'Withdraw/delete a submitted expense — the equivalent of removing a pending reimbursement claim in the Benepass app. DELETEs `/v2/me/expenses/{expense_id}/`. This permanently removes the expense; you cannot undo it.',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiDelete(auth, `/v2/me/expenses/${args.expense_id}/`);
			return jsonResult(data);
		},
	);
}

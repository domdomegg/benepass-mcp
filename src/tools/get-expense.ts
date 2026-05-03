import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		expense_id: z.string().min(1).describe('The expense id, e.g. `expense_xxx`. Also works with non-expense transaction ids (`txn_xxx`).'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'expense_id',
		transaction_id: 'expense_id',
	},
);

export function registerGetExpense(server: McpServer): void {
	server.registerTool(
		'get_expense',
		{
			title: 'Get expense',
			description: 'Fetch a single expense (created via `submit_expense`) by id. Returns the full expense record including the claim status and substantiation items. Internally uses Benepass\'s `/v2/me/transactions/{id}/` endpoint, which serves both expense and card-transaction records, so this tool also works for non-expense transaction ids.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, `/v2/me/transactions/${args.expense_id}/`);
			return jsonResult(data);
		},
	);
}

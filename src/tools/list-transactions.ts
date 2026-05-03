import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
	page_size: z.number().int().min(1).max(100).default(20).describe('Results per page (default: 20).'),
	starting_after: z.string().min(1).optional().describe('Cursor for pagination — pass the `id` of the last item from the previous page to fetch the next page.'),
	benefit_id: z.string().min(1).optional().describe('Filter results to a single benefit by id (e.g. `benefit_xxx`).'),
});

export function registerListTransactions(server: McpServer): void {
	server.registerTool(
		'list_transactions',
		{
			title: 'List transactions',
			description: 'List the user\'s transactions in this workspace — both card transactions and reimbursement expenses. Supports filtering by `benefit_id`. Returns Stripe-style paginated results with a `data` array, `total_count`, and `metadata`. Use `starting_after` with the last item\'s `id` to fetch the next page.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const params: Record<string, string | number> = {
				page_size: args.page_size,
			};
			if (args.starting_after) {
				params.starting_after = args.starting_after;
			}

			if (args.benefit_id) {
				params.benefit = args.benefit_id;
			}

			const data = await apiGet(auth, '/v2/me/transactions/', params);
			return jsonResult(data);
		},
	);
}

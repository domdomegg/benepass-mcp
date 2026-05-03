import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
	limit: z.number().int().min(1).max(100).default(20).describe('Results per page (default: 20, max: 100).'),
	offset: z.number().int().min(0).default(0).describe('Skip this many results — use for pagination (default: 0).'),
	benefit_id: z.string().min(1).optional().describe('Filter results to a single benefit by id (e.g. `benefit_xxx`).'),
}, {
	page_size: 'limit',
});

export function registerListTransactions(server: McpServer): void {
	server.registerTool(
		'list_transactions',
		{
			title: 'List transactions',
			description: 'List the user\'s transactions in this workspace — both card transactions and reimbursement expenses. Supports filtering by `benefit_id`. Pagination is offset-based: response includes `total_count`, request next page with `offset = previous offset + limit`.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const params: Record<string, string | number> = {
				limit: args.limit,
				offset: args.offset,
			};
			if (args.benefit_id) {
				params.benefit = args.benefit_id;
			}

			const data = await apiGet(auth, '/v2/me/transactions/', params);
			return jsonResult(data);
		},
	);
}

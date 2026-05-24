import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPatchJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		account_id: z.string().min(1).describe('The HSA benefit account id (e.g. `account_xxx`) — see `list_accounts`.'),
		allocation: z.record(z.unknown()).describe('The portfolio allocation object, passed through to the API. Shape depends on the available investment options.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'account_id',
	},
);

export function registerUpdateHsaInvestmentAllocation(server: McpServer): void {
	server.registerTool(
		'update_hsa_investment_allocation',
		{
			title: 'Update HSA investment allocation',
			description: 'Update the portfolio allocation for an HSA investment account. US HSA only. PATCHes `/v2/me/accounts/{account_id}/hsa-investments/portfolio/allocation/` with the passthrough `allocation` object.',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiPatchJson(auth, `/v2/me/accounts/${args.account_id}/hsa-investments/portfolio/allocation/`, args.allocation);
			return jsonResult(data);
		},
	);
}

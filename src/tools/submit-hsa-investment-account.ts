import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		account_id: z.string().min(1).describe('The HSA benefit account id (e.g. `account_xxx`) — see `list_accounts`.'),
		form_field_submissions: z.union([z.array(z.unknown()), z.record(z.unknown())]).describe('The HSA investment account application field submissions. Passed through to the API.'),
		metadata: z.record(z.unknown()).optional().describe('Optional metadata object passed through with the submission.'),
		ip_address: z.string().min(1).optional().describe('Optional originating IP address. The server fills this in if omitted.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'account_id',
	},
);

export function registerSubmitHsaInvestmentAccount(server: McpServer): void {
	server.registerTool(
		'submit_hsa_investment_account',
		{
			title: 'Submit HSA investment account',
			description: 'Submit (open) an HSA investment account application. US HSA only. POSTs `/v2/me/accounts/{account_id}/hsa-investments/account/submissions/` with `{metadata, ip_address, form_field_submissions}`.',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const body: Record<string, unknown> = {
				form_field_submissions: args.form_field_submissions,
				...(args.metadata !== undefined ? {metadata: args.metadata} : {}),
				...(args.ip_address !== undefined ? {ip_address: args.ip_address} : {}),
			};
			const data = await apiPostJson(auth, `/v2/me/accounts/${args.account_id}/hsa-investments/account/submissions/`, body);
			return jsonResult(data);
		},
	);
}

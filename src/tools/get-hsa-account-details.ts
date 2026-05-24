import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerGetHsaAccountDetails(server: McpServer): void {
	server.registerTool(
		'get_hsa_account_details',
		{
			title: 'Get HSA account details',
			description: 'Fetch the user\'s Health Savings Account (HSA) details. US HSA only — likely empty or a 404 for non-US users, which is expected.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, '/v2/me/hsa-account-details/');
			return jsonResult(data);
		},
	);
}

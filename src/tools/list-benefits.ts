import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerListBenefits(server: McpServer): void {
	server.registerTool(
		'list_benefits',
		{
			title: 'List benefits',
			description: 'List the benefits available to the user (e.g. "Work from Home", "Health & Wellness", "Commuter"). Each benefit has an id (`benefit_xxx`) used by `submit_expense`. The accompanying `enrollment` shows the available balance.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, '/v2/me/benefits/');
			return jsonResult(data);
		},
	);
}

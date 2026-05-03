import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	benefit_id: z.string().min(1).describe('Benefit id (e.g. `benefit_xxx`) — see `list_benefits`.'),
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerGetSubstantiationRequirements(server: McpServer): void {
	server.registerTool(
		'get_substantiation_requirements',
		{
			title: 'Get substantiation requirements',
			description: `What \`substantiation_items\` are required (or accepted) when submitting an expense against a given benefit. Each policy in the response describes:

- \`item_type\` — \`note\`, \`receipt\`, etc.
- \`item_data_type\` — \`text\` for notes, \`file_upload\` for receipts.
- \`required\` — whether you must include this item type.
- \`user_description\` — instructions on what content qualifies.

Useful to call before \`submit_expense\` to confirm what \`substantiation_items\` to provide.`,
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, `/v2/me/benefits/${args.benefit_id}/substantiation-requirements/`);
			return jsonResult(data);
		},
	);
}

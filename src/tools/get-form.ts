import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		form_id: z.string().min(1).describe('The form id — see `list_forms`.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'form_id',
	},
);

export function registerGetForm(server: McpServer): void {
	server.registerTool(
		'get_form',
		{
			title: 'Get form',
			description: 'Fetch a single form by id, returning its full record including fields/questions.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, `/v2/me/forms/${args.form_id}/`);
			return jsonResult(data);
		},
	);
}

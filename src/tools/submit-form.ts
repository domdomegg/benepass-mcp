import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		form_id: z.string().min(1).describe('The form id to submit (e.g. `form_xxx`) — see `list_forms` / `get_form`.'),
		form_field_submissions: z.union([z.array(z.unknown()), z.record(z.unknown())]).describe('The form field submissions — shape depends on the form (see `get_form` for its fields). Passed through to the API.'),
		metadata: z.record(z.unknown()).optional().describe('Optional metadata object passed through with the submission.'),
		ip_address: z.string().min(1).optional().describe('Optional originating IP address. The server fills this in if omitted.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'form_id',
	},
);

export function registerSubmitForm(server: McpServer): void {
	server.registerTool(
		'submit_form',
		{
			title: 'Submit form',
			description: 'Submit a form — the equivalent of filling out and submitting a form in the Benepass app. Call `get_form` first to see the form\'s fields. POSTs `/v2/me/forms/{form_id}/submissions/` with `{metadata, ip_address, form_field_submissions}`.',
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
			const data = await apiPostJson(auth, `/v2/me/forms/${args.form_id}/submissions/`, body);
			return jsonResult(data);
		},
	);
}

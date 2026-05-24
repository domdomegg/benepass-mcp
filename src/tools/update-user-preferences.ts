import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPatchJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	overages_ach_debit_enabled: z.boolean().optional().describe('Whether to allow ACH debit for overages (charging an out-of-balance amount to a linked bank account).'),
	should_show_benefits_intro_banner: z.boolean().optional().describe('Whether the benefits intro banner should be shown in the app.'),
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerUpdateUserPreferences(server: McpServer): void {
	server.registerTool(
		'update_user_preferences',
		{
			title: 'Update user preferences',
			description: 'Update the current user\'s preferences — the equivalent of toggling settings in the Benepass app. PATCHes `/v2/me/` with only the keys you provide. Pass at least one preference.',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			if (args.overages_ach_debit_enabled === undefined && args.should_show_benefits_intro_banner === undefined) {
				throw new Error('Pass at least one preference to update (`overages_ach_debit_enabled` and/or `should_show_benefits_intro_banner`).');
			}

			const auth = await resolveAuth(args);
			const body: Record<string, unknown> = {
				...(args.overages_ach_debit_enabled !== undefined ? {overages_ach_debit_enabled: args.overages_ach_debit_enabled} : {}),
				...(args.should_show_benefits_intro_banner !== undefined ? {should_show_benefits_intro_banner: args.should_show_benefits_intro_banner} : {}),
			};
			const data = await apiPatchJson(auth, '/v2/me/', body);
			return jsonResult(data);
		},
	);
}

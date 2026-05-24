import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		onboarding_id: z.string().min(1).describe('The onboarding id — see `list_onboardings`.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'onboarding_id',
	},
);

export function registerGetOnboarding(server: McpServer): void {
	server.registerTool(
		'get_onboarding',
		{
			title: 'Get onboarding',
			description: 'Fetch a single onboarding flow by id, returning its full record including steps and completion status.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, `/v2/me/onboardings/${args.onboarding_id}/`);
			return jsonResult(data);
		},
	);
}

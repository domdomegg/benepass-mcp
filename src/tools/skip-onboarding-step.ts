import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		onboarding_slug: z.string().min(1).describe('The onboarding slug — see `list_onboardings` / `get_onboarding`.'),
		step: z.string().min(1).describe('The step identifier within the onboarding to skip.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		slug: 'onboarding_slug',
	},
);

export function registerSkipOnboardingStep(server: McpServer): void {
	server.registerTool(
		'skip_onboarding_step',
		{
			title: 'Skip onboarding step',
			description: 'Skip a step in an onboarding flow — the equivalent of clicking "Skip" on an onboarding step in the Benepass app. POSTs `/v2/me/onboardings/{onboarding_slug}/steps/{step}/skip/` (no body).',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiPostJson(auth, `/v2/me/onboardings/${args.onboarding_slug}/steps/${args.step}/skip/`, {});
			return jsonResult(data);
		},
	);
}

import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		onboarding_slug: z.string().min(1).describe('The onboarding slug — see `list_onboardings` / `get_onboarding`.'),
		step: z.string().min(1).describe('The step identifier within the onboarding to submit.'),
		body: z.record(z.unknown()).optional().describe('Optional step submission body, passed through to the API. Shape depends on the step.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		slug: 'onboarding_slug',
	},
);

export function registerSubmitOnboardingStep(server: McpServer): void {
	server.registerTool(
		'submit_onboarding_step',
		{
			title: 'Submit onboarding step',
			description: 'Submit (complete) a step in an onboarding flow — the equivalent of advancing through onboarding in the Benepass app. POSTs `/v2/me/onboardings/{onboarding_slug}/steps/{step}/submit/`. An optional `body` is passed through if the step needs data.',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiPostJson(auth, `/v2/me/onboardings/${args.onboarding_slug}/steps/${args.step}/submit/`, args.body ?? {});
			return jsonResult(data);
		},
	);
}

import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
	account_id: z.string().min(1).describe('Account id (e.g. `account_xxx`) — see `list_benefits` (returned as `account_id` per benefit) or `list_accounts`.'),
	until: z.string().optional().describe('ISO date (YYYY-MM-DD) to return events up to. Defaults to ~3 years from today, which covers the standard contribution cycles.'),
});

type Event = {
	id?: string;
	object?: string;
	action_type?: string;
	event_type?: string;
	amount?: number | null;
	formatted_amount?: string | null;
	execution_time?: string;
	reference_time?: string;
};
type EventList = {data?: Event[]; results?: Event[]};
type RolloverInfo = {max_rollover_amount?: number | null; max_rollover_amount_formatted?: string | null};

function defaultUntil(): string {
	const d = new Date();
	d.setFullYear(d.getFullYear() + 3);
	return d.toISOString().slice(0, 10);
}

export function registerGetBenefitSchedule(server: McpServer): void {
	server.registerTool(
		'get_benefit_schedule',
		{
			title: 'Get benefit schedule',
			description: `Fetch the upcoming schedule for a benefit account: future contributions (top-ups), expirations (use-it-or-lose-it deadlines), and rollover policy.

Critical for benefit-stretch decisions:
- Annual benefits typically have a \`perk_expiration\` event at year-end (action_type) followed by a \`perk_contribution\` shortly after — these expire on the deadline.
- Initial / one-time benefits have no scheduled events — they just sit until spent (or until you leave the company).
- \`max_rollover_amount: null\` means nothing carries over past the expiration; everything is forfeited.

Use this before \`submit_expense\` to prefer benefits with the soonest expiry, since they'll be lost if not spent.`,
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const until = args.until ?? defaultUntil();

			const [events, rollover] = await Promise.all([
				apiGet(auth, `/v2/me/accounts/${args.account_id}/next-events/`, {until}) as Promise<EventList>,
				apiGet(auth, `/v2/me/accounts/${args.account_id}/schedules/max-rollover-amount/`) as Promise<RolloverInfo>,
			]);

			const items = events.data ?? events.results ?? [];
			const nextExpiration = items.find((e) => e.action_type === 'perk_expiration') ?? null;
			const nextContribution = items.find((e) => e.action_type === 'perk_contribution') ?? null;

			return jsonResult({
				account_id: args.account_id,
				until,
				next_expiration: nextExpiration,
				next_contribution: nextContribution,
				max_rollover_amount: rollover.max_rollover_amount ?? null,
				max_rollover_amount_formatted: rollover.max_rollover_amount_formatted ?? null,
				expires_at_period_end: rollover.max_rollover_amount === null && nextExpiration !== null,
				events: items,
			});
		},
	);
}

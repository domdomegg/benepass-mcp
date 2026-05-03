import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

type Balance = {key?: string; amount?: number; formatted_local_amount?: string};
type Account = {
	id: string;
	key?: string;
	enrollment?: {
		benefit?: {id?: string; name?: string; benefit_type?: string};
		max_expense_amount?: number;
		local_max_expense_amount?: number;
	};
	balances?: Balance[];
};
type AccountList = {data?: Account[]; results?: Account[]};

function findAvailableBalance(balances: Balance[] | undefined): Balance | undefined {
	if (!balances) {
		return undefined;
	}

	// Pick the bare /available balance (Benepass also has reimbursement/available, payout/available, etc.)
	return balances.find((b) => b.key?.endsWith('/available'));
}

export function registerListBenefits(server: McpServer): void {
	server.registerTool(
		'list_benefits',
		{
			title: 'List benefits',
			description: 'List the benefits the user is enrolled in (e.g. "Work from Home", "Wellness", "Commuter") with their `benefit_xxx` ids, names, available balances, and per-expense caps. Pass a `benefit_id` to `submit_expense` and `get_substantiation_requirements`.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);

			// Benepass has no /v2/me/benefits/ list endpoint. Benefit metadata lives
			// inside each /v2/me/accounts/ entry's `enrollment.benefit` field.
			const accountList = await apiGet(auth, '/v2/me/accounts/') as AccountList;
			const accounts = accountList.data ?? accountList.results ?? [];

			const benefits = accounts
				.filter((a) => a.enrollment?.benefit?.id)
				.map((a) => {
					const benefit = a.enrollment!.benefit!;
					const available = findAvailableBalance(a.balances);
					return {
						id: benefit.id!,
						name: benefit.name ?? null,
						benefit_type: benefit.benefit_type ?? null,
						account_id: a.id,
						available_balance: available?.amount ?? null,
						formatted_available_balance: available?.formatted_local_amount ?? null,
						max_per_expense: a.enrollment?.local_max_expense_amount ?? a.enrollment?.max_expense_amount ?? null,
					};
				});

			return jsonResult({data: benefits});
		},
	);
}

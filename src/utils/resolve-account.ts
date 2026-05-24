import {apiGet, type ApiCallArgs} from './benepass-api.js';

// The accounts list shape from GET /v2/me/accounts/.
type Account = {id: string; enrollment?: {benefit?: {id?: string; name?: string}}};
type AccountList = {data?: Account[]; results?: Account[]};

/**
 * Resolve a target benefit account id from either an explicit `account_id`
 * (returned as-is) or a `benefit_id` (looked up against `GET /v2/me/accounts/`,
 * matching `a.enrollment.benefit.id === benefit_id` → `a.id`).
 *
 * Mirrors how submit_expense lets the caller name a benefit; tools that hit
 * `/v2/me/accounts/{account_id}/...` need the account id, so this bridges the gap.
 */
export async function resolveAccountId(
	auth: ApiCallArgs,
	args: {account_id?: string | undefined; benefit_id?: string | undefined},
): Promise<string> {
	if (args.account_id) {
		return args.account_id;
	}

	if (!args.benefit_id) {
		throw new Error('Pass either `account_id` or `benefit_id`.');
	}

	const list = await apiGet(auth, '/v2/me/accounts/') as AccountList;
	const accounts = list.data ?? list.results ?? [];
	const match = accounts.find((a) => a.enrollment?.benefit?.id === args.benefit_id);
	if (!match) {
		const names = accounts
			.map((a) => `${a.enrollment?.benefit?.id ?? '?'}${a.enrollment?.benefit?.name ? ` (${a.enrollment.benefit.name})` : ''}`)
			.join(', ');
		throw new Error(`No account found for benefit_id "${args.benefit_id}". Available benefits: ${names || 'none'}. See list_accounts / list_benefits.`);
	}

	return match.id;
}

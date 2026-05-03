import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

type Account = {id: string; key?: string};
type AccountList = {data?: Account[]; results?: Account[]};
type SubstantiationPolicy = {policy_group?: {name?: string}};
type SubstantiationList = {data?: SubstantiationPolicy[]; results?: SubstantiationPolicy[]};

function extractBenefitId(accountKey: string | undefined): string | undefined {
	if (!accountKey) {
		return undefined;
	}

	for (const part of accountKey.split('/')) {
		if (part.startsWith('benefit_')) {
			return part;
		}
	}

	return undefined;
}

/** Best-effort extraction of a friendly benefit name from a substantiation_policy_group name like
 *  "Anthropic > Work from Home - Annual > note: user". */
function extractBenefitName(policyGroupName: string | undefined): string | undefined {
	if (!policyGroupName) {
		return undefined;
	}

	const parts = policyGroupName.split('>').map((s) => s.trim());
	// Drop leading employer prefix and trailing "<item_type>: <policy_type>" suffix
	if (parts.length >= 3) {
		return parts.slice(1, -1).join(' > ');
	}

	return policyGroupName;
}

export function registerListBenefits(server: McpServer): void {
	server.registerTool(
		'list_benefits',
		{
			title: 'List benefits',
			description: 'List the benefits the user is enrolled in (e.g. "Work from Home", "Health & Wellness", "Commuter") with their `benefit_xxx` ids and best-effort friendly names. Each benefit id can be passed to `submit_expense` and `get_substantiation_requirements`.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);

			// Benepass has no /v2/me/benefits/ list endpoint. Instead we derive benefits
			// from /v2/me/accounts/ — each account's `key` is `emp_xxx/benefit_xxx` —
			// then resolve names from /v2/me/benefits/{id}/substantiation-requirements/
			// (the only endpoint that returns benefit-scoped name metadata).
			const accountList = await apiGet(auth, '/v2/me/accounts/') as AccountList;
			const accounts = accountList.data ?? accountList.results ?? [];

			const benefitIds = [...new Set(accounts.map((a) => extractBenefitId(a.key)).filter((id): id is string => Boolean(id)))];

			const lookup = async (id: string): Promise<{id: string; name: string | null}> => {
				try {
					const reqs = await apiGet(auth, `/v2/me/benefits/${id}/substantiation-requirements/`) as SubstantiationList;
					const policies = reqs.data ?? reqs.results ?? [];
					const name = extractBenefitName(policies[0]?.policy_group?.name);
					return {id, name: name ?? null};
				} catch {
					return {id, name: null};
				}
			};

			const benefits = await Promise.all(benefitIds.map(lookup));

			return jsonResult({data: benefits});
		},
	);
}

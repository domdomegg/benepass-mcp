import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiCall} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET').describe('HTTP method (default: GET).'),
		endpoint: z.string().min(1).describe('API path, e.g. "/v2/me/cards/" or "/v2/me/transactions/txn_xxx/". Should start with "/v2/".'),
		params: z.record(z.union([z.string(), z.number()])).optional().describe('Query parameters.'),
		json_body: z.record(z.unknown()).optional().describe('JSON request body for non-GET methods.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		path: 'endpoint',
		url: 'endpoint',
		body: 'json_body',
	},
);

export function registerCallApi(server: McpServer): void {
	server.registerTool(
		'call_api',
		{
			title: 'Call API',
			description: `Escape hatch for calling any Benepass API endpoint directly (auth added automatically). Useful for endpoints not wrapped by a dedicated tool.

Known read-only \`/v2/me/*\` endpoints include:

- GET /v2/me/cards/ — the user's benefit/spending cards
- GET /v2/me/cards/{card_id}/ — card detail
- GET /v2/me/cards/available/ — cards available to issue
- GET /v2/me/bank-accounts/ — linked payout bank accounts
- GET /v2/me/documents/ — documents
- GET /v2/me/documents/{document_id}/ — document detail
- GET /v2/me/tasks/ — action-required items (e.g. receipt needed)
- GET /v2/me/employment/ — the user's employment record
- GET /v2/me/currencies/convert/ — currency conversion
- GET /v2/me/merchants/ , GET /v2/me/merchants/{merchant_id}/ — merchants
- GET /v2/me/forms/ , GET /v2/me/forms/{form_id}/ — forms
- GET /v2/me/identities/ — identities
- GET /v2/me/onboardings/ , GET /v2/me/onboardings/{onboarding_id}/ — onboardings
- GET /v2/me/hsa-account-details/ — US HSA account details

Known write \`/v2/me/*\` endpoints include:

- POST /v2/me/expenses/ — submit an expense ; DELETE /v2/me/expenses/{expense_id}/ — withdraw an expense
- PATCH /v2/me/claims/{claim_id}/ — update an expense's substantiation
- PATCH /v2/me/transactions/{transaction_id}/ — reclassify a transaction to a different benefit account ({account})
- POST /v2/me/cards/ — order a card ; PATCH /v2/me/cards/{card_id}/ — set card status ({status}) ; POST /v2/me/cards/{card_id}/reset-pin/ — reset PIN
- POST /v2/me/documents/{document_id}/download/ — request a document download
- POST /v2/me/forms/{form_id}/submissions/ — submit a form
- POST /v2/me/accounts/{account_id}/payouts/ — request a benefit account payout
- PATCH /v2/me/ — update user preferences
- POST /v2/me/hsa-transfer-form/ — request an HSA transfer form (US HSA)
- POST /v2/me/onboardings/{slug}/steps/{step}/submit/ , .../skip/ — submit or skip an onboarding step
- POST/DELETE /v2/me/accounts/{account_id}/hsa-investments/asset-links/[{link_id}/] — add/remove an HSA investment asset link (US HSA)
- POST /v2/me/accounts/{account_id}/hsa-investments/deposits/ , .../withdrawals/ — HSA investment deposit/withdrawal (US HSA)
- PATCH /v2/me/accounts/{account_id}/hsa-investments/portfolio/allocation/ — update HSA investment allocation (US HSA)
- POST /v2/me/accounts/{account_id}/hsa-investments/account/submissions/ — submit HSA investment account application (US HSA)

Dedicated tools exist for all of the above, plus accounts, benefits, currencies, transactions, expenses, cards, documents, forms, payouts, onboardings, workspaces, and substantiation — prefer those when available.`,
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiCall(auth, args.method, args.endpoint, args.params, args.json_body);
			return jsonResult(data);
		},
	);
}

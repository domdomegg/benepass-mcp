import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet, apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
	benefit_id: z.string().min(1).describe('Benefit id to submit against (e.g. `benefit_xxx`) — see `list_benefits`.'),
	merchant_name: z.string().min(1).describe('Name of the merchant (e.g. "ALDI", "Amazon").'),
	currency: z.string().min(1).describe('Currency — either an ISO code (e.g. "GBP", "USD") or a Benepass currency id (`crcy_xxx`).'),
	amount: z.number().positive().max(100_000).describe('Amount as a positive decimal in the merchant currency (e.g. 25.99 for £25.99). Capped at 100,000 as a typo guard. The MCP converts to negative cents internally.'),
	note: z.string().min(1).optional().describe('Short description of the purchase. Required by some benefits — see `get_substantiation_requirements`.'),
	receipt_urls: z.array(z.string().min(1)).optional().describe('Receipt presigned URLs from `upload_receipt`. Required for most benefits.'),
});

type Currency = {id: string; iso_code?: string; code?: string};
// Benepass uses two response shapes — Stripe-style ({data}) on some endpoints, DRF-style ({results}) on others
type CurrencyList = {data?: Currency[]; results?: Currency[]};

async function resolveCurrencyId(
	auth: {refreshToken: string; workspaceId?: string | undefined},
	currency: string,
): Promise<string> {
	if (currency.startsWith('crcy_')) {
		return currency;
	}

	// Benepass paginates currencies 20-at-a-time by default; bumping page_size returns all
	// 150 in one shot. The friendly ISO letter code is `code` (e.g. "USD"); `iso_code` is
	// the numeric form (e.g. "840") which agents won't know.
	const list = await apiGet(auth, '/v2/me/currencies/', {page_size: 200}) as CurrencyList;
	const wanted = currency.toUpperCase();
	for (const c of list.data ?? list.results ?? []) {
		if (c.code?.toUpperCase() === wanted || c.iso_code?.toUpperCase() === wanted) {
			return c.id;
		}
	}

	throw new Error(`Unknown currency "${currency}". Call list_currencies to see available codes.`);
}

export function registerSubmitExpense(server: McpServer): void {
	server.registerTool(
		'submit_expense',
		{
			title: 'Submit expense',
			description: `Submit an out-of-pocket expense for reimbursement against a benefit. This is the equivalent of clicking "Submit Expense" in the Benepass app.

Workflow:
1. Call \`list_benefits\` to find the right \`benefit_id\` and confirm there's available balance.
2. (Optional) Call \`get_substantiation_requirements\` for that benefit to see whether a receipt and/or note are required.
3. (If receipt required) Call \`upload_receipt\` for each receipt file and collect the returned \`presigned_url\` values.
4. Call this tool with the benefit_id, merchant info, amount, and \`receipt_urls\`.

Returns the created expense object with \`state: "pending"\` and a populated claim. Real-world commitment: this creates a real reimbursement claim — the user (a human) approves submissions in the Benepass app for high-value items.`,
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const currencyId = await resolveCurrencyId(auth, args.currency);

			const substantiationItems: Record<string, unknown>[] = [];
			if (args.note) {
				substantiationItems.push({item_type: 'note', item_detail: {value: args.note}});
			}

			if (args.receipt_urls && args.receipt_urls.length > 0) {
				substantiationItems.push({item_type: 'receipt', item_detail: {value: args.receipt_urls}});
			}

			const body = {
				benefit: args.benefit_id,
				merchant_name: args.merchant_name,
				merchant_currency: currencyId,
				// Benepass uses negative cents for debits (out-of-pocket spend)
				merchant_amount: -Math.round(args.amount * 100),
				claim: {substantiation_items: substantiationItems},
			};

			const data = await apiPostJson(auth, '/v2/me/expenses/', body);
			return jsonResult(data);
		},
	);
}

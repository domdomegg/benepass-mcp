import {describe, expect, it} from 'vitest';
import {createServer} from '../index.js';

describe('createServer', () => {
	it('registers all expected tools', async () => {
		const server = createServer();

		const internal = (server as unknown as {server: {_requestHandlers: Map<string, unknown>}}).server;
		expect(internal._requestHandlers.has('tools/list')).toBe(true);
		expect(internal._requestHandlers.has('tools/call')).toBe(true);

		const tools = (server as unknown as {_registeredTools: Record<string, unknown>})._registeredTools;
		expect(Object.keys(tools).sort()).toEqual([
			'add_hsa_investment_asset_link',
			'call_api',
			'complete_login',
			'convert_currency',
			'delete_expense',
			'download_document',
			'get_benefit_schedule',
			'get_card',
			'get_current_user',
			'get_document',
			'get_employment',
			'get_expense',
			'get_form',
			'get_hsa_account_details',
			'get_merchant',
			'get_onboarding',
			'get_substantiation_requirements',
			'list_accounts',
			'list_available_cards',
			'list_bank_accounts',
			'list_benefits',
			'list_cards',
			'list_currencies',
			'list_documents',
			'list_forms',
			'list_identities',
			'list_merchants',
			'list_onboardings',
			'list_tasks',
			'list_transactions',
			'list_workspaces',
			'make_hsa_investment_deposit',
			'make_hsa_investment_withdrawal',
			'order_card',
			'reclassify_transaction',
			'remove_hsa_investment_asset_link',
			'request_account_payout',
			'request_hsa_transfer_form',
			'reset_card_pin',
			'set_card_status',
			'skip_onboarding_step',
			'start_login',
			'submit_expense',
			'submit_form',
			'submit_hsa_investment_account',
			'submit_onboarding_step',
			'update_expense',
			'update_hsa_investment_allocation',
			'update_user_preferences',
			'upload_receipt',
		]);
	});
});

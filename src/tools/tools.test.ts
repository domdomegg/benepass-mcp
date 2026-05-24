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
			'call_api',
			'complete_login',
			'convert_currency',
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
			'start_login',
			'submit_expense',
			'update_expense',
			'upload_receipt',
		]);
	});
});

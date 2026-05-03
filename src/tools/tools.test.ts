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
			'complete_login',
			'get_benefit_schedule',
			'get_current_user',
			'get_expense',
			'get_substantiation_requirements',
			'list_accounts',
			'list_benefits',
			'list_currencies',
			'list_transactions',
			'list_workspaces',
			'start_login',
			'submit_expense',
			'upload_receipt',
		]);
	});
});

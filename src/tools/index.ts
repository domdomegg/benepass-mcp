import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerStartLogin} from './start-login.js';
import {registerCompleteLogin} from './complete-login.js';
import {registerListWorkspaces} from './list-workspaces.js';
import {registerListAccounts} from './list-accounts.js';
import {registerListBenefits} from './list-benefits.js';
import {registerListCurrencies} from './list-currencies.js';
import {registerListTransactions} from './list-transactions.js';
import {registerGetExpense} from './get-expense.js';
import {registerGetSubstantiationRequirements} from './get-substantiation-requirements.js';
import {registerUploadReceipt} from './upload-receipt.js';
import {registerSubmitExpense} from './submit-expense.js';

export function registerAll(server: McpServer): void {
	registerStartLogin(server);
	registerCompleteLogin(server);
	registerListWorkspaces(server);
	registerListAccounts(server);
	registerListBenefits(server);
	registerListCurrencies(server);
	registerListTransactions(server);
	registerGetExpense(server);
	registerGetSubstantiationRequirements(server);
	registerUploadReceipt(server);
	registerSubmitExpense(server);
}

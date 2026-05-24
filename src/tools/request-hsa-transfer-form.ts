import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
});

export function registerRequestHsaTransferForm(server: McpServer): void {
	server.registerTool(
		'request_hsa_transfer_form',
		{
			title: 'Request HSA transfer form',
			description: 'Request an HSA transfer form — used to transfer funds from another HSA provider into the Benepass HSA. US HSA only. POSTs `/v2/me/hsa-transfer-form/` (no body).',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiPostJson(auth, '/v2/me/hsa-transfer-form/', {});
			return jsonResult(data);
		},
	);
}

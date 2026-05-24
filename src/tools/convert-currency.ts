import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
	params: z.record(z.union([z.string(), z.number()])).optional().describe('Query parameters passed through to the conversion endpoint (e.g. `amount`, `from`, `to`). Exact parameter names are determined by the Benepass API.'),
});

export function registerConvertCurrency(server: McpServer): void {
	server.registerTool(
		'convert_currency',
		{
			title: 'Convert currency',
			description: 'Convert an amount between currencies using Benepass\'s conversion endpoint. Pass query parameters (such as `amount`, `from`, `to`) via `params`; they are forwarded as-is to `/v2/me/currencies/convert/`.',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, '/v2/me/currencies/convert/', args.params);
			return jsonResult(data);
		},
	);
}

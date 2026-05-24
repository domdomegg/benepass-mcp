import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiGet} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		document_id: z.string().min(1).describe('The document id — see `list_documents`.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'document_id',
	},
);

export function registerGetDocument(server: McpServer): void {
	server.registerTool(
		'get_document',
		{
			title: 'Get document',
			description: 'Fetch a single document by id, returning its full record (including any download link).',
			inputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiGet(auth, `/v2/me/documents/${args.document_id}/`);
			return jsonResult(data);
		},
	);
}

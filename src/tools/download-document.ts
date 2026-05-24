import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostJson} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const inputSchema = strictSchemaWithAliases(
	{
		document_id: z.string().min(1).describe('The document id to download (e.g. `document_xxx`) — see `list_documents`.'),
		refresh_token: refreshTokenSchema,
		workspace_id: workspaceIdSchema,
	},
	{
		id: 'document_id',
	},
);

export function registerDownloadDocument(server: McpServer): void {
	server.registerTool(
		'download_document',
		{
			title: 'Download document',
			description: 'Request a download for a document — the equivalent of clicking "Download" on a document in the Benepass app. POSTs `/v2/me/documents/{document_id}/download/` (no body) and returns the response (typically a download link / URL).',
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const auth = await resolveAuth(args);
			const data = await apiPostJson(auth, `/v2/me/documents/${args.document_id}/download/`, {});
			return jsonResult(data);
		},
	);
}

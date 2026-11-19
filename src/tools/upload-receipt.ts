import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';
import {apiPostMultipart} from '../utils/benepass-api.js';
import {refreshTokenSchema, workspaceIdSchema, resolveAuth} from '../utils/auth-args.js';

const MAX_BYTES = 10 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	pdf: 'application/pdf',
	heic: 'image/heic',
	webp: 'image/webp',
};

const inputSchema = strictSchemaWithAliases({
	refresh_token: refreshTokenSchema,
	workspace_id: workspaceIdSchema,
	file_content_base64: z.string().min(1).describe('Receipt file as base64-encoded bytes.'),
	filename: z.string().min(1).describe('Filename including extension (e.g. "receipt.jpeg").'),
	mime_type: z.string().min(1).optional().describe('MIME type (e.g. image/jpeg, application/pdf). Auto-detected from the filename extension if omitted; falls back to application/octet-stream.'),
});

function inferMime(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase() ?? '';
	return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export function registerUploadReceipt(server: McpServer): void {
	server.registerTool(
		'upload_receipt',
		{
			title: 'Upload receipt',
			description: `Upload a receipt file to Benepass and get back a presigned URL that can be referenced from \`submit_expense\` as a \`receipt\` substantiation item.

Common formats: JPG, PNG, PDF (also HEIC, WebP). Max ${MAX_BYTES / 1024 / 1024} MB.

Returns the full \`file_upload\` object including \`presigned_url\` — pass that URL string into the \`receipt_urls\` array of \`submit_expense\`.

Note: the presigned URL is short-lived (expires in ~5 minutes), so call \`submit_expense\` promptly after uploading.`,
			inputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const bytes = Buffer.from(args.file_content_base64, 'base64');
			const {filename} = args;

			if (bytes.length > MAX_BYTES) {
				throw new Error(`Receipt is ${(bytes.length / 1024 / 1024).toFixed(1)} MB, which exceeds Benepass's 10 MB limit.`);
			}

			const mimeType = args.mime_type ?? inferMime(filename);
			const auth = await resolveAuth(args);

			const formData = new FormData();
			formData.append('file', new Blob([bytes], {type: mimeType}), filename);

			const data = await apiPostMultipart(auth, '/v2/me/claims/uploads/', formData);
			return jsonResult(data);
		},
	);
}

import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {readFile} from 'node:fs/promises';
import {basename} from 'node:path';
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
	file_path: z.string().min(1).optional().describe('Absolute path to a receipt file on disk. Either this or file_content_base64 is required.'),
	file_content_base64: z.string().min(1).optional().describe('Receipt file as base64-encoded bytes. Use when the file isn\'t on the local filesystem. Requires `filename`.'),
	filename: z.string().min(1).optional().describe('Filename including extension (e.g. "receipt.jpeg"). Required when using file_content_base64; defaults to the basename of file_path otherwise.'),
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
			if (args.file_path && args.file_content_base64) {
				throw new Error('Pass `file_path` OR `file_content_base64`, not both.');
			}

			if (!args.file_path && !args.file_content_base64) {
				throw new Error('Either `file_path` or `file_content_base64` must be provided.');
			}

			let bytes: Buffer;
			let filename: string;

			if (args.file_path) {
				bytes = await readFile(args.file_path);
				filename = args.filename ?? basename(args.file_path);
			} else {
				if (!args.filename) {
					throw new Error('`filename` is required when uploading via `file_content_base64`.');
				}

				bytes = Buffer.from(args.file_content_base64, 'base64');
				filename = args.filename;
			}

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

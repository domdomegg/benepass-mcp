import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';

/**
 * Build a CallToolResult from a JSON-serializable value.
 *
 * `content` is the legacy text channel (read by older MCP clients); `structuredContent`
 * is the typed channel (read by newer clients). We make them carry the same logical
 * data so clients that read either get equivalent results.
 *
 * MCP requires structuredContent to be an object. If the data is an array (or a
 * primitive), we wrap it as `{result: data}`.
 */
export function jsonResult<T>(data: T): CallToolResult {
	const wrapped: Record<string, unknown> = (data && typeof data === 'object' && !Array.isArray(data))
		? data as Record<string, unknown>
		: {result: data};

	return {
		content: [{type: 'text', text: JSON.stringify(wrapped)}],
		structuredContent: wrapped,
	};
}

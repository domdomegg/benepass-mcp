import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerAll} from './tools/index.js';

export function createServer(): McpServer {
	const server = new McpServer({
		name: 'benepass-mcp',
		version: '0.0.0',
	});

	registerAll(server);

	return server;
}

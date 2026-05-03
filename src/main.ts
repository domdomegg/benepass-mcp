#!/usr/bin/env node
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import express, {type Request, type Response} from 'express';
import {createServer} from './index.js';

function setupSignalHandlers(cleanup: () => Promise<void>): void {
	process.on('SIGINT', async () => {
		await cleanup();
		process.exit(0);
	});
	process.on('SIGTERM', async () => {
		await cleanup();
		process.exit(0);
	});
}

const transport = process.env.MCP_TRANSPORT || 'stdio';

(async () => {
	if (transport === 'stdio') {
		const server = createServer();
		setupSignalHandlers(async () => server.close());

		const stdioTransport = new StdioServerTransport();
		await server.connect(stdioTransport);
		console.error('benepass-mcp running on stdio');
	} else if (transport === 'http') {
		const app = express();
		app.use(express.json({limit: '20mb'}));

		const port = parseInt(process.env.PORT || '3000', 10);

		app.post('/mcp', async (req: Request, res: Response) => {
			const server = createServer();

			try {
				// Stateless mode: omit sessionIdGenerator. The SDK's strict types accept
				// it as a function but the runtime treats absence as stateless. Cast both
				// the options and the transport to satisfy `exactOptionalPropertyTypes`.
				const httpTransport = new StreamableHTTPServerTransport({
					enableJsonResponse: true,
				} as ConstructorParameters<typeof StreamableHTTPServerTransport>[0]);
				await server.connect(httpTransport as Transport);

				await httpTransport.handleRequest(req, res, req.body);

				res.on('close', () => {
					void httpTransport.close();
					void server.close();
				});
			} catch (error) {
				console.error('Error handling MCP request:', error);
				if (!res.headersSent) {
					res.status(500).json({
						jsonrpc: '2.0',
						error: {code: -32603, message: 'Internal server error'},
						id: null,
					});
				}
			}
		});

		const httpServer = app.listen(port, () => {
			console.error(`benepass-mcp running on http://localhost:${port}/mcp`);
		});

		httpServer.on('error', (err: NodeJS.ErrnoException) => {
			console.error('FATAL: Server error', err.message);
			process.exit(1);
		});

		setupSignalHandlers(async () => {
			httpServer.close();
		});
	} else {
		console.error(`Unknown transport: ${transport}. Use MCP_TRANSPORT=stdio or MCP_TRANSPORT=http`);
		process.exit(1);
	}
})();

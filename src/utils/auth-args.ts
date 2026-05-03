import {z} from 'zod';
import {apiGet, type ApiCallArgs} from './benepass-api.js';

export const refreshTokenSchema = z.string().min(1).describe('Benepass refresh token from `complete_login`.');
export const workspaceIdSchema = z.string().min(1).optional().describe('Workspace id (e.g. `workspace_xxx`) — see `list_workspaces`. If omitted, the MCP auto-picks the first employment-type workspace.');

export async function resolveAuth(
	args: {refresh_token: string; workspace_id?: string | undefined},
	options: {requireWorkspace?: boolean} = {},
): Promise<ApiCallArgs> {
	const refreshToken = args.refresh_token;
	let workspaceId = args.workspace_id;

	if (!workspaceId && options.requireWorkspace !== false) {
		// Auto-discover the user's first employment-type workspace. We don't cache
		// this — agents should pass workspace_id after the first list_workspaces
		// call. The extra /v2/me/workspaces/ hit per call is small.
		const workspaces = await apiGet({refreshToken}, '/v2/me/workspaces/') as {data?: {id: string; type: string}[]};
		const employment = workspaces.data?.find((w) => w.type === 'employment');
		if (!employment) {
			throw new Error('No employment-type workspace found for this user. Call list_workspaces to see available workspaces, then pass `workspace_id` explicitly.');
		}

		workspaceId = employment.id;
	}

	return {refreshToken, workspaceId};
}

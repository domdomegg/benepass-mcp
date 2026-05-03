import {API_BASE_URL} from './constants.js';
import {exchangeRefreshToken} from './cognito.js';

const USER_AGENT = 'benepass-mcp (https://github.com/domdomegg/benepass-mcp)';

/**
 * In-process LRU cache: refresh_token → {accessToken, expiresAt}.
 *
 * Without this, every tool call would do a ~150ms refresh→access exchange. A
 * single conversation with 5 tool calls saves ~600ms total.
 *
 * Bounds:
 * - Hard cap of 500 entries (~3.3 KB per entry → ~1.65 MB worst case). Plenty
 *   of headroom for any realistic use — even a multi-tenant deployment would
 *   need 500 distinct active users at once to hit this.
 * - On cache miss, we sweep all expired entries before inserting. Cheap because
 *   we're already paying for a network call on the same path.
 * - On cache hit, we re-insert to bump LRU position (Map preserves insertion
 *   order, so the oldest key is always the LRU eviction candidate).
 * - 60s safety margin so we don't hand out a token that expires mid-request.
 */
const accessTokenCache = new Map<string, {accessToken: string; expiresAt: number}>();
const SAFETY_MARGIN_MS = 60_000;
const MAX_CACHE_ENTRIES = 500;

function sweepAndCap(): void {
	const now = Date.now();
	for (const [key, val] of accessTokenCache) {
		if (val.expiresAt - now <= SAFETY_MARGIN_MS) {
			accessTokenCache.delete(key);
		}
	}

	while (accessTokenCache.size >= MAX_CACHE_ENTRIES) {
		const oldest = accessTokenCache.keys().next().value;
		if (oldest === undefined) {
			break;
		}

		accessTokenCache.delete(oldest);
	}
}

async function getAccessToken(refreshToken: string): Promise<string> {
	const cached = accessTokenCache.get(refreshToken);
	if (cached && cached.expiresAt - Date.now() > SAFETY_MARGIN_MS) {
		// Re-insert to mark as most-recently-used
		accessTokenCache.delete(refreshToken);
		accessTokenCache.set(refreshToken, cached);
		return cached.accessToken;
	}

	const tokens = await exchangeRefreshToken(refreshToken);
	sweepAndCap();
	accessTokenCache.set(refreshToken, {
		accessToken: tokens.access_token,
		expiresAt: Date.now() + (tokens.expires_in * 1000),
	});
	return tokens.access_token;
}

async function handleApiError(response: Response): Promise<never> {
	const text = await response.text().catch(() => '');
	if (response.status === 401) {
		throw new Error('Benepass API auth failed (401). The access token was rejected — your refresh token may have been revoked. Try `start_login` again.');
	}

	if (response.status === 403 && text.includes('Workspace required')) {
		throw new Error('Benepass API requires a workspace_id (403 Workspace required). Pass `workspace_id` to this tool, or use `list_workspaces` to discover available workspaces.');
	}

	throw new Error(`Benepass API error: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 500)}` : ''}`);
}

function buildHeaders(
	accessToken: string,
	workspaceId: string | undefined,
	extra?: Record<string, string>,
): Record<string, string> {
	const headers: Record<string, string> = {
		Accept: 'application/json',
		'User-Agent': USER_AGENT,
		Authorization: `Bearer ${accessToken}`,
		'x-benepass-client': 'employee-web',
		'x-benepass-platform': 'web',
		...extra,
	};
	if (workspaceId) {
		headers['x-benepass-workspace-id'] = workspaceId;
	}

	return headers;
}

function buildUrl(endpoint: string, params?: Record<string, string | number | undefined | null>): URL {
	const url = new URL(endpoint, API_BASE_URL);
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== null && value !== '') {
				url.searchParams.set(key, String(value));
			}
		}
	}

	return url;
}

export type ApiCallArgs = {
	refreshToken: string;
	workspaceId?: string | undefined;
};

type RequestOptions = {
	method?: string;
	params?: Record<string, string | number | undefined | null>;
	json?: unknown;
	multipart?: FormData;
};

async function apiRequest(
	auth: ApiCallArgs,
	endpoint: string,
	options: RequestOptions = {},
): Promise<unknown> {
	const accessToken = await getAccessToken(auth.refreshToken);
	const url = buildUrl(endpoint, options.params);

	const init: RequestInit = {
		method: options.method ?? (options.json !== undefined || options.multipart !== undefined ? 'POST' : 'GET'),
		// fetch sets the multipart Content-Type (with boundary) automatically; only set it for JSON
		headers: buildHeaders(accessToken, auth.workspaceId, options.json !== undefined ? {'Content-Type': 'application/json'} : undefined),
	};
	if (options.json !== undefined) {
		init.body = JSON.stringify(options.json);
	} else if (options.multipart !== undefined) {
		init.body = options.multipart;
	}

	const response = await fetch(url.toString(), init);
	if (!response.ok) {
		await handleApiError(response);
	}

	const text = await response.text();
	return text ? JSON.parse(text) : null;
}

export async function apiGet(
	auth: ApiCallArgs,
	endpoint: string,
	params?: Record<string, string | number | undefined | null>,
): Promise<unknown> {
	return apiRequest(auth, endpoint, params ? {params} : {});
}

export async function apiPostJson(auth: ApiCallArgs, endpoint: string, body: unknown): Promise<unknown> {
	return apiRequest(auth, endpoint, {json: body});
}

export async function apiPostMultipart(auth: ApiCallArgs, endpoint: string, formData: FormData): Promise<unknown> {
	return apiRequest(auth, endpoint, {multipart: formData});
}

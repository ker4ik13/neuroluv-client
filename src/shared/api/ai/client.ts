import type { AiApiProblem } from './contracts';
import { getAiDeviceFingerprint } from './deviceFingerprint';
import { getAiRequestUrl } from './request-url';
import {
	AiRequestTimeoutError,
	allowsRequestRetry,
	executeAiRequest,
} from './requestTransport';

type AiFetchOptions = Omit<RequestInit, 'body'> & {
	body?: unknown;
	timeoutMs?: number | null;
	csrf?: boolean;
	responseType?: 'json' | 'blob';
	retry?: boolean;
};

type AiApiCacheEntry = {
	data: unknown;
	expiresAt: number;
};

let csrfToken: string | null = null;
let csrfExpiresAt = 0;
let csrfRequest: Promise<string> | null = null;
const CSRF_REQUEST_TIMEOUT_MS = 10_000;
const MAX_AI_API_CACHE_ENTRIES = 50;
const aiApiCache = new Map<string, AiApiCacheEntry>();
const aiApiRequests = new Map<string, Promise<unknown>>();

export class AiApiError extends Error {
	readonly problem: AiApiProblem;

	constructor(problem: AiApiProblem) {
		super(problem.detail || problem.title);
		this.name = 'AiApiError';
		this.problem = problem;
	}
}

export async function aiApiFetch<T>(
	path: string,
	options: AiFetchOptions = {},
): Promise<T> {
	const {
		body,
		timeoutMs = 15_000,
		csrf = true,
		responseType = 'json',
		retry = false,
		signal: externalSignal,
		...requestOptions
	} = options;
	const headers = new Headers(options.headers);
	const method = (options.method || 'GET').toUpperCase();

	if (!headers.has('x-request-id')) {
		headers.set('x-request-id', crypto.randomUUID());
	}

	if (isJsonBody(body) && !headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}

	try {
		if (!headers.has('x-neuroluv-device-id')) {
			const fingerprint = await getAiDeviceFingerprint();
			if (fingerprint) headers.set('x-neuroluv-device-id', fingerprint);
		}
		if (isMutatingMethod(method) && csrf && !headers.has('x-csrf-token')) {
			headers.set('x-csrf-token', await getCsrfToken());
		}

		const requestUrl = getAiRequestUrl(normalizePath(path));
		const requestBody = serializeBody(body, headers);
		return await executeAiRequest(
			async (requestSignal) => {
				let response = await fetch(requestUrl, {
					...requestOptions,
					body: requestBody,
					credentials: 'include',
					headers,
					signal: requestSignal,
				});

				if (
					isMutatingMethod(method) &&
					csrf &&
					(await isExpiredCsrfResponse(response))
				) {
					clearAiCsrfToken();
					headers.set('x-csrf-token', await getCsrfToken());
					response = await fetch(requestUrl, {
						...requestOptions,
						body: requestBody,
						credentials: 'include',
						headers,
						signal: requestSignal,
					});
				}

				if (!response.ok) {
					throw new AiApiError(await readProblem(response));
				}

				if (response.status === 204) {
					return undefined as T;
				}

				try {
					return (
						responseType === 'blob'
							? await response.blob()
							: await response.json()
					) as T;
				} catch (error) {
					if (!(error instanceof SyntaxError)) throw error;
					throw new AiApiError({
						title: 'Сервис вернул некорректный ответ',
						status: 502,
						code: 'invalid_response',
					});
				}
			},
			{
				timeoutMs,
				signal: externalSignal ?? undefined,
				retries:
					retry && allowsRequestRetry(normalizePath(path), method, body)
						? 1
						: 0,
				isRetryable: isTransientAiError,
			},
		);
	} catch (error) {
		if (error instanceof AiApiError) {
			throw error;
		}

		if (
			error instanceof AiRequestTimeoutError ||
			(error instanceof DOMException &&
				(error.name === 'AbortError' || error.name === 'TimeoutError'))
		) {
			throw new AiApiError({
				title: 'Сервер не ответил вовремя',
				status: 504,
				code: 'request_timeout',
			});
		}

		throw new AiApiError({
			title: 'Не удалось связаться с AI-сервисом',
			detail: error instanceof Error ? error.message : undefined,
			status: 503,
			code: 'service_unavailable',
		});
	}
}

function isTransientAiError(error: unknown): boolean {
	return (
		error instanceof TypeError ||
		error instanceof AiRequestTimeoutError ||
		(error instanceof AiApiError &&
			([502, 504].includes(error.problem.status) ||
				(error.problem.status === 503 && !error.problem.code) ||
				[
					'service_unavailable',
					'request_timeout',
					'invalid_response',
					'bad_gateway',
				].includes(error.problem.code || '')))
	);
}

export function readAiApiCache<T>(path: string): T | undefined {
	const cacheKey = normalizePath(path);
	const cached = aiApiCache.get(cacheKey);
	if (!cached) return undefined;
	if (cached.expiresAt <= Date.now()) {
		aiApiCache.delete(cacheKey);
		return undefined;
	}
	return cached.data as T;
}

export async function aiApiFetchCached<T>(
	path: string,
	ttlMs: number,
): Promise<T> {
	const normalizedTtl = Number.isFinite(ttlMs) ? Math.max(0, ttlMs) : 0;
	if (normalizedTtl === 0) return aiApiFetch<T>(path);

	const cacheKey = normalizePath(path);
	const cached = readAiApiCache<T>(cacheKey);
	if (cached !== undefined) return cached;

	const pending = aiApiRequests.get(cacheKey);
	if (pending) return pending as Promise<T>;

	const request = aiApiFetch<T>(cacheKey, { method: 'GET', csrf: false })
		.then((data) => {
			setAiApiCache(cacheKey, data, normalizedTtl);
			return data;
		})
		.finally(() => {
			aiApiRequests.delete(cacheKey);
		});
	aiApiRequests.set(cacheKey, request);
	return request;
}

export function invalidateAiApiCache(path?: string): void {
	if (path) {
		aiApiCache.delete(normalizePath(path));
		return;
	}
	aiApiCache.clear();
}

export function clearAiCsrfToken(): void {
	csrfToken = null;
	csrfExpiresAt = 0;
	aiApiCache.clear();
}

async function getCsrfToken(): Promise<string> {
	if (csrfToken && Date.now() < csrfExpiresAt - 30_000) {
		return csrfToken;
	}

	if (!csrfRequest) {
		csrfRequest = executeAiRequest(
			async (signal) => {
				const response = await fetch(getAiRequestUrl('/auth/csrf'), {
					credentials: 'include',
					headers: { accept: 'application/json' },
					signal,
				});
				if (!response.ok) {
					throw new AiApiError(await readProblem(response));
				}

				const payload = (await response.json()) as {
					csrfToken?: string;
					token?: string;
					expiresInSeconds?: number;
				};
				const token = payload.csrfToken || payload.token;

				if (!token) {
					throw new AiApiError({
						title: 'Сервер не вернул защитный токен',
						status: 500,
						code: 'csrf_token_missing',
					});
				}

				csrfToken = token;
				const ttlSeconds = Number.isFinite(payload.expiresInSeconds)
					? Math.max(60, Number(payload.expiresInSeconds))
					: 3_600;
				csrfExpiresAt = Date.now() + ttlSeconds * 1_000;
				return token;
			},
			{
				timeoutMs: CSRF_REQUEST_TIMEOUT_MS,
				retries: 1,
				isRetryable: isTransientAiError,
			},
		).finally(() => {
			csrfRequest = null;
		});
	}

	return csrfRequest;
}

async function isExpiredCsrfResponse(response: Response): Promise<boolean> {
	if (response.status !== 403) {
		return false;
	}

	try {
		const payload = (await response.clone().json()) as { code?: unknown };
		return payload.code === 'csrf_invalid';
	} catch {
		return false;
	}
}

function isMutatingMethod(method: string): boolean {
	return !['GET', 'HEAD', 'OPTIONS'].includes(method);
}

function normalizePath(path: string): string {
	return path.startsWith('/') ? path : `/${path}`;
}

function setAiApiCache(path: string, data: unknown, ttlMs: number): void {
	const cacheKey = normalizePath(path);
	if (
		!aiApiCache.has(cacheKey) &&
		aiApiCache.size >= MAX_AI_API_CACHE_ENTRIES
	) {
		const oldestKey = aiApiCache.keys().next().value;
		if (typeof oldestKey === 'string') aiApiCache.delete(oldestKey);
	}
	aiApiCache.delete(cacheKey);
	aiApiCache.set(cacheKey, { data, expiresAt: Date.now() + ttlMs });
}

function serializeBody(body: unknown, headers: Headers): BodyInit | undefined {
	if (body === undefined) {
		return undefined;
	}

	if (
		body instanceof FormData ||
		body instanceof URLSearchParams ||
		body instanceof Blob ||
		typeof body === 'string'
	) {
		return body;
	}

	if (headers.get('content-type')?.includes('application/json')) {
		return JSON.stringify(body);
	}

	return body as BodyInit;
}

function isJsonBody(body: unknown): boolean {
	return (
		body !== undefined &&
		!(body instanceof FormData) &&
		!(body instanceof URLSearchParams) &&
		!(body instanceof Blob) &&
		typeof body !== 'string'
	);
}

async function readProblem(response: Response): Promise<AiApiProblem> {
	const correlationId = response.headers.get('x-request-id') || undefined;

	try {
		const problem = (await response.json()) as Partial<AiApiProblem>;

		return {
			...problem,
			title: problem.title || 'Ошибка запроса',
			status: response.status,
			correlationId: problem.correlationId || correlationId,
		};
	} catch {
		return {
			title: 'Ошибка запроса',
			status: response.status,
			correlationId,
		};
	}
}

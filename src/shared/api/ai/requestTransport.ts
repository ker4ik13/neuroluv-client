export class AiRequestTimeoutError extends Error {
	constructor() {
		super('AI request timed out');
		this.name = 'AiRequestTimeoutError';
	}
}

export function allowsRequestRetry(
	path: string,
	method: string,
	body: unknown,
): boolean {
	if (method === 'GET' || method === 'HEAD') return true;
	const pathname = path.split('?', 1)[0];
	if (method === 'POST' && pathname === '/quote') return true;
	if (
		method !== 'POST' ||
		!(pathname === '/runs' || /^\/runs\/[^/]+\/retry$/u.test(pathname || ''))
	)
		return false;
	return (
		!!body &&
		typeof body === 'object' &&
		'idempotencyKey' in body &&
		typeof body.idempotencyKey === 'string' &&
		body.idempotencyKey.trim().length > 0
	);
}

export async function executeAiRequest<T>(
	operation: (signal: AbortSignal) => Promise<T>,
	options: {
		timeoutMs: number | null;
		signal?: AbortSignal;
		retries?: number;
		retryDelayMs?: number;
		isRetryable: (error: unknown) => boolean;
	},
): Promise<T> {
	const retries = options.retries ?? 0;
	for (let attempt = 0; attempt <= retries; attempt += 1) {
		options.signal?.throwIfAborted();
		const controller = new AbortController();
		const signal = options.signal
			? AbortSignal.any([options.signal, controller.signal])
			: controller.signal;
		const timer =
			options.timeoutMs === null
				? null
				: setTimeout(() => controller.abort(), options.timeoutMs);
		try {
			return await operation(signal);
		} catch (error) {
			options.signal?.throwIfAborted();
			const failure = controller.signal.aborted
				? new AiRequestTimeoutError()
				: error;
			if (attempt === retries || !options.isRetryable(failure)) throw failure;
		} finally {
			if (timer !== null) clearTimeout(timer);
		}
		await waitForRetry(options.retryDelayMs ?? 400, options.signal);
	}
	throw new Error('AI request retry limit reached');
}

function waitForRetry(delay: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const finish = () => {
			signal?.removeEventListener('abort', abort);
			resolve();
		};
		const timer = setTimeout(finish, delay);
		const abort = () => {
			clearTimeout(timer);
			signal?.removeEventListener('abort', abort);
			reject(signal?.reason);
		};
		signal?.addEventListener('abort', abort, { once: true });
		if (signal?.aborted) abort();
	});
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	AiRequestTimeoutError,
	allowsRequestRetry,
	executeAiRequest,
} from '../src/shared/api/ai/requestTransport.ts';

test('retries are restricted to reads, quotes and keyed generation requests', () => {
	assert.equal(allowsRequestRetry('/quote', 'POST', {}), true);
	assert.equal(
		allowsRequestRetry('/runs', 'POST', { idempotencyKey: 'same-key' }),
		true,
	);
	assert.equal(
		allowsRequestRetry('/runs/run-id/retry', 'POST', {
			idempotencyKey: 'same-key',
		}),
		true,
	);
	for (const path of [
		'/uploads',
		'/billing/checkout',
		'/auth/register',
		'/conversations',
	]) {
		assert.equal(
			allowsRequestRetry(path, 'POST', { idempotencyKey: 'same-key' }),
			false,
		);
	}
	assert.equal(allowsRequestRetry('/runs', 'POST', {}), false);
});

test('a lost response retries with the same creation identity', async () => {
	const body = {
		idempotencyKey: 'same-generation',
		inputFileIds: ['uploaded-photo'],
	};
	const seen = [];
	const result = await executeAiRequest(
		async () => {
			seen.push(JSON.stringify(body));
			if (seen.length === 1) throw new TypeError('Failed to fetch');
			return { id: 'accepted-run' };
		},
		{
			timeoutMs: 100,
			retries: 1,
			retryDelayMs: 0,
			isRetryable: (e) => e instanceof TypeError,
		},
	);
	assert.deepEqual(result, { id: 'accepted-run' });
	assert.deepEqual(seen, [JSON.stringify(body), JSON.stringify(body)]);
});

test('each retry receives a fresh timeout signal', async () => {
	const signals = [];
	const result = await executeAiRequest(
		(signal) => {
			signals.push(signal);
			if (signals.length === 2) return Promise.resolve('accepted');
			return new Promise((_, reject) =>
				signal.addEventListener('abort', () => reject(signal.reason), {
					once: true,
				}),
			);
		},
		{
			timeoutMs: 5,
			retries: 1,
			retryDelayMs: 0,
			isRetryable: (e) => e instanceof AiRequestTimeoutError,
		},
	);
	assert.equal(result, 'accepted');
	assert.equal(signals[0].aborted, true);
	assert.equal(signals[1].aborted, false);
});

test('does not retry validation or insufficient-credit failures', async () => {
	let calls = 0;
	const error = new Error('validation failed');
	await assert.rejects(
		executeAiRequest(
			async () => {
				calls++;
				throw error;
			},
			{
				timeoutMs: 100,
				retries: 1,
				retryDelayMs: 0,
				isRetryable: (e) => e instanceof TypeError,
			},
		),
		error,
	);
	assert.equal(calls, 1);
});

test('explicit cancellation stops retries', async () => {
	const controller = new AbortController();
	let calls = 0;
	await assert.rejects(
		executeAiRequest(
			async () => {
				calls++;
				controller.abort();
				throw new TypeError('cancelled');
			},
			{
				timeoutMs: 100,
				signal: controller.signal,
				retries: 1,
				retryDelayMs: 0,
				isRetryable: () => true,
			},
		),
		{ name: 'AbortError' },
	);
	assert.equal(calls, 1);
});

test('timeout remains identifiable after the final attempt', async () => {
	await assert.rejects(
		executeAiRequest(
			(signal) =>
				new Promise((_, reject) => {
					signal.addEventListener('abort', () => reject(signal.reason), {
						once: true,
					});
				}),
			{ timeoutMs: 5, isRetryable: () => true },
		),
		AiRequestTimeoutError,
	);
});

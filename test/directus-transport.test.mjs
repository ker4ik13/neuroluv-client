import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	DirectusApiError,
	executeDirectusRequest,
} from '../src/shared/api/directus/transport.ts';

const request = {
	baseUrl: 'https://cms.example.invalid',
	authToken: 'test-only-token',
	method: 'GET',
	options: { cache: 'no-store', next: { revalidate: 0 } },
	path: '/items/pages?filter[status][_eq]=published',
};

test('502 responses recover through bounded read retries without changing URL, auth or cache options', async (t) => {
	const calls = [];
	t.mock.method(globalThis, 'fetch', async (url, options) => {
		calls.push({ url, options });
		return calls.length < 3
			? new Response('<html>502 Bad Gateway</html>', {
					status: 502,
					statusText: 'Bad Gateway',
				})
			: Response.json({ data: [{ slug: '/' }] });
	});
	assert.deepEqual(await executeDirectusRequest(request), [{ slug: '/' }]);
	assert.equal(calls.length, 3);
	assert.equal(new Set(calls.map((call) => call.options.signal)).size, 3);
	for (const call of calls) {
		assert.equal(call.url, `${request.baseUrl}${request.path}`);
		assert.equal(
			call.options.headers.Authorization,
			`Bearer ${request.authToken}`,
		);
		assert.equal(call.options.cache, request.options.cache);
		assert.deepEqual(call.options.next, request.options.next);
		assert.equal(call.options.method, 'GET');
	}
});

test('SEARCH preserves the full read query, including publication and FAQ fields', async (t) => {
	const body = JSON.stringify({
		query: {
			fields: ['id', 'content_blocks.item:block_faq.questions'],
			filter: { status: { _eq: 'published' } },
		},
	});
	const calls = [];
	t.mock.method(globalThis, 'fetch', async (url, options) => {
		calls.push({ url, options });
		return Response.json({ data: [] });
	});
	assert.deepEqual(
		await executeDirectusRequest({
			...request,
			method: 'SEARCH',
			path: '/items/articles',
			body,
		}),
		[],
	);
	assert.equal(calls[0].options.body, body);
	assert.equal(calls[0].options.method, 'SEARCH');
	assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
});

test('plain proxy 404 is reported once with a safe origin, never interpreted as empty content', async (t) => {
	const logs = [];
	t.mock.method(console, 'error', (...args) => logs.push(args));
	const fetch = t.mock.method(
		globalThis,
		'fetch',
		async () =>
			new Response('404 page not found', {
				status: 404,
				statusText: 'Not Found',
			}),
	);
	await assert.rejects(executeDirectusRequest(request), (error) => {
		assert.ok(error instanceof DirectusApiError);
		assert.equal(error.status, 404);
		assert.equal(error.context.origin, request.baseUrl);
		assert.equal(error.context.resource, '/items/pages');
		assert.equal(error.context.response, '404 page not found');
		return true;
	});
	assert.equal(fetch.mock.callCount(), 1);
	assert.ok(!JSON.stringify(logs).includes(request.authToken));
	assert.ok(!JSON.stringify(logs).includes('filter[status]'));
});

test('persistent gateway failure retains the final status and caps retries', async (t) => {
	t.mock.method(console, 'error', () => {});
	const fetch = t.mock.method(
		globalThis,
		'fetch',
		async () =>
			new Response('502 Bad Gateway', {
				status: 502,
				statusText: 'Bad Gateway',
			}),
	);
	await assert.rejects(
		executeDirectusRequest(request),
		(error) => error.status === 502 && error.context.origin === request.baseUrl,
	);
	assert.equal(fetch.mock.callCount(), 3);
});

test('timeouts receive fresh deadlines and end as an explicit upstream error', async (t) => {
	t.mock.method(console, 'error', () => {});
	const timeout = AbortSignal.timeout.bind(AbortSignal);
	const deadlines = [];
	t.mock.method(AbortSignal, 'timeout', (ms) => {
		deadlines.push(ms);
		return timeout(5);
	});
	const signals = [];
	t.mock.method(globalThis, 'fetch', async (_, options) => {
		signals.push(options.signal);
		await new Promise((resolve) => setTimeout(resolve, 15));
		options.signal.throwIfAborted();
		return Response.json({ data: [] });
	});
	await assert.rejects(
		executeDirectusRequest(request),
		(error) =>
			error instanceof DirectusApiError &&
			error.status === 503 &&
			/timeout/i.test(error.message),
	);
	assert.deepEqual(deadlines, [10_000, 10_000, 10_000]);
	assert.equal(new Set(signals).size, 3);
});

test('oversized GET is rejected before contacting the CMS', async (t) => {
	t.mock.method(console, 'error', () => {});
	const fetch = t.mock.method(globalThis, 'fetch', async () =>
		Response.json({ data: [] }),
	);
	await assert.rejects(
		executeDirectusRequest({
			...request,
			path: `/items/pages?fields=${'x'.repeat(7_000)}`,
		}),
		(error) => error.status === 0 && /use SEARCH/.test(error.message),
	);
	assert.equal(fetch.mock.callCount(), 0);
});

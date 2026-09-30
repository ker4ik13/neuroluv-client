import assert from 'node:assert/strict';
import { test } from 'node:test';
import { saveMediaBlob } from '../src/shared/lib/dom/saveMediaBlob.ts';
import { resolveMediaDownloadUrl } from '../src/shared/lib/media/downloadUrl.ts';

const apiUrl = 'https://api.neuroluv.ru/v1';
const fileId = '50000000-0000-4000-8000-000000000001';
const assetOrigins = ['https://admin.neuroluv.ru', 'https://cms.neuroluv.ru'];
test('preserves authorized API downloads and does not navigate to S3 or foreign hosts', () => {
	assert.equal(
		resolveMediaDownloadUrl(
			`/media/outputs/${fileId}/download`,
			apiUrl,
			assetOrigins,
		),
		`${apiUrl}/media/outputs/${fileId}/download`,
	);
	for (const href of [
		'https://s3.timeweb.test/object?X-Amz-Signature=old',
		'https://api.neuroluv.ru.evil.test/v1/media/file',
		'javascript:alert(1)',
	]) {
		assert.equal(resolveMediaDownloadUrl(href, apiUrl, assetOrigins), '#');
	}
});
test('routes public Directus gallery downloads through anonymous permission checks', () => {
	assert.equal(
		resolveMediaDownloadUrl(
			`https://admin.neuroluv.ru/assets/${fileId}?format=webp`,
			apiUrl,
			assetOrigins,
		),
		`${apiUrl}/media/catalog/${fileId}/download`,
	);
	assert.equal(
		resolveMediaDownloadUrl(
			`https://evil.test/assets/${fileId}`,
			apiUrl,
			assetOrigins,
		),
		'#',
	);
});
test('allows only scoped shared-reference downloads, not arbitrary API endpoints', () => {
	const path = `/public/shares/example/references/${fileId}/download`;
	assert.equal(
		resolveMediaDownloadUrl(`${apiUrl}${path}`, apiUrl, assetOrigins),
		`${apiUrl}${path}`,
	);
	assert.equal(
		resolveMediaDownloadUrl(`${apiUrl}/auth/logout`, apiUrl, assetOrigins),
		'#',
	);
});

test('downloads a media blob without navigating to its remote source', (t) => {
	const events = [];
	const anchor = {
		style: {},
		click: () => events.push('click'),
		remove: () => events.push('remove'),
	};
	const previousDocument = globalThis.document;
	globalThis.document = {
		createElement: () => anchor,
		body: { append: () => events.push('append') },
	};
	t.after(() => {
		if (previousDocument === undefined)
			Reflect.deleteProperty(globalThis, 'document');
		else globalThis.document = previousDocument;
	});
	t.mock.method(URL, 'createObjectURL', () => 'blob:local-image');
	const revoke = t.mock.method(URL, 'revokeObjectURL', () => undefined);
	let release;
	t.mock.method(globalThis, 'setTimeout', (callback, delay) => {
		release = callback;
		assert.equal(delay, 60_000);
	});

	saveMediaBlob(new Blob(['image'], { type: 'image/png' }), 'image.png');
	assert.equal(anchor.href, 'blob:local-image');
	assert.equal(anchor.download, 'image.png');
	assert.deepEqual(events, ['append', 'click', 'remove']);
	assert.equal(revoke.mock.callCount(), 0);
	release();
	assert.equal(revoke.mock.callCount(), 1);
});

for (const mimeType of [
	'application/xml',
	'text/xml',
	'application/json',
	'text/html',
]) {
	test(`never saves an error response as an image: ${mimeType}`, (t) => {
		const create = t.mock.method(
			URL,
			'createObjectURL',
			() => 'blob:should-not-exist',
		);
		assert.throws(() =>
			saveMediaBlob(new Blob(['error'], { type: mimeType }), 'image.png'),
		);
		assert.equal(create.mock.callCount(), 0);
	});
}

test('rejects an empty download', () => {
	assert.throws(() =>
		saveMediaBlob(new Blob([], { type: 'image/png' }), 'image.png'),
	);
});

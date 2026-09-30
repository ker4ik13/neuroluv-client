import assert from 'node:assert/strict';
import { test } from 'node:test';
import { saveMediaBlob } from '../src/shared/lib/dom/saveMediaBlob.ts';

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

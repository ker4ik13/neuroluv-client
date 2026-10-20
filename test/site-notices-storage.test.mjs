import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	COOKIE_NOTICE_KEY,
	noticeSessionId,
	readNoticeStorage,
	resetNoticeStorage,
	subscribeNoticeStorage,
	writeNoticeStorage,
} from '../src/shared/lib/site-notices/storage.ts';

test('storage persists changes, notifies this tab and never resurrects cleared data', () => {
	const data = new Map();
	globalThis.window = new EventTarget();
	window.localStorage = {
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => data.set(key, value),
		removeItem: (key) => data.delete(key),
	};
	let changes = 0;
	const unsubscribe = subscribeNoticeStorage(() => changes++);
	writeNoticeStorage(COOKIE_NOTICE_KEY, 'saved');
	assert.equal(readNoticeStorage(COOKIE_NOTICE_KEY), 'saved');
	assert.equal(changes, 1);
	data.delete(COOKIE_NOTICE_KEY);
	assert.equal(readNoticeStorage(COOKIE_NOTICE_KEY), null);
	resetNoticeStorage();
	assert.equal(changes, 2);
	unsubscribe();
	delete globalThis.window;
});
test('quota errors use memory even when reads work, and another tab can reset it', () => {
	globalThis.window = new EventTarget();
	window.localStorage = {
		getItem: () => 'old',
		setItem: () => {
			throw new Error('QuotaExceededError');
		},
		removeItem: () => {},
	};
	const unsubscribe = subscribeNoticeStorage(() => {});
	writeNoticeStorage(COOKIE_NOTICE_KEY, 'new');
	assert.equal(readNoticeStorage(COOKIE_NOTICE_KEY), 'new');
	const changed = new Event('storage');
	Object.defineProperty(changed, 'key', { value: COOKIE_NOTICE_KEY });
	window.dispatchEvent(changed);
	assert.equal(readNoticeStorage(COOKIE_NOTICE_KEY), 'old');
	unsubscribe();
	resetNoticeStorage();
	delete globalThis.window;
});
test('missing browser storage is non-fatal and the page has a stable fallback session', () => {
	globalThis.window = new EventTarget();
	Object.defineProperty(window, 'localStorage', {
		get: () => {
			throw new Error('SecurityError');
		},
	});
	writeNoticeStorage(COOKIE_NOTICE_KEY, 'in-memory');
	assert.equal(readNoticeStorage(COOKIE_NOTICE_KEY), 'in-memory');
	assert.equal(noticeSessionId(), noticeSessionId());
	resetNoticeStorage();
	assert.equal(readNoticeStorage(COOKIE_NOTICE_KEY), null);
	delete globalThis.window;
});

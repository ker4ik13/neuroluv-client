import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
	canRepeatNotice,
	cookieRevision,
	currentCookieAcknowledgement,
	isNoticeEligible,
	matchesNoticePath,
	modalFromHash,
	modalHref,
	noticeButtonHref,
	noticeRevision,
	noticeTriggerReached,
	parseNoticeHistory,
	safeNoticeUrl,
} from '../src/shared/lib/site-notices/policy.ts';
import { DEFAULT_COOKIE_SETTINGS } from '../src/shared/lib/site-notices/types.ts';

const notice = {
	id: 'test',
	key: 'test',
	kind: 'modal',
	title: 'Заголовок',
	text: 'Текст',
	badge: '',
	benefits: [],
	footnote: '',
	image: null,
	buttons: [],
	trigger: 'delay',
	delaySeconds: 20,
	scrollDesktop: 1,
	scrollMobile: 2,
	includePaths: ['/articles/*'],
	excludePaths: ['/articles/private/*'],
	allowWorkspace: false,
	priority: 0,
	frequency: 'version',
	repeatDays: 7,
	version: '1',
	startsAt: null,
	endsAt: null,
};

test('page rules support exact paths, section roots and masks without regex injection', () => {
	for (const path of ['/articles', '/articles/', '/articles/example'])
		assert.equal(matchesNoticePath(path, '/articles/*'), true);
	assert.equal(matchesNoticePath('/news/example', '/articles/*'), false);
	assert.equal(matchesNoticePath('/article', '/articles/*'), false);
	assert.equal(matchesNoticePath('/x.a', '/x.a'), true);
	assert.equal(matchesNoticePath('/xxa', '/x.a'), false);
	assert.equal(matchesNoticePath('/anything', '/*'), true);
	assert.equal(matchesNoticePath('/articles', '/articles?x=1'), false);
	assert.equal(matchesNoticePath('/articles', 'articles'), false);
});
test('exclusions, dates and protected Studio workspaces override general rules', () => {
	assert.equal(isNoticeEligible(notice, '/articles/example', Date.now()), true);
	assert.equal(
		isNoticeEligible(notice, '/articles/private/test', Date.now()),
		false,
	);
	assert.equal(
		isNoticeEligible(
			{ ...notice, startsAt: '2999-01-01' },
			'/articles/example',
			Date.now(),
		),
		false,
	);
	assert.equal(
		isNoticeEligible(
			{ ...notice, endsAt: '2020-01-01' },
			'/articles/example',
			Date.now(),
		),
		false,
	);
	for (const path of [
		'/ai/create/photo/model',
		'/ai/balance',
		'/ai/profile',
		'/ai/works/id',
		'/ai/auth/login',
		'/ai/share/id',
		'/ai/tools/photo-to-prompt',
		'/ai/prompts/configure',
		'/ai/referrals',
	])
		assert.equal(
			isNoticeEligible({ ...notice, includePaths: ['/*'] }, path, Date.now()),
			false,
		);
	assert.equal(
		isNoticeEligible(
			{ ...notice, includePaths: ['/*'], allowWorkspace: true },
			'/ai/balance',
			Date.now(),
		),
		true,
	);
	assert.equal(
		isNoticeEligible(
			{ ...notice, includePaths: ['/*'] },
			'/ai/prompts',
			Date.now(),
		),
		true,
	);
});
test('time/scroll triggers use separate desktop and mobile screen counts', () => {
	assert.equal(noticeTriggerReached(notice, 19.9, 10, false), false);
	assert.equal(noticeTriggerReached(notice, 20, 0, false), true);
	const scroll = { ...notice, trigger: 'scroll' };
	assert.equal(noticeTriggerReached(scroll, 0, 1, false), true);
	assert.equal(noticeTriggerReached(scroll, 0, 1, true), false);
	assert.equal(noticeTriggerReached(scroll, 0, 2, true), true);
	assert.equal(
		noticeTriggerReached({ ...notice, trigger: 'manual' }, 999, 999, false),
		false,
	);
	assert.equal(
		noticeTriggerReached({ ...notice, trigger: 'both' }, 20, 0, false),
		false,
	);
	assert.equal(
		noticeTriggerReached({ ...notice, trigger: 'both' }, 20, 1, false),
		true,
	);
	assert.equal(
		noticeTriggerReached({ ...notice, trigger: 'either' }, 0, 1, false),
		true,
	);
});
test('each notice has independent dismissal; content changes allow a fresh display', () => {
	const at = Date.now();
	const history = {
		test: { revision: noticeRevision(notice), at, session: 'first' },
	};
	assert.equal(canRepeatNotice(notice, history, 'first', at), false);
	assert.equal(
		canRepeatNotice({ ...notice, id: 'another' }, history, 'first', at),
		true,
	);
	for (const updated of [
		{ title: 'Новый заголовок' },
		{ text: 'Другой текст' },
		{ version: '2' },
		{ buttons: [{ label: 'Новая кнопка' }] },
		{ image: { url: '/new.jpg', alt: 'Новое фото' } },
	])
		assert.equal(
			canRepeatNotice({ ...notice, ...updated }, history, 'first', at),
			true,
		);
	assert.equal(
		canRepeatNotice({ ...notice, frequency: 'session' }, history, 'first', at),
		false,
	);
	assert.equal(
		canRepeatNotice({ ...notice, frequency: 'session' }, history, 'second', at),
		true,
	);
	assert.equal(
		canRepeatNotice(
			{ ...notice, frequency: 'days' },
			history,
			'first',
			at + 6 * 86400000,
		),
		false,
	);
	assert.equal(
		canRepeatNotice(
			{ ...notice, frequency: 'days' },
			history,
			'first',
			at + 7 * 86400000,
		),
		true,
	);
});
test('corrupt local data does not prevent notices from working', () => {
	for (const raw of [
		null,
		'{',
		'[]',
		'null',
		'42',
		'{"bad":{"at":"yesterday"}}',
	])
		assert.deepEqual(parseNoticeHistory(raw), {});
	assert.deepEqual(
		parseNoticeHistory('{"ok":{"revision":"1","at":1,"session":"s"}}'),
		{ ok: { revision: '1', at: 1, session: 's' } },
	);
});
test('cookie acknowledgement is versioned and deliberately contains no analytics choice', () => {
	const revision = cookieRevision(DEFAULT_COOKIE_SETTINGS);
	const raw = JSON.stringify({ revision, at: 123 });
	assert.deepEqual(currentCookieAcknowledgement(raw, revision), {
		revision,
		at: 123,
	});
	assert.equal(
		currentCookieAcknowledgement(
			raw,
			cookieRevision({
				...DEFAULT_COOKIE_SETTINGS,
				text: 'Обновили уведомление',
			}),
		),
		null,
	);
	assert.equal(currentCookieAcknowledgement('{', revision), null);
	assert.equal(
		currentCookieAcknowledgement(
			JSON.stringify({ revision, at: null }),
			revision,
		),
		null,
	);
	const provider = readFileSync(
		new URL(
			'../src/features/site-notices/model/SiteNoticesProvider.tsx',
			import.meta.url,
		),
		'utf8',
	);
	assert.ok(!provider.includes('setAnalyticsConsent'));
	assert.ok(!provider.includes('requireConsent'));
});
test('only safe web/contact/modal URLs are accepted', () => {
	for (const value of [
		'/prompts',
		'#modal=test',
		'https://example.com/a',
		'mailto:hello@example.com',
		'tel:+123',
	])
		assert.equal(safeNoticeUrl(value), value);
	for (const value of [
		'javascript:alert(1)',
		'data:text/html,x',
		'//example.com',
		'/\\example.com',
		'/bad\nurl',
		null,
		'foo',
	])
		assert.equal(safeNoticeUrl(value), '');
	assert.equal(noticeButtonHref({ url: '/prompts' }), '/prompts');
	assert.equal(
		noticeButtonHref({ modal: 'some-id', url: '/ignored' }),
		'#modal=some-id',
	);
	assert.equal(modalFromHash(modalHref('ключ с пробелом')), 'ключ с пробелом');
	assert.equal(modalFromHash('#modal=%invalid'), null);
	assert.equal(modalFromHash('#section'), null);
});

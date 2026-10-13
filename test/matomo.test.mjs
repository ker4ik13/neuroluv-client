import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import {
	buildMatomoBootstrap,
	DEFAULT_MATOMO_SITE_ID,
	DEFAULT_MATOMO_URL,
} from '../src/shared/lib/analytics/matomo.ts';
import {
	ATTRIBUTION_QUERY_PARAMETER_NAMES,
	METRIKA_ROUTE_QUERY_PARAMETER_NAMES,
	preserveAnalyticsQueryInUrl,
} from '../src/shared/lib/analytics/tracking-query.ts';

const bootstrap = buildMatomoBootstrap(
	{ url: DEFAULT_MATOMO_URL, siteId: DEFAULT_MATOMO_SITE_ID },
	ATTRIBUTION_QUERY_PARAMETER_NAMES,
	METRIKA_ROUTE_QUERY_PARAMETER_NAMES,
);

function browser(href, referrer = '', readyState = 'complete') {
	const listeners = new Map();
	const scripts = [];
	const window = { location: new URL(href) };
	const document = {
		title: 'Нейролюб',
		referrer,
		readyState,
		addEventListener: (event, listener) => listeners.set(event, listener),
		createElement: () => ({}),
		head: { appendChild: (script) => scripts.push(script) },
	};
	const execute = () =>
		runInNewContext(
			bootstrap,
			{ window, document, URL, Set },
			{ timeout: 1000 },
		);
	execute();
	return {
		window,
		document,
		scripts,
		listeners,
		execute,
		commands: (name) =>
			JSON.parse(
				JSON.stringify(window._paq.filter((command) => command[0] === name)),
			),
		navigate: (url, title = 'Новая страница') => {
			window.location = new URL(url);
			document.title = title;
			window.__neuroluvTrackMatomoPage();
		},
	};
}

test('public tracker config matches the supplied snippet and initializes exactly once', () => {
	const page = browser('https://neuroluv.ru/');
	assert.deepEqual(page.commands('setTrackerUrl'), [
		['setTrackerUrl', 'https://metrika.neuroluv.ru/matomo.php'],
	]);
	assert.deepEqual(page.commands('setSiteId'), [['setSiteId', '1']]);
	assert.equal(page.commands('trackPageView').length, 1);
	page.execute();
	page.window.__neuroluvTrackMatomoPage();
	assert.equal(page.scripts.length, 1);
	assert.equal(page.scripts[0].src, 'https://metrika.neuroluv.ru/matomo.js');
	assert.equal(page.commands('trackPageView').length, 1);
});

test('landing records the search-engine referrer and campaign without credentials or fragment', () => {
	const page = browser(
		'https://neuroluv.ru/?utm_source=google&mtm_campaign=seo&token=PRIVATE#secret',
		'https://www.google.com/search?q=нейросети&token=PRIVATE',
	);
	assert.deepEqual(page.commands('setReferrerUrl'), [
		[
			'setReferrerUrl',
			'https://www.google.com/search?q=%D0%BD%D0%B5%D0%B9%D1%80%D0%BE%D1%81%D0%B5%D1%82%D0%B8',
		],
	]);
	assert.deepEqual(page.commands('setCustomUrl'), [
		['setCustomUrl', 'https://neuroluv.ru/?utm_source=google&mtm_campaign=seo'],
	]);
	assert.ok(!JSON.stringify(page.window._paq).includes('PRIVATE'));
});

test('SPA navigation sends one action per URL, the current title and the previous sanitized URL', () => {
	const page = browser('https://neuroluv.ru/');
	page.navigate(
		'https://neuroluv.ru/articles?token=PRIVATE',
		'Статьи — Нейролюб',
	);
	page.navigate(
		'https://neuroluv.ru/articles?token=OTHER',
		'Статьи — Нейролюб',
	);
	assert.equal(page.commands('trackPageView').length, 2);
	assert.equal(
		page.commands('setDocumentTitle').at(-1)[1],
		'Статьи — Нейролюб',
	);
	assert.equal(
		page.commands('setReferrerUrl').at(-1)[1],
		'https://neuroluv.ru/',
	);
});

test('site search replaces the view, and pagination does not duplicate the search action', () => {
	const page = browser('https://neuroluv.ru/prompts?q=портрет&token=PRIVATE');
	assert.deepEqual(page.commands('trackSiteSearch'), [
		['trackSiteSearch', 'портрет', 'Промпты'],
	]);
	assert.equal(page.commands('trackPageView').length, 0);
	assert.equal(
		page.commands('setCustomUrl')[0][1],
		'https://neuroluv.ru/prompts',
	);
	page.navigate('https://neuroluv.ru/prompts?q=портрет&page=2');
	assert.equal(page.commands('trackSiteSearch').length, 1);
	assert.equal(page.commands('trackPageView').length, 1);
	page.navigate('https://neuroluv.ru/prompts?q=товар&page=1');
	assert.equal(page.commands('trackSiteSearch').length, 2);
});

test('search tracking is limited to catalog pages and bounds the keyword length', () => {
	for (const path of ['/prompts', '/news', '/articles', '/ai/prompts']) {
		const page = browser(`https://neuroluv.ru${path}?q=${'a'.repeat(500)}`);
		assert.equal(page.commands('trackSiteSearch')[0][1].length, 200);
	}
	const page = browser(
		'https://neuroluv.ru/ai/create/text?q=PRIVATE&prompt=PRIVATE&email=PRIVATE',
	);
	assert.equal(page.commands('trackSiteSearch').length, 0);
	assert.ok(!JSON.stringify(page.window._paq).includes('PRIVATE'));
});

test('private work identifiers and titles are not transmitted', () => {
	const page = browser('https://neuroluv.ru/ai/works/PRIVATE?token=PRIVATE');
	page.navigate('https://neuroluv.ru/ai/works/ANOTHER', 'PRIVATE title');
	assert.equal(page.commands('trackPageView').length, 2);
	assert.equal(
		page.commands('setCustomUrl').at(-1)[1],
		'https://neuroluv.ru/ai/works/item',
	);
	assert.ok(!JSON.stringify(page.window._paq).includes('PRIVATE'));
});

test('signed downloads and links from private Studio pages are ignored by automatic link tracking', () => {
	const page = browser('https://neuroluv.ru/');
	const classes = [];
	const anchor = {
		href: 'https://files.example.invalid/image.png?X-Amz-Signature=PRIVATE',
		classList: { add: (name) => classes.push(name) },
	};
	page.listeners.get('click')({ target: { closest: () => anchor } });
	assert.deepEqual(classes, ['matomo-ignore-sensitive']);
	anchor.href = 'https://t.me/neuroluv';
	page.window.location = new URL('https://neuroluv.ru/ai/works');
	page.listeners.get('click')({ target: { closest: () => anchor } });
	assert.equal(classes.length, 2);
});

test('waits for parsed metadata and does not double-count the subsequent hydration', () => {
	const page = browser('https://neuroluv.ru/', '', 'loading');
	assert.equal(page.commands('trackPageView').length, 0);
	page.document.title = 'Правильный заголовок';
	page.listeners.get('DOMContentLoaded')();
	page.window.__neuroluvTrackMatomoPage();
	assert.equal(page.commands('trackPageView').length, 1);
	assert.equal(page.commands('setDocumentTitle')[0][1], 'Правильный заголовок');
});

test('Matomo campaign parameters persist on internal navigation, authentication parameters do not', () => {
	const href = preserveAnalyticsQueryInUrl(
		'/prompts',
		'https://neuroluv.ru/?mtm_campaign=seo&mtm_source=google&token=PRIVATE',
	);
	assert.equal(
		href,
		'https://neuroluv.ru/prompts?mtm_campaign=seo&mtm_source=google',
	);
});

test('root layout and strict Studio CSP use the same bootstrap and permit only the tracker origin', () => {
	const layout = readFileSync(
		new URL('../src/app/layout.tsx', import.meta.url),
		'utf8',
	);
	const proxy = readFileSync(
		new URL('../src/proxy.ts', import.meta.url),
		'utf8',
	);
	assert.ok(layout.includes('<MatomoHead bootstrap={MATOMO_BOOTSTRAP}'));
	assert.ok(layout.includes('<Matomo />'));
	assert.ok(proxy.includes('encode(MATOMO_BOOTSTRAP)'));
	assert.ok(proxy.includes('${matomoBootstrapHash}'));
	assert.match(proxy, /connect-src[^\n]+MATOMO_ORIGIN/);
});

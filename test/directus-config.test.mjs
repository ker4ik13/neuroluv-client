import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { resolveDirectusUrl } from '../src/shared/config/directus-url.ts';

test('unset CMS URL uses the working production origin, not the retired development domain', () => {
	for (const value of [undefined, '', '  ']) {
		assert.equal(resolveDirectusUrl(value), 'https://admin.neuroluv.ru');
	}
});

test('explicit CMS URLs retain their host, port and proxy prefix', () => {
	assert.equal(
		resolveDirectusUrl(' https://admin.neuroluv.ru/// '),
		'https://admin.neuroluv.ru',
	);
	assert.equal(
		resolveDirectusUrl('http://localhost:8055/'),
		'http://localhost:8055',
	);
	assert.equal(
		resolveDirectusUrl('https://cms.example.invalid/directus/'),
		'https://cms.example.invalid/directus',
	);
});

test('invalid URL configuration fails clearly without leaking its value', () => {
	for (const value of [
		'not-a-url',
		'file:///tmp/config',
		'https://user:secret@cms.invalid',
		'https://cms.invalid?token=secret',
		'https://cms.invalid/#secret',
	]) {
		assert.throws(
			() => resolveDirectusUrl(value),
			(error) => {
				assert.match(error.message, /NEXT_PUBLIC_DIRECTUS_URL/);
				assert.ok(!error.message.includes(value));
				assert.ok(!error.message.includes('secret'));
				return true;
			},
		);
	}
});

test('API and Next image configuration share the URL resolver', () => {
	for (const path of [
		'../next.config.ts',
		'../src/shared/config/directus.ts',
	]) {
		const source = readFileSync(new URL(path, import.meta.url), 'utf8');
		assert.match(source, /resolveDirectusUrl\(\s*process\.env\.NEXT_PUBLIC_DIRECTUS_URL\s*,?\s*\)/);
		assert.ok(!source.includes('dev.cms.neuroluv.ru'));
	}
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	getSocialBrand,
	SOCIAL_BRANDS,
} from '../src/shared/lib/social/brands.ts';

test('every supported social platform has an icon and its own hover color', () => {
	for (const [platform, brand] of Object.entries(SOCIAL_BRANDS)) {
		assert.equal(getSocialBrand(platform).icon, brand.icon);
		assert.equal(getSocialBrand(brand.icon).platform, platform);
		assert.match(brand.color, /^#[0-9a-f]{6}$/i);
	}
	assert.equal(getSocialBrand('whatsapp').icon, 'FaWhatsapp');
	assert.notEqual(
		getSocialBrand('telegram').color,
		getSocialBrand('pinterest').color,
	);
});

test('normalizes existing CMS icon names, aliases and casing', () => {
	for (const [value, platform] of [
		['FaTelegramPlane', 'telegram'],
		[' TG ', 'telegram'],
		[' Whats_App ', 'whatsapp'],
		['X-Twitter', 'x'],
		['FaLinkedinIn', 'linkedin'],
		['ok.ru', null],
	]) {
		assert.equal(getSocialBrand(value)?.platform || null, platform);
	}
});

test('unknown values and prototype keys never resolve to a brand', () => {
	for (const value of ['', 'unknown', 'constructor', '__proto__', 'toString'])
		assert.equal(getSocialBrand(value), null);
});

test('monochrome social icons have a visible variant on dark backgrounds', () => {
	for (const platform of ['x', 'github', 'threads'])
		assert.equal(getSocialBrand(platform).darkColor, '#ffffff');
});

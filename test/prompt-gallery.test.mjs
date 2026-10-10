import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPromptPreviewRatio } from '../src/entities/prompt/model/gallery.ts';

test('uses image proportions and bounds unusually narrow or wide previews', () => {
	assert.equal(getPromptPreviewRatio({ width: 900, height: 1200 }), 0.75);
	assert.equal(getPromptPreviewRatio({ width: 1000, height: 1000 }), 1);
	assert.equal(getPromptPreviewRatio({ width: 100, height: 1000 }), 0.72);
	assert.equal(getPromptPreviewRatio({ width: 1000, height: 100 }), 1.5);
});
test('invalid image dimensions use a predictable fallback without NaN CSS', () => {
	for (const image of [
		null,
		undefined,
		{ width: null, height: 10 },
		{ width: 0, height: 10 },
		{ width: -1, height: 10 },
		{ width: Infinity, height: 10 },
		{ width: 10, height: NaN },
	])
		assert.equal(getPromptPreviewRatio(image), 0.8);
});
test('video frame format supplies proportions when Directus has no dimensions', () => {
	assert.equal(getPromptPreviewRatio(null, '16:9'), 1.5);
	assert.equal(getPromptPreviewRatio(null, '3:4'), 0.75);
	assert.equal(getPromptPreviewRatio(null, '1080p'), 0.8);
	assert.equal(getPromptPreviewRatio(null, '1:0'), 0.8);
	assert.equal(getPromptPreviewRatio({ width: 1000, height: 1000 }, '3:4'), 1);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectStudioExamples } from '../src/widgets/ai-pages/model/studio-examples.ts';

function prompt(id, overrides = {}) {
	return {
		id,
		slug: id,
		modality: 'image',
		imageUrl: `https://admin.neuroluv.ru/assets/${id}`,
		seoNoindex: false,
		...overrides,
	};
}

test('prioritizes published editorial examples without duplicates', () => {
	const featured = prompt('poster', {
		slug: 'reklamnyy-poster-dlya-tovara-v-zhurnalnom-stile',
	});
	const recent = prompt('recent');
	assert.deepEqual(selectStudioExamples([recent, featured]), [
		featured,
		recent,
	]);
});

test('excludes non-indexable entries, text models and missing preview images', () => {
	const video = prompt('video', { modality: 'video' });
	assert.deepEqual(
		selectStudioExamples([
			prompt('hidden', { seoNoindex: true }),
			prompt('text', { modality: 'text' }),
			prompt('no-preview', { imageUrl: null }),
			video,
		]),
		[video],
	);
});

test('falls back to recent public entries and limits the gallery to six', () => {
	const recent = Array.from({ length: 10 }, (_, index) =>
		prompt(String(index)),
	);
	assert.deepEqual(selectStudioExamples(recent), recent.slice(0, 6));
	assert.deepEqual(selectStudioExamples([]), []);
});

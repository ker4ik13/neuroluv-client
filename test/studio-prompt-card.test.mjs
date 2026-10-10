import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toStudioPromptCard } from '../src/widgets/ai-pages/model/prompt-card.ts';

const prompt = {
	id: 'prompt-uuid',
	slug: 'example',
	title: 'Пример',
	modality: 'image',
	modelNames: ['Nano Banana'],
	aspectRatio: '3:4',
	difficulty: 'easy',
	difficultyLabel: 'Легко',
	access: 'free',
	favorite: false,
	seoNoindex: false,
	seoNofollow: false,
};

test('Studio and library cards share presentation without changing prompt identity or source data', () => {
	const source = structuredClone(prompt);
	const card = toStudioPromptCard(prompt, null, false);
	assert.equal(card.id, prompt.id);
	assert.equal(card.href, '/ai/prompts/example');
	assert.equal(card.contentKind.title, 'Фото');
	assert.equal(card.difficultyLabel, 'Легко');
	assert.deepEqual(prompt, source);
});

test('preserves Directus media URLs and dimensions, including videos', () => {
	const source = {
		...prompt,
		media: [
			{
				id: 'file',
				url: 'https://admin.neuroluv.ru/assets/file',
				type: 'video/mp4',
				width: 1920,
				height: 1080,
			},
		],
	};
	const card = toStudioPromptCard(source, null, true);
	assert.equal(card.images[0].url, source.media[0].url);
	assert.equal(card.images[0].width, 1920);
	assert.equal(card.images[0].height, 1080);
	assert.equal(card.images[0].type, 'video/mp4');
	assert.equal(card.contentKind.title, 'Image');
	assert.equal(card.difficultyLabel, 'Easy');
	assert.equal(card.image, null);
});

test('legacy previews and missing logos have safe display fallbacks', () => {
	const card = toStudioPromptCard(
		{ ...prompt, imageUrl: '/legacy-preview.jpg', modelNames: [] },
		null,
		false,
	);
	assert.equal(card.image.url, '/legacy-preview.jpg');
	assert.equal(card.image.width, null);
	assert.equal(card.neuralNetwork, null);
	assert.deepEqual(card.images, []);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveGenerationAspectRatio } from '../src/widgets/ai-pages/model/generationAspectRatio.ts';

const model = {
	slug: 'kie-seedance-2-5',
	capabilities: {
		operations: ['text_to_video', 'image_to_video'],
		aspectRatios: ['adaptive', '16:9', '9:16', '1:1'],
		videoModes: [
			{
				code: 'text_to_video',
				operation: 'text_to_video',
				minReferenceFiles: 0,
				maxReferenceFiles: 0,
			},
			{
				code: 'image_to_video',
				operation: 'image_to_video',
				imageInput: 'frame_images',
				minReferenceFiles: 1,
				maxReferenceFiles: 2,
			},
			{
				code: 'reference_to_video',
				operation: 'image_to_video',
				imageInput: 'input_references',
				minReferenceFiles: 1,
				maxReferenceFiles: 50,
			},
		],
	},
};

test('Seedance 2.5 frame mode repairs old draft ratios and exposes only adaptive', () => {
	const before = structuredClone(model);
	for (const selected of ['16:9', '9:16', 'adaptive', '']) {
		assert.deepEqual(
			resolveGenerationAspectRatio(model, 'image_to_video', selected),
			{
				values: ['adaptive'],
				value: 'adaptive',
				frameLimited: true,
			},
		);
	}
	assert.deepEqual(model, before);
});

test('text and multimodal reference modes preserve the chosen ratio', () => {
	for (const mode of ['text_to_video', 'reference_to_video']) {
		const result = resolveGenerationAspectRatio(model, mode, '16:9');
		assert.deepEqual(result.values, model.capabilities.aspectRatios);
		assert.equal(result.value, '16:9');
		assert.equal(result.frameLimited, false);
	}
});

test('other models keep their own frame ratio options and fallback', () => {
	const other = { ...model, slug: 'seedance-2' };
	assert.equal(
		resolveGenerationAspectRatio(other, 'image_to_video', '9:16').value,
		'9:16',
	);
	assert.equal(
		resolveGenerationAspectRatio(other, 'image_to_video', 'invalid').value,
		'adaptive',
	);
	assert.deepEqual(
		resolveGenerationAspectRatio(
			{ slug: 'other', capabilities: { operations: [] } },
			'',
			'',
		),
		{
			values: [],
			value: '',
			frameLimited: false,
		},
	);
});

test('recognizes renamed frame modes and legacy capabilities without mode metadata', () => {
	const custom = {
		...model,
		capabilities: {
			...model.capabilities,
			videoModes: [
				{ ...model.capabilities.videoModes[1], code: 'first_last_frame' },
			],
		},
	};
	assert.equal(
		resolveGenerationAspectRatio(custom, 'first_last_frame', '1:1').value,
		'adaptive',
	);
	const legacy = { ...model, capabilities: { operations: ['image_to_video'] } };
	assert.equal(
		resolveGenerationAspectRatio(legacy, 'image_to_video', '16:9').value,
		'adaptive',
	);
});

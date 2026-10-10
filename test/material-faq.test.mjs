import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
	buildDirectusFaqFields,
	normalizeDirectusContentFaq,
} from '../src/shared/api/directus/faq.ts';
import { buildMaterialDetailQuery } from '../src/shared/api/directus/material-query.ts';

const faq = {
	id: 117,
	title: 'Частые вопросы',
	is_active: true,
	questions: [
		{
			sort: 2,
			faq_questions_id: {
				id: 2,
				title: 'Второй вопрос',
				description: '<p>Ответ</p>',
				is_active: true,
			},
		},
		{
			sort: 1,
			faq_questions_id: {
				id: 1,
				title: 'Первый вопрос',
				description: 'Ответ',
				is_active: true,
			},
		},
		{
			sort: 0,
			faq_questions_id: {
				id: 3,
				title: 'Скрытый вопрос',
				description: 'Ответ',
				is_active: false,
			},
		},
	],
};

test('material FAQ preserves rich answers and source data, filters inactive questions and keeps sort order', () => {
	const before = structuredClone(faq);
	const block = normalizeDirectusContentFaq(900, faq);
	assert.equal(block.id, 900);
	assert.equal(block.type, 'faq');
	assert.deepEqual(
		block.questions.map((question) => question.id),
		[1, 2],
	);
	assert.equal(block.questions[1].answer, '<p>Ответ</p>');
	assert.deepEqual(faq, before);
});

test('empty, disabled and unexpanded FAQ blocks are not rendered', () => {
	for (const item of [
		null,
		117,
		'117',
		{ ...faq, is_active: false },
		{ ...faq, questions: [] },
	])
		assert.equal(normalizeDirectusContentFaq(900, item), null);
});

test('every material adapter requests and normalizes the shared FAQ instead of silently dropping it', () => {
	for (const collection of ['articles', 'news', 'prompts']) {
		const source = readFileSync(
			new URL(`../src/shared/api/directus/${collection}.ts`, import.meta.url),
			'utf8',
		);
		assert.ok(source.includes("buildDirectusFaqFields('content_blocks')"));
		assert.ok(
			source.includes('normalizeDirectusContentFaq(block.id, block.item)'),
		);
		assert.ok(source.includes('buildMaterialDetailQuery('));
		assert.ok(source.includes('directusSearch<'));
	}
	assert.ok(
		buildDirectusFaqFields('content_blocks').includes(
			'content_blocks.item:block_faq.questions.faq_questions_id.description',
		),
	);
});

test('material detail queries always enforce publication outside an explicitly enabled preview', () => {
	const fields = [
		'id',
		'slug',
		...buildDirectusFaqFields('content_blocks'),
	].join(',');
	const query = buildMaterialDetailQuery(fields, 'example');
	assert.equal(query.limit, 1);
	assert.deepEqual(query.filter, {
		status: { _eq: 'published' },
		slug: { _eq: 'example' },
	});
	assert.deepEqual(buildMaterialDetailQuery(fields, 'example', true).filter, {
		slug: { _eq: 'example' },
	});
	assert.ok(Array.isArray(query.fields));
});

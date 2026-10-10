import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeBlockChoice } from '../src/shared/api/directus/block-choice.ts';
import { normalizeFaqQuestions } from '../src/shared/api/directus/faq.ts';
import { normalizeRichTextSpacing } from '../src/shared/lib/content/normalize-rich-text.ts';
import {
	getPromptSelectionSort,
	sortManualPromptCards,
} from '../src/shared/lib/content/prompt-selection.ts';
import {
	getBalancedGridSpans,
	getBalancedRowSizes,
} from '../src/shared/ui/balanced-grid/layout.ts';

test('balanced rows fill the width for every supported card count', () => {
	const examples = new Map([
		[1, [1]],
		[2, [2]],
		[3, [3]],
		[4, [4]],
		[5, [3, 2]],
		[6, [3, 3]],
		[7, [4, 3]],
		[8, [4, 4]],
		[9, [3, 3, 3]],
		[10, [4, 3, 3]],
	]);
	for (const [count, rows] of examples) {
		assert.deepEqual(getBalancedRowSizes(count), rows);
		assert.equal(getBalancedGridSpans(count).length, count);
	}
	for (let count = 1; count <= 50; count++) {
		for (const columns of [2, 3, 4]) {
			const rows = getBalancedRowSizes(count, columns);
			assert.equal(
				rows.reduce((sum, n) => sum + n, 0),
				count,
			);
			assert.ok(Math.max(...rows) <= columns);
			assert.ok(Math.max(...rows) - Math.min(...rows) <= 1);
			assert.ok(
				getBalancedGridSpans(count, columns).every((n) => Number.isInteger(n)),
			);
		}
	}
	assert.deepEqual(getBalancedRowSizes(0), []);
	assert.deepEqual(getBalancedRowSizes(NaN), []);
});

test('editor spacing is removed without changing text or code examples', () => {
	assert.equal(
		normalizeRichTextSpacing(
			'<p>Текст</p><p><br></p><p>&nbsp; </p><h2>Заголовок</h2>',
		),
		'<p>Текст</p><h2>Заголовок</h2>',
	);
	assert.equal(
		normalizeRichTextSpacing('<p>строка<br>строка</p>'),
		'<p>строка<br>строка</p>',
	);
	const code = '<pre><code><p><br></p></code></pre>';
	assert.equal(normalizeRichTextSpacing(code), code);
});

test('unknown block settings safely fall back to existing presentation', () => {
	assert.equal(
		normalizeBlockChoice('accent', ['neutral', 'accent'], 'neutral'),
		'accent',
	);
	assert.equal(
		normalizeBlockChoice('unknown', ['neutral', 'accent'], 'neutral'),
		'neutral',
	);
	assert.equal(
		normalizeBlockChoice(null, ['neutral', 'accent'], 'neutral'),
		'neutral',
	);
});

test('FAQ ignores inactive questions and keeps the source order unchanged', () => {
	const items = [
		{
			sort: 2,
			faq_questions_id: {
				id: 2,
				title: 'Второй',
				description: 'Ответ 2',
				is_active: true,
			},
		},
		{
			sort: 1,
			faq_questions_id: {
				id: 1,
				title: 'Первый',
				description: 'Ответ 1',
				is_active: true,
			},
		},
		{
			sort: 0,
			faq_questions_id: {
				id: 3,
				title: 'Скрытый',
				description: 'Ответ',
				is_active: false,
			},
		},
		{ sort: 0, faq_questions_id: 4 },
	];
	assert.deepEqual(
		normalizeFaqQuestions(items).map((item) => item.id),
		[1, 2],
	);
	assert.equal(items[0].sort, 2);
});

test('manual and collection galleries share sort choices with deterministic ties', () => {
	const cards = [
		{ id: 1, title: 'Б', viewsCount: 10, publishedAt: '2025-01-01' },
		{ id: 2, title: 'А', viewsCount: 30, publishedAt: '2026-01-01' },
		{ id: 3, title: 'В', viewsCount: 30, publishedAt: null },
	];
	const ids = (mode) =>
		sortManualPromptCards(cards, mode).map((card) => card.id);
	assert.deepEqual(ids('default'), [1, 2, 3]);
	assert.deepEqual(ids('title'), [2, 1, 3]);
	assert.deepEqual(ids('popular'), [3, 2, 1]);
	assert.deepEqual(ids('newest'), [2, 1, 3]);
	assert.deepEqual(ids('oldest'), [1, 2, 3]);
	assert.deepEqual(
		cards.map((card) => card.id),
		[1, 2, 3],
	);
	assert.equal(getPromptSelectionSort('popular', false), '-views_count,-id');
	assert.equal(getPromptSelectionSort('default', true), 'published_at,id');
	assert.equal(getPromptSelectionSort('newest', false), '-published_at,-id');
});

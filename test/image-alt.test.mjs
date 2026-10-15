import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	getImageAlt,
	normalizeImageAlts,
} from '../src/shared/lib/media/image-alt.ts';

test('prefers authored descriptions and normalizes whitespace', () => {
	assert.equal(
		getImageAlt('  Девушка\nу океана  ', 'Пляжный портрет'),
		'Девушка у океана',
	);
	assert.equal(
		getImageAlt(null, '', 'Рекламный постер для товара'),
		'Рекламный постер для товара',
	);
	assert.equal(getImageAlt('Портрет 2026'), 'Портрет 2026');
});

test('replaces filenames, upload IDs and generic media labels with context', () => {
	for (const title of [
		'Image 16541',
		'Иллюстрация к статье',
		'IMG_20261015_120000',
		'DSC-1234',
		'Изображение',
		'Промпт',
		'Chat GPT Image 15 Июл. 2026 Г., 11 05 36.png',
		'photo.jpg',
		'Mosaic Viewport.jpg',
		'25388fe7-fbec-4e40-b294-51e4138360f0',
		'ab12cd34ef56ab12cd34ef56ab12',
		'2026-10-15_120000',
		'https://cdn.example.com/photo.webp',
	])
		assert.equal(getImageAlt(title, 'Портрет у окна'), 'Портрет у окна', title);
});

test('uses section headings and figure captions for WYSIWYG images', () => {
	const html =
		'<h2>Настройки камеры</h2><img src="one"><figure><img src="two" alt=""><figcaption>Выбор соотношения сторон</figcaption></figure>';
	assert.equal(
		normalizeImageAlts(html, 'Гайд по видео'),
		'<h2>Настройки камеры</h2><img src="one" alt="Настройки камеры"><figure><img src="two" alt="Выбор соотношения сторон"><figcaption>Выбор соотношения сторон</figcaption></figure>',
	);
});

test('preserves useful alternatives and prefers image title to a generic heading', () => {
	const html =
		'<img src="one" alt="Красная роза"><img title="Два варианта освещения" src="two" alt="image 1">';
	assert.equal(
		normalizeImageAlts(html, 'Фото'),
		'<img src="one" alt="Красная роза"><img title="Два варианта освещения" src="two" alt="Два варианта освещения">',
	);
});

test('keeps decorative images silent, including hidden ancestors', () => {
	const html =
		'<div aria-hidden="true"><img src="decoration"></div><img role="presentation" src="border"><img src="content">';
	assert.equal(
		normalizeImageAlts(html, 'Схема процесса'),
		'<div aria-hidden="true"><img src="decoration" alt=""></div><img role="presentation" src="border" alt=""><img src="content" alt="Схема процесса">',
	);
});

test('handles uppercase, bare and unquoted attributes without duplicates', () => {
	const html = '<IMG ALT SRC="one"><img alt=IMG_123 src=two><img src="three"/>';
	assert.equal(
		normalizeImageAlts(html, 'Ночной портрет'),
		'<IMG alt="Ночной портрет" SRC="one"><img alt="Ночной портрет" src=two><img src="three" alt="Ночной портрет"/>',
	);
});

test('escapes context and decodes caption entities without introducing markup', () => {
	assert.equal(
		normalizeImageAlts('<img src="one">', 'Схема "А" < Б & В'),
		'<img src="one" alt="Схема &quot;А&quot; &lt; Б &amp; В">',
	);
	assert.equal(
		normalizeImageAlts(
			'<figure><img src="one"><figcaption>Режим &quot;А&quot; &#38; Б &#x1F4F7;</figcaption></figure>',
		),
		'<figure><img src="one" alt="Режим &quot;А&quot; &amp; Б 📷"><figcaption>Режим &quot;А&quot; &#38; Б &#x1F4F7;</figcaption></figure>',
	);
});

test('ignores code examples, comments and scripts; handles greater-than in attributes', () => {
	const html =
		'<!-- <img src="comment"> --><pre><code>&lt;img&gt;</code></pre><script>const sample = "<img>";</script><img title="А > Б" src="real">';
	assert.equal(
		normalizeImageAlts(html, 'Гайд'),
		html.replace('src="real">', 'src="real" alt="А &gt; Б">'),
	);
	assert.equal(
		normalizeImageAlts('<p>Без изображений</p>'),
		'<p>Без изображений</p>',
	);
});

test('normalization is idempotent', () => {
	const html =
		'<h2>Настройки</h2><img src="one"><img src="two" alt="image 1"><img src="three" role="none">';
	const normalized = normalizeImageAlts(html, 'Гайд');
	assert.equal(normalizeImageAlts(normalized, 'Гайд'), normalized);
});

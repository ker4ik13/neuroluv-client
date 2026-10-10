import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { numberInstructionSteps } from '../src/shared/lib/content/number-instruction-steps.ts';
import { resolveContentActionVariant } from '../src/shared/ui/content-action-button/variant.ts';

test('instruction numbering ignores warnings without mutating CMS data', () => {
	const steps = [
		{ id: 1 },
		{ id: 2, isWarning: true },
		{ id: 3, isWarning: false },
		{ id: 4 },
	];
	const before = structuredClone(steps);
	assert.deepEqual(
		numberInstructionSteps(steps).map((item) => item.number),
		[1, null, 2, 3],
	);
	assert.deepEqual(steps, before);
	assert.deepEqual(numberInstructionSteps([]), []);
	assert.deepEqual(
		numberInstructionSteps(steps).map((item) => item.number),
		[1, null, 2, 3],
	);
});

test('all CMS button variants map to the shared design system', () => {
	assert.equal(resolveContentActionVariant('primary'), 'primary');
	assert.equal(resolveContentActionVariant('secondary'), 'secondary');
	assert.equal(resolveContentActionVariant('outline'), 'ghost');
});

test('material body and both sidebar readers reuse the same CTA component', () => {
	for (const path of [
		'../src/shared/ui/content-blocks/ContentBlocks.tsx',
		'../src/widgets/prompt-detail/ui/PromptDetailPage.tsx',
		'../src/widgets/content-detail/ui/ContentDetailPage.tsx',
	]) {
		const source = readFileSync(new URL(path, import.meta.url), 'utf8');
		assert.ok(source.includes('<ContentCta'));
	}
});

test('paid prompt protection and CMS links survive the presentation changes', () => {
	const prompt = readFileSync(
		new URL(
			'../src/widgets/prompt-detail/ui/PromptDetailPage.tsx',
			import.meta.url,
		),
		'utf8',
	);
	assert.match(prompt, /!item\.isPaid\s*&&/);
	assert.match(prompt, /item\.isPaid\s*\?\s*''\s*:\s*item\.promptText/);
	const action = readFileSync(
		new URL(
			'../src/shared/ui/content-action-button/ContentActionButton.tsx',
			import.meta.url,
		),
		'utf8',
	);
	assert.ok(action.includes('href={button.href}'));
	assert.ok(action.includes('target={button.target}'));
	assert.ok(action.includes('<AppIcon icon={button.icon}'));
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatMoney } from '../src/widgets/ai-pages/model/format.ts';
import { getStudioPreview } from '../src/widgets/ai-pages/model/studio-preview.ts';
import {
	getPlansForPeriod,
	getRecommendedPlan,
} from '../src/widgets/ai-pages/model/studio-pricing.ts';

test('chooses a middle paid plan without changing prices or mutating the catalog', () => {
	const plans = [290, 690, 1490, 3990, 7990, 14990]
		.map((price, i) => ({ id: String(i), amountMinor: price * 100 }))
		.reverse();
	assert.equal(getRecommendedPlan(plans).amountMinor, 149000);
	assert.equal(plans[0].amountMinor, 1499000);
	assert.equal(getRecommendedPlan([]), null);
	assert.equal(getRecommendedPlan([{ amountMinor: 0 }]), null);
});
test('compares only plans from the selected billing period', () => {
	const plans = [
		{ id: 'annual', interval: 'year', amountMinor: 745200 },
		{ id: 'monthly', interval: 'month', amountMinor: 69000 },
	];
	assert.deepEqual(getPlansForPeriod(plans, 'month'), [plans[1]]);
});

test('formats whole-ruble prices cleanly without hiding actual kopecks', () => {
	assert.match(formatMoney(149000, 'RUB'), /1\s490\s₽/);
	assert.match(formatMoney(149050, 'RUB'), /1\s490,50\s₽/);
});
test('keeps image composition and Directus source, without touching private API previews', () => {
	const url =
		'https://admin.neuroluv.ru/assets/file?width=720&height=864&fit=cover&format=webp';
	const result = getStudioPreview({
		imageUrl: url,
		media: [{ url, width: 1000, height: 1500 }],
	});
	assert.equal(new URL(result.url).origin, 'https://admin.neuroluv.ru');
	assert.equal(new URL(result.url).searchParams.has('height'), false);
	assert.equal(Number(result.aspectRatio), 2 / 3);
	assert.deepEqual(getStudioPreview({ imageUrl: '/v1/media/outputs/id' }), {
		url: '/v1/media/outputs/id',
		aspectRatio: undefined,
	});
	assert.equal(getStudioPreview({ imageUrl: null }), null);
});

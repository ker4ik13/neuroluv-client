import assert from 'node:assert/strict';
import test from 'node:test';
import { getMasonryLayout } from '../src/shared/ui/masonry/layout.ts';

test('new cards continue the shortest column without moving the previous page', () => {
	const first = [330, 500, 350, 240, 440, 310];
	for (const count of [1, 2, 3]) {
		const previous = getMasonryLayout(first, count, 280, 20);
		const appended = getMasonryLayout(
			[...first, 390, 560, 240],
			count,
			280,
			20,
		);
		assert.deepEqual(
			appended.positions.slice(0, first.length),
			previous.positions,
		);
		assert.ok(appended.height > previous.height);
	}
	assert.deepEqual(getMasonryLayout(first, 3, 280, 20).positions[3], {
		left: 0,
		top: 350,
	});
});

test('cards in the same column never overlap and preserve a consistent gutter', () => {
	const heights = Array.from(
		{ length: 90 },
		(_, index) => 190 + (index % 7) * 33.125,
	);
	for (const columns of [1, 2, 3]) {
		const result = getMasonryLayout(heights, columns, 270, 14);
		const bottoms = new Map();
		result.positions.forEach((position, index) => {
			if (bottoms.has(position.left))
				assert.equal(position.top - bottoms.get(position.left), 14);
			bottoms.set(position.left, position.top + heights[index]);
		});
		assert.equal(result.height, Math.max(...bottoms.values()));
	}
	assert.deepEqual(getMasonryLayout([], 3, 270, 14), {
		positions: [],
		height: 0,
	});
});

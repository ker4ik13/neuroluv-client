export function getMasonryLayout(
	heights: readonly number[],
	columns: number,
	columnWidth: number,
	gap: number,
) {
	const count = Math.max(1, Math.floor(columns) || 1);
	const bottoms = Array<number>(count).fill(0);
	const positions = heights.map((height) => {
		const column = bottoms.indexOf(Math.min(...bottoms));
		const position = {
			left: column * (columnWidth + gap),
			top: bottoms[column],
		};
		bottoms[column] += Math.max(0, height) + gap;
		return position;
	});
	return { positions, height: heights.length ? Math.max(...bottoms) - gap : 0 };
}

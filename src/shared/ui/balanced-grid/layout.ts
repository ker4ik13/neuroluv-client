/** Keep rows evenly filled, including the last row, without changing item order. */
export function getBalancedRowSizes(count: number, maxColumns = 4): number[] {
	if (!Number.isInteger(count) || count <= 0) return [];
	const columns = Math.max(1, Math.min(4, Math.floor(maxColumns) || 1));
	const rows = Math.ceil(count / columns);
	const base = Math.floor(count / rows);
	const extra = count % rows;
	return Array.from({ length: rows }, (_, row) => base + (row < extra ? 1 : 0));
}

export function getBalancedGridSpans(count: number, maxColumns = 4): number[] {
	return getBalancedRowSizes(count, maxColumns).flatMap((size) =>
		Array.from({ length: size }, () => 12 / size),
	);
}

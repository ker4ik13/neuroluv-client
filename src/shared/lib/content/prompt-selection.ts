export const PROMPT_GALLERY_SORT_MODES = [
	'default',
	'newest',
	'oldest',
	'popular',
	'title',
] as const;
export type PromptGallerySortMode = (typeof PROMPT_GALLERY_SORT_MODES)[number];

type SortablePrompt = {
	id: number;
	title: string;
	viewsCount: number;
	publishedAt?: string | null;
};

export function getPromptSelectionSort(
	mode: PromptGallerySortMode | undefined,
	oldestFirst = false,
): string {
	switch (mode) {
		case 'newest':
			return '-published_at,-id';
		case 'oldest':
			return 'published_at,id';
		case 'popular':
			return '-views_count,-id';
		case 'title':
			return 'title,id';
		default:
			return oldestFirst ? 'published_at,id' : '-published_at,-id';
	}
}

export function sortManualPromptCards<T extends SortablePrompt>(
	prompts: readonly T[],
	mode: PromptGallerySortMode | undefined,
): T[] {
	const result = [...prompts];
	if (!mode || mode === 'default') return result;
	return result.sort((a, b) => {
		if (mode === 'title')
			return (
				a.title.localeCompare(b.title, 'ru', { numeric: true }) || a.id - b.id
			);
		if (mode === 'popular') return b.viewsCount - a.viewsCount || b.id - a.id;
		const first = a.publishedAt ? Date.parse(a.publishedAt) : NaN;
		const second = b.publishedAt ? Date.parse(b.publishedAt) : NaN;
		if (!Number.isFinite(first) || !Number.isFinite(second)) {
			if (Number.isFinite(first)) return -1;
			if (Number.isFinite(second)) return 1;
			return 0;
		}
		return mode === 'oldest'
			? first - second || a.id - b.id
			: second - first || b.id - a.id;
	});
}

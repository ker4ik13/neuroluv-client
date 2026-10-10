import type { AiPromptCard } from '@/shared/api/ai';

export function getStudioPreview(
	prompt: AiPromptCard,
): { url: string; aspectRatio?: string } | null {
	if (!prompt.imageUrl) return null;
	const image = prompt.media?.find(
		(media) => media.url.split('?')[0] === prompt.imageUrl?.split('?')[0],
	);
	const aspectRatio =
		image?.width && image.height && image.width > 0 && image.height > 0
			? String(Math.max(0.5, Math.min(1.8, image.width / image.height)))
			: undefined;
	try {
		const url = new URL(prompt.imageUrl);
		if (url.protocol === 'https:' && url.pathname.startsWith('/assets/')) {
			// A width-only Directus transform preserves the source composition in the masonry gallery.
			url.searchParams.delete('height');
			url.searchParams.delete('fit');
			return { url: url.toString(), aspectRatio };
		}
	} catch {
		// Relative catalog previews remain valid; only absolute Directus assets are transformed.
	}
	return { url: prompt.imageUrl, aspectRatio };
}

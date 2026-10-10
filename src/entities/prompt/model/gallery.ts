import type { PromptImage } from './types';

export function getPromptPreviewRatio(
	image: Pick<PromptImage, 'width' | 'height'> | null | undefined,
	format?: string | null,
): number {
	if (
		!image?.width ||
		!image.height ||
		!Number.isFinite(image.width) ||
		!Number.isFinite(image.height) ||
		image.width <= 0 ||
		image.height <= 0
	) {
		// Directus video metadata often has no dimensions; use its actual frame format.
		const match = format
			?.trim()
			.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
		const ratio = match ? Number(match[1]) / Number(match[2]) : NaN;
		return Number.isFinite(ratio) && ratio > 0
			? Math.max(0.72, Math.min(1.5, ratio))
			: 0.8;
	}
	return Math.max(0.72, Math.min(1.5, image.width / image.height));
}

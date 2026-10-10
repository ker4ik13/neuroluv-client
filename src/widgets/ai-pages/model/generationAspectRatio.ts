import type { AiPublicModel } from '@/shared/api/ai/contracts';

export function resolveGenerationAspectRatio(
	model: Pick<AiPublicModel, 'slug' | 'capabilities'>,
	videoMode: string,
	selected: string,
): { values: string[]; value: string; frameLimited: boolean } {
	const { capabilities } = model;
	const mode =
		capabilities.videoModes?.find((entry) => entry.code === videoMode) ||
		capabilities.videoModes?.[0];
	const usesFrames = mode
		? mode.imageInput === 'frame_images' || mode.code === 'image_to_video'
		: videoMode === 'image_to_video';
	const frameLimited = model.slug === 'kie-seedance-2-5' && usesFrames;
	const values = frameLimited ? ['adaptive'] : capabilities.aspectRatios || [];
	const value = values.includes(selected) ? selected : values[0] || '';
	return { values, value, frameLimited };
}

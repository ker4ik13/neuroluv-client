import type { AiModelCapabilities } from '@/shared/api/ai/contracts';

export function resolveGenerationResolution(
	capabilities: AiModelCapabilities,
	hasReference: boolean,
	selected: string,
): { values: string[]; value: string; referenceLimited: boolean } {
	const all = capabilities.resolutions || [];
	const referenceValues = capabilities.referenceResolutions?.filter((value) =>
		all.includes(value),
	);
	const values =
		hasReference && referenceValues?.length ? referenceValues : all;
	const referenceLimited = hasReference && values.length < all.length;
	const value = values.includes(selected)
		? selected
		: referenceLimited && values.includes('2K')
			? '2K'
			: values[0] || '';
	return { values, value, referenceLimited };
}

import type { AiPromptCard } from '@/shared/api/ai';

// Published catalog entries, never stock images. Removed entries are replaced by recent prompts.
const FEATURED_SLUGS = [
	'reklamnyy-poster-dlya-tovara-v-zhurnalnom-stile',
	'plyazhnaya-semka-na-zakate-spinoy-k-okeanu-895',
	'letniy-reklamnyy-poster-dlya-marketpleysa',
	'avtomobil-s-raskraskoy-1',
	'kartochka-tovara-dlya-marketpleysa-po-foto',
	'syuzhetnye-prompty-nochnoy-portret-889',
] as const;

export function selectStudioExamples(prompts: AiPromptCard[]): AiPromptCard[] {
	const available = prompts.filter(
		(prompt) =>
			!prompt.seoNoindex &&
			Boolean(prompt.imageUrl) &&
			(prompt.modality === 'image' || prompt.modality === 'video'),
	);
	const bySlug = new Map(available.map((prompt) => [prompt.slug, prompt]));
	const featured = FEATURED_SLUGS.flatMap((slug) => {
		const prompt = bySlug.get(slug);
		return prompt ? [prompt] : [];
	});
	const selected = new Set(featured.map((prompt) => prompt.id));
	return [
		...featured,
		...available.filter((prompt) => !selected.has(prompt.id)),
	].slice(0, 6);
}

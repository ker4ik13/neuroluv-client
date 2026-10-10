import type { PromptCardData } from '@/entities/prompt';
import type {
	AiPromptCard,
	AiPromptMedia,
	AiPublicModel,
} from '@/shared/api/ai';

const MODALITY_LABELS: Record<string, [string, string]> = {
	image: ['Фото', 'Image'],
	video: ['Видео', 'Video'],
	text: ['Текст', 'Text'],
};

export function toStudioPromptCard(
	prompt: AiPromptCard,
	model: AiPublicModel | null,
	english: boolean,
): PromptCardData {
	const media = (item: AiPromptMedia) => ({
		...item,
		title: item.title || prompt.title,
		type: item.type || null,
		width: item.width || null,
		height: item.height || null,
	});
	return {
		id: prompt.id,
		title: prompt.title,
		href: `/ai/prompts/${prompt.slug}`,
		image: prompt.media?.length
			? null
			: prompt.imageUrl
				? media({ id: 'legacy', url: prompt.imageUrl })
				: null,
		images: (prompt.media || []).map(media),
		autoplay: false,
		format: prompt.aspectRatio || '',
		difficultyLabel: english
			? { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[
					prompt.difficulty || ''
				] || ''
			: prompt.difficultyLabel || '',
		contentKind: {
			title: MODALITY_LABELS[prompt.modality]?.[english ? 1 : 0] || 'AI',
		},
		neuralNetwork: prompt.modelNames[0]
			? {
					title: prompt.modelNames[0],
					logo: model?.logoUrl
						? media({ id: model.id, url: model.logoUrl })
						: null,
				}
			: null,
	};
}

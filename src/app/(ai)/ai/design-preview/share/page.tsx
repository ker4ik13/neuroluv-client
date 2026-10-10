import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAiPublicPromptCatalog } from '@/shared/api/ai/public';
import { SharePage } from '@/widgets/ai-pages';

export const metadata: Metadata = {
	title: 'Предпросмотр публичной работы',
	robots: { index: false, follow: false },
};

// A local visual fixture. It never creates a share or exposes a private work.
export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{ hidden?: string; expired?: string }>;
}) {
	if (process.env.NODE_ENV !== 'development') notFound();
	const parameters = await searchParams;
	const catalog = await getAiPublicPromptCatalog();
	const example = catalog?.data.find(
		(item) => item.modality === 'image' && item.imageUrl,
	);
	const included = parameters.hidden !== '1';
	return (
		<SharePage
			slug='design-preview-not-a-real-share'
			initialShare={{
				slug: 'design-preview-not-a-real-share',
				title: 'Предметная съёмка с естественным светом',
				modality: 'image',
				modelName: example?.modelNames[0] || 'Нейролюб Studio',
				author: { name: 'Предпросмотр дизайна' },
				createdAt: '2026-10-09T10:00:00Z',
				previewUrl: example?.imageUrl,
				prompt: included
					? 'Предметная съёмка на светлом фоне. Мягкий боковой свет, естественные тени, лаконичная композиция.'
					: null,
				disclosure: {
					promptIncluded: included,
					negativePromptIncluded: false,
					sourceReferenceIncluded: false,
				},
				remixSupported: false,
				expired: parameters.expired === '1',
			}}
		/>
	);
}

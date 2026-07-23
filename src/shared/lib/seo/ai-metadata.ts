import 'server-only';

import type { Metadata } from 'next';

import { getAiPageMetadata } from '@/shared/api/ai/public';

type AiMetadataFallback = {
	title: string;
	description: string;
};

export async function buildAiPageMetadata(
	path: string,
	fallback: AiMetadataFallback,
	options: { indexable?: boolean } = {},
): Promise<Metadata> {
	const page = await getAiPageMetadata(path);
	const title = page?.seoTitle || page?.title || fallback.title;
	const description = page?.seoDescription || fallback.description;
	const index = options.indexable === true && page?.noindex !== true;

	return {
		title,
		description,
		alternates: { canonical: path },
		robots: { index, follow: index },
		openGraph: {
			title,
			description,
			url: path,
			type: 'website',
			...(page?.imageUrl ? { images: [{ url: page.imageUrl }] } : {}),
		},
	};
}

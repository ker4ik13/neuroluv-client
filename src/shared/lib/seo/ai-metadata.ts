import 'server-only';

import type { Metadata } from 'next';

import { getAiPageMetadata } from '@/shared/api/ai/public';
import { resolveSeoTemplate } from '@/shared/lib/seo/metadata';

type AiMetadataFallback = {
	title: string;
	description: string;
};

export async function buildAiPageMetadata(
	path: string,
	fallback: AiMetadataFallback,
	options: {
		absoluteTitle?: boolean;
		canonicalPath?: string;
		indexable?: boolean;
	} = {},
): Promise<Metadata> {
	const page = await getAiPageMetadata(path);
	const variables = {
		SITE_NAME: page?.siteName || 'Нейролюб Studio',
	};
	const title = resolveSeoTemplate(
		page?.seoTitle || page?.title || fallback.title,
		variables,
	);
	const description = resolveSeoTemplate(
		page?.seoDescription || fallback.description,
		variables,
	);
	const index = options.indexable === true && page?.noindex !== true;
	const canonicalPath = options.canonicalPath || path;

	return {
		title: options.absoluteTitle ? { absolute: title } : title,
		description,
		alternates: { canonical: canonicalPath },
		robots: { index, follow: index },
		openGraph: {
			title,
			description,
			locale: 'ru_RU',
			siteName: variables.SITE_NAME,
			url: canonicalPath,
			type: 'website',
			...(page?.imageUrl ? { images: [{ url: page.imageUrl }] } : {}),
		},
		twitter: {
			card: page?.imageUrl ? 'summary_large_image' : 'summary',
			title,
			description,
			...(page?.imageUrl ? { images: [page.imageUrl] } : {}),
		},
	};
}

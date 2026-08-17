import type { Metadata } from 'next';
import 'server-only';
import { getAiPageMetadata } from '@/shared/api/ai/public';
import { getPageSeoByPath, getSiteSeo } from '@/shared/api/directus/seo';
import {
	buildPageMetadata,
	resolveSeoTemplate,
} from '@/shared/lib/seo/metadata';

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
	const [contentPageSeo, page, siteSeo] = await Promise.all([
		getPageSeoByPath(path),
		getAiPageMetadata(path),
		getSiteSeo(),
	]);

	if (contentPageSeo) {
		return buildPageMetadata(contentPageSeo, {
			canonicalPath: options.canonicalPath || path,
			fallbackDescription: fallback.description,
			fallbackImage: siteSeo.defaultOgImage,
			fallbackTitle: fallback.title,
			noindex: options.indexable !== true,
		});
	}

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
	const imageUrl = page?.imageUrl || siteSeo.defaultOgImage?.url;

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
			...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
		},
		twitter: {
			card: imageUrl ? 'summary_large_image' : 'summary',
			title,
			description,
			...(imageUrl ? { images: [imageUrl] } : {}),
		},
	};
}

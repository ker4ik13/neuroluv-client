import type { Metadata } from 'next';
import type { PageSeo, SeoAsset, SiteSeo } from '@/entities/seo';
import {
	GOOGLE_SITE_VERIFICATION,
	SITE_URL,
	YANDEX_SITE_VERIFICATION,
} from '@/shared/config/site';

export type SeoTemplateVariables = Record<
	string,
	number | string | null | undefined
>;

type BuildPageMetadataOptions = {
	author?: string | null;
	canonicalPath?: string;
	canonicalUrl?: string | null;
	fallbackDescription?: string | null;
	fallbackImage?: SeoAsset | null;
	fallbackTitle?: string | null;
	noindex?: boolean;
	openGraphType?: 'article' | 'website';
	publishedTime?: string | null;
	variables?: SeoTemplateVariables;
};

const DEFAULT_VARIABLES: SeoTemplateVariables = {
	SITE_NAME: 'Нейролюб',
};

const STATIC_FAVICON_URL = '/favicon.svg';
const STATIC_FAVICON_TYPE = 'image/svg+xml';

export function buildSiteMetadata(seo: SiteSeo): Metadata {
	return {
		metadataBase: new URL(SITE_URL),
		title: {
			default: seo.defaultMetaTitle,
			template: `%s | ${seo.shortName}`,
		},
		description: seo.defaultMetaDescription,
		verification: buildVerification(),
		icons: buildIcons(),
		manifest: '/manifest.webmanifest',
		openGraph: {
			title: seo.defaultMetaTitle,
			description: seo.defaultMetaDescription,
			siteName: seo.siteName,
			images: buildOpenGraphImages(seo.defaultOgImage),
			locale: 'ru_RU',
			type: 'website',
		},
		twitter: {
			card: 'summary',
			title: seo.defaultMetaTitle,
			description: seo.defaultMetaDescription,
			images: buildTwitterImages(seo.defaultOgImage),
		},
	};
}

function buildVerification(): Metadata['verification'] {
	if (!GOOGLE_SITE_VERIFICATION && !YANDEX_SITE_VERIFICATION) {
		return undefined;
	}

	return {
		google: GOOGLE_SITE_VERIFICATION || undefined,
		yandex: YANDEX_SITE_VERIFICATION || undefined,
	};
}

export function buildPageMetadata(
	seo: PageSeo | null,
	options: BuildPageMetadataOptions = {},
): Metadata {
	const variables = normalizeVariables({
		...DEFAULT_VARIABLES,
		...options.variables,
		AUTHOR: options.author,
	});
	const title = resolveSeoTemplate(
		seo?.title || options.fallbackTitle || '',
		variables,
	);
	const description = resolveSeoTemplate(
		seo?.description || options.fallbackDescription || '',
		variables,
	);
	const ogTitle = resolveSeoTemplate(seo?.ogTitle || title, variables);
	const ogDescription = resolveSeoTemplate(
		seo?.ogDescription || description,
		variables,
	);
	const image = seo?.ogImage || options.fallbackImage || null;
	const canonical = resolveCanonicalUrl(
		seo?.canonicalUrl || options.canonicalUrl || options.canonicalPath,
		variables,
	);
	const author = resolveSeoTemplate(options.author || '', variables);

	return {
		title: title ? { absolute: title } : undefined,
		description: description || undefined,
		authors: author ? [{ name: author }] : undefined,
		keywords: seo?.keywords.map((keyword) =>
			resolveSeoTemplate(keyword, variables),
		),
		robots: options.noindex
			? {
					index: false,
					follow: true,
				}
			: seo
				? {
						index: !seo.noindex,
						follow: !seo.nofollow,
				}
			: undefined,
		alternates: canonical
			? {
					canonical,
				}
			: undefined,
		openGraph: {
			title: ogTitle || undefined,
			description: ogDescription || undefined,
			images: buildOpenGraphImages(image),
			locale: 'ru_RU',
			type: options.openGraphType || 'website',
			url: canonical,
			...(author ? { authors: [author] } : {}),
			...(options.publishedTime
				? { publishedTime: options.publishedTime }
				: {}),
		},
		twitter: {
			card: 'summary',
			title: ogTitle || title || undefined,
			description: ogDescription || description || undefined,
			images: buildTwitterImages(image),
		},
	};
}

function buildIcons(): Metadata['icons'] {
	return {
		icon: [
			{
				url: STATIC_FAVICON_URL,
				type: STATIC_FAVICON_TYPE,
			},
		],
		shortcut: [
			{
				url: STATIC_FAVICON_URL,
				type: STATIC_FAVICON_TYPE,
			},
		],
	};
}

function buildOpenGraphImages(
	image: SeoAsset | null,
): NonNullable<NonNullable<Metadata['openGraph']>['images']> {
	if (!image) {
		return [];
	}

	return [
		{
			url: image.url,
			alt: image.title,
			width: image.width || undefined,
			height: image.height || undefined,
			type: image.type || undefined,
		},
	];
}

function buildTwitterImages(image: SeoAsset | null): string[] | undefined {
	if (!image) {
		return undefined;
	}

	return [image.url];
}

export function resolveSeoTemplate(
	value: string,
	variables: SeoTemplateVariables = DEFAULT_VARIABLES,
): string {
	if (!value) {
		return '';
	}

	const normalizedVariables = normalizeVariables({
		...DEFAULT_VARIABLES,
		...variables,
	});

	return value.replace(/\{([A-Z0-9_]+)\}/gi, (match, key: string) => {
		const variable = normalizedVariables[key.toUpperCase()];

		return variable ?? match;
	});
}

function normalizeVariables(
	variables: SeoTemplateVariables,
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(variables)
			.filter(([, value]) => value !== null && value !== undefined)
			.map(([key, value]) => [key.toUpperCase(), String(value)]),
	);
}

function resolveCanonicalUrl(
	value: string | null | undefined,
	variables: Record<string, string>,
): string | undefined {
	if (!value) {
		return undefined;
	}

	const resolved = resolveSeoTemplate(value, variables);

	if (/^https?:\/\//i.test(resolved)) {
		return resolved;
	}

	const path = resolved.startsWith('/') ? resolved : `/${resolved}`;

	return `${SITE_URL}${path}`;
}

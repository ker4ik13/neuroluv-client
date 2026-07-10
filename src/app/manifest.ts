import type { MetadataRoute } from 'next';

import { getSiteSeo } from '@/shared/api/directus/seo';
import { SITE_URL } from '@/shared/config/site';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
	const seo = await getSiteSeo();

	return {
		name: seo.siteName,
		short_name: seo.shortName,
		description: seo.siteDescription || seo.defaultMetaDescription,
		start_url: '/',
		scope: '/',
		display: 'standalone',
		background_color: '#eef2f5',
		theme_color: '#122b3a',
		lang: 'ru',
		orientation: 'portrait',
		id: SITE_URL,
		icons: [
			{
				src: '/web-app-manifest-192x192.png',
				sizes: '192x192',
				type: 'image/png',
				purpose: 'any',
			},
			{
				src: '/web-app-manifest-512x512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'any',
			},
			{
				src: '/favicon.svg',
				sizes: 'any',
				type: 'image/svg+xml',
				purpose: 'any',
			},
		],
	};
}

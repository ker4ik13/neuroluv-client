import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/shared/config/site';

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: 'Нейролюб Studio',
		short_name: 'Нейролюб',
		description:
			'Создавайте тексты, изображения и видео с нейросетями в Нейролюб Studio.',
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

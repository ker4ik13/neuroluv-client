import type { NextConfig } from 'next';

const directusUrl = new URL(
	process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://dev.cms.neuroluv.ru',
);

const nextConfig: NextConfig = {
	allowedDevOrigins: ['144.31.221.28'],
	poweredByHeader: false,
	async rewrites() {
		if (process.env.NODE_ENV !== 'development') return [];
		const apiOrigin = (
			process.env.NEUROLUV_DEV_API_ORIGIN || 'http://127.0.0.1:4000'
		).replace(/\/+$/, '');
		return [
			{
				source: '/v1/:path*',
				destination: `${apiOrigin}/v1/:path*`,
			},
		];
	},
	async redirects() {
		return [
			{
				source: '/ai/create/photo/gpt-image-2',
				destination: '/ai/create/photo/gpt-image',
				permanent: true,
			},
			{
				source: '/ai/create',
				destination: '/ai',
				permanent: true,
			},
			{
				source: '/privacy',
				destination: '/legal/personal-data-policy',
				permanent: true,
			},
		];
	},
	images: {
		remotePatterns: [
			{
				protocol: directusUrl.protocol.replace(':', '') as 'http' | 'https',
				hostname: directusUrl.hostname,
				port: directusUrl.port,
				pathname: '/assets/**',
			},
		],
	},
};

export default nextConfig;

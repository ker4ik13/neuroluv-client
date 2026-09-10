import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/shared/api/directus/sitemap';
import { SITE_URL } from '@/shared/config/site';

export const revalidate = 60;
export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const siteEntries = await getSitemapEntries();
	const aiEntries: MetadataRoute.Sitemap = [
		{
			url: `${SITE_URL}/ai`,
			changeFrequency: 'weekly' as const,
			priority: 0.9,
		},
		{
			url: `${SITE_URL}/ai/tools/photo-to-prompt`,
			changeFrequency: 'monthly' as const,
			priority: 0.8,
		},
	];

	return [
		...new Map(
			[...siteEntries, ...aiEntries].map((entry) => [entry.url, entry]),
		).values(),
	];
}

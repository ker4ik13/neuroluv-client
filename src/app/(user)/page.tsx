import type { Metadata } from 'next';
import { getAiPublicPromptCatalog } from '@/shared/api/ai/public';
import { getHomePage } from '@/shared/api/directus/pages';
import { getPageSeoBySlug } from '@/shared/api/directus/seo';
import { buildPageJsonLd } from '@/shared/lib/seo/json-ld';
import { buildPageMetadata } from '@/shared/lib/seo/metadata';
import { JsonLd } from '@/shared/ui/json-ld';
import { selectStudioExamples } from '@/widgets/ai-pages';
import { PageBlocks } from '@/widgets/page-blocks';

export async function generateMetadata(): Promise<Metadata> {
	const seo = await getPageSeoBySlug('/');

	return buildPageMetadata(seo, {
		canonicalPath: '/',
		fallbackTitle: '{SITE_NAME}',
		variables: {
			TITLE: 'Главная',
			URL: '/',
		},
	});
}

export default async function Home() {
	const [page, catalog] = await Promise.all([
		getHomePage(),
		getAiPublicPromptCatalog(24).catch((error: unknown) => {
			console.warn('[Site home] Public examples unavailable', error);
			return null;
		}),
	]);

	if (!page) {
		return null;
	}

	return (
		<>
			<JsonLd
				data={buildPageJsonLd(page, {
					title: 'Главная',
					url: '/',
				})}
			/>
			<PageBlocks
				blocks={page.blocks}
				heroExamples={selectStudioExamples(catalog?.data ?? [])
					.filter((prompt) => prompt.imageUrl)
					.slice(0, 4)
					.map((prompt) => ({
						id: prompt.id,
						href: `/prompts/${prompt.slug}`,
						url: prompt.imageUrl!,
						alt: prompt.title,
					}))}
			/>
		</>
	);
}

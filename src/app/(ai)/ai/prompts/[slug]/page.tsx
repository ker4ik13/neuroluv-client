import type { Metadata } from 'next';
import { getAiPublicPrompt } from '@/shared/api/ai/public';
import { getSiteSeo } from '@/shared/api/directus/seo';
import { PromptDetailPage } from '@/widgets/ai-pages';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const [prompt, siteSeo] = await Promise.all([
		getAiPublicPrompt(slug),
		getSiteSeo(),
	]);
	const canonical = `/ai/prompts/${encodeURIComponent(slug)}`;
	const defaultImageUrl = siteSeo.defaultOgImage?.url;

	if (!prompt) {
		return {
			title: 'Промпт',
			openGraph: defaultImageUrl ? { images: [defaultImageUrl] } : undefined,
			twitter: defaultImageUrl
				? { card: 'summary_large_image', images: [defaultImageUrl] }
				: undefined,
			robots: { index: false, follow: false },
		};
	}

	const title = prompt.seoTitle || prompt.title;
	const description =
		prompt.seoDescription || prompt.description || prompt.excerpt || undefined;
	const imageUrl = prompt.imageUrl || defaultImageUrl;

	return {
		title,
		description,
		alternates: { canonical },
		openGraph: {
			title,
			description,
			url: canonical,
			type: 'article',
			...(imageUrl ? { images: [imageUrl] } : {}),
		},
		twitter: {
			card: imageUrl ? 'summary_large_image' : 'summary',
			title,
			description,
			...(imageUrl ? { images: [imageUrl] } : {}),
		},
		robots: { index: false, follow: false },
	};
}

export default async function Page({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	return <PromptDetailPage slug={slug} />;
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAiPublicPrompt } from '@/shared/api/ai/public';
import { getSiteSeo } from '@/shared/api/directus/seo';
import { resolveSeoTemplate } from '@/shared/lib/seo/metadata';
import { PromptDetailPage } from '@/widgets/ai-pages';

export const revalidate = 60;

export async function generateStaticParams() {
	return [];
}

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

	const variables = { SITE_NAME: siteSeo.siteName };
	const title = resolveSeoTemplate(prompt.seoTitle || prompt.title, variables);
	const description =
		resolveSeoTemplate(
			prompt.seoDescription || prompt.description || prompt.excerpt || '',
			variables,
		) || undefined;
	const imageUrl = prompt.imageUrl || defaultImageUrl;

	return {
		title: { absolute: title },
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
	const prompt = await getAiPublicPrompt(slug);
	if (!prompt) notFound();

	return <PromptDetailPage initialPrompt={prompt} slug={slug} />;
}

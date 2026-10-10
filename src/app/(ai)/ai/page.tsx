import type { Metadata } from 'next';
import { headers } from 'next/headers';
import {
	getAiPublicPlans,
	getAiPublicPromptCatalog,
} from '@/shared/api/ai/public';
import { getPageBySlug } from '@/shared/api/directus/pages';
import { SITE_URL } from '@/shared/config/site';
import { buildAiPageMetadata } from '@/shared/lib/seo/ai-metadata';
import { buildBreadcrumbJsonLd } from '@/shared/lib/seo/json-ld';
import { JsonLd } from '@/shared/ui/json-ld';
import { selectStudioExamples, StudioLandingPage } from '@/widgets/ai-pages';
import { PageBlocks } from '@/widgets/page-blocks';
import styles from './page.module.scss';

export function generateMetadata(): Promise<Metadata> {
	return buildAiPageMetadata(
		'/ai',
		{
			title: 'Нейросети онлайн в одном месте — AI-агрегатор | Нейролюб Studio',
			description:
				'AI-агрегатор: ChatGPT, Nano Banana, Claude, Gemini, DeepSeek и другие нейросети для текста, фото и видео. Один аккаунт для всех ИИ.',
		},
		{ absoluteTitle: true, indexable: true },
	);
}

export default async function AiPage() {
	const [nonceHeaders, page, catalog, plans] = await Promise.all([
		headers(),
		getPageBySlug('/ai'),
		getAiPublicPromptCatalog(24).catch((error: unknown) => {
			console.warn('[Studio landing] Public examples unavailable', error);
			return null;
		}),
		getAiPublicPlans().catch((error: unknown) => {
			console.warn('[Studio landing] Plans unavailable', error);
			return [];
		}),
	]);
	const nonce = nonceHeaders.get('x-nonce') || undefined;
	const hero = page?.blocks.find((block) => block.type === 'hero');
	const examples = selectStudioExamples(catalog?.data ?? []);

	return (
		<>
			<JsonLd
				data={[
					AI_LANDING_JSON_LD,
					buildBreadcrumbJsonLd([
						{ name: 'Главная', url: '/' },
						{ name: 'Нейролюб Studio', url: '/ai' },
					]),
				]}
				nonce={nonce}
			/>
			<StudioLandingPage
				examples={examples}
				plans={plans}
				firstScreen={hero ? <PageBlocks blocks={[hero]} nonce={nonce} heroExamples={examples.filter((example) => example.imageUrl).slice(0, 4).map((example) => ({ id: example.id, href: `/ai/prompts/${example.slug}`, url: example.imageUrl!, alt: example.title }))} /> : undefined}
			>
				{page?.blocks.length ? (
					<div className={styles.content}>
						<PageBlocks blocks={page.blocks.filter((block) => block.type !== 'hero')} nonce={nonce} />
					</div>
				) : null}
			</StudioLandingPage>
		</>
	);
}

const AI_LANDING_DESCRIPTION =
	'AI-агрегатор для работы с нейросетями для текста, фото и видео в одном аккаунте.';

const AI_LANDING_JSON_LD = {
	'@context': 'https://schema.org',
	'@graph': [
		{
			'@id': `${SITE_URL}/ai#webpage`,
			'@type': 'WebPage',
			description: AI_LANDING_DESCRIPTION,
			inLanguage: 'ru-RU',
			name: 'Все нейросети онлайн в одном месте',
			url: `${SITE_URL}/ai`,
		},
		{
			'@id': `${SITE_URL}/ai#application`,
			'@type': 'WebApplication',
			alternateName: 'Нейролюб Студия',
			applicationCategory: 'MultimediaApplication',
			browserRequirements: 'Современный веб-браузер',
			description: AI_LANDING_DESCRIPTION,
			featureList: [
				'Чат с текстовыми нейросетями',
				'Генерация и редактирование изображений',
				'Генерация видео по тексту и фото',
				'Каталог готовых промптов',
				'История чатов и созданных работ',
			],
			inLanguage: 'ru-RU',
			name: 'Нейролюб Studio',
			operatingSystem: 'Любая операционная система',
			url: `${SITE_URL}/ai`,
		},
	],
};

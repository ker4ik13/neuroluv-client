import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PageBlock } from '@/entities/page';
import type { PromptContentBlock, PromptImage } from '@/entities/prompt';
import {
	getHomePage,
	getPageBySlug,
	hydratePageBlocks,
} from '@/shared/api/directus/pages';
import { buttonClassName } from '@/shared/ui/button';
import { CatalogHeading } from '@/shared/ui/catalog-heading';
import { ContentBlocks } from '@/shared/ui/content-blocks';
import { PageBlocks } from '@/widgets/page-blocks';
import styles from './page.module.scss';

export const metadata: Metadata = {
	title: 'Варианты блоков — локальный предпросмотр',
	robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const families = {
	cards: 'Карточки',
	cta: 'Призывы к действию',
	gallery: 'Галерея',
	faq: 'FAQ',
	hero: 'Первый экран',
	reader: 'Блоки материалов',
} as const;

export default async function BlockDesignPreview({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	// Never expose demonstration fixtures or this route on the production site.
	if (process.env.NODE_ENV !== 'development') notFound();
	const params = await searchParams;
	const family =
		typeof params.family === 'string' && params.family in families
			? (params.family as keyof typeof families)
			: 'cards';
	const count = Math.max(
		1,
		Math.min(12, Math.trunc(Number(params.count)) || 5),
	);
	const [home, studio] = await Promise.all([
		getHomePage(),
		getPageBySlug('/ai'),
	]);
	const blocks = [...(home?.blocks || []), ...(studio?.blocks || [])];
	const tasks = blocks.find((block) => block.type === 'taskGrid');
	const gallery = blocks.find((block) => block.type === 'prompts');
	const faq = blocks.find((block) => block.type === 'faq');
	const hero = blocks.find((block) => block.type === 'hero');
	const cta = blocks.find((block) => block.type === 'miniCta');
	const examples: PageBlock[] = [];
	if (family === 'cards' && tasks?.type === 'taskGrid' && tasks.tasks.length) {
		examples.push({
			...tasks,
			title: `${tasks.title} — ${count} карточек`,
			layout: params.layout === 'compact' ? 'compact' : 'cards',
			tasks: Array.from({ length: count }, (_, index) => ({
				...tasks.tasks[index % tasks.tasks.length],
				id: index + 1,
			})),
		});
	}
	if (family === 'cta' && cta?.type === 'miniCta') {
		for (const tone of ['neutral', 'soft', 'accent', 'dark'] as const) {
			for (const layout of [
				'image_right',
				'image_left',
				'centered',
				'banner',
			] as const) {
				if (
					(!params.tone || params.tone === tone) &&
					(!params.layout || params.layout === layout)
				)
					examples.push({ ...cta, id: examples.length, tone, layout });
			}
		}
	}
	if (family === 'gallery' && gallery?.type === 'prompts')
		examples.push({
			...gallery,
			layout: params.layout === 'grid' ? 'grid' : 'masonry',
		});
	if (family === 'faq' && faq?.type === 'faq') examples.push(faq);
	if (family === 'hero' && hero?.type === 'hero')
		examples.push(
			...(await hydratePageBlocks([
				{
					...hero,
					layout: params.layout === 'centered' ? 'centered' : 'split',
					galleryId: gallery?.type === 'prompts' ? gallery.id : null,
					galleryPrompts: [],
				},
			])),
		);

	return (
		<>
			<div className={styles.controls}>
				<CatalogHeading
					title='Варианты блоков'
					description='Только локальный предпросмотр. Данные взяты из существующих блоков; записи в Directus не создаются и не меняются.'
				/>
				<nav className={styles.links} aria-label='Виды блоков'>
					{Object.entries(families).map(([key, label]) => (
						<Link
							key={key}
							className={buttonClassName(key === family ? 'primary' : 'ghost')}
							href={`?family=${key}`}
						>
							{label}
						</Link>
					))}
				</nav>
				{family === 'cards' && (
					<nav className={styles.links} aria-label='Число карточек'>
						{[3, 4, 5, 6, 7, 8, 9].map((value) => (
							<Link
								key={value}
								className={buttonClassName(
									value === count ? 'primary' : 'ghost',
								)}
								href={`?family=cards&count=${value}`}
							>
								{value} карточек
							</Link>
						))}
					</nav>
				)}
			</div>
			{family === 'reader' ? (
				<div
					className={styles.reader}
					data-theme={params.theme === 'dark' ? 'dark' : 'light'}
				>
					<ContentBlocks
						blocks={createReaderPreviewBlocks(
							gallery?.type === 'prompts'
								? gallery.prompts.find((item) => item.image)?.image || null
								: null,
							gallery?.type === 'prompts'
								? gallery.prompts
										.flatMap((item) => item.images)
										.find((image) => image.type?.startsWith('video/')) || null
								: null,
						)}
					/>
				</div>
			) : examples.length ? (
				<PageBlocks blocks={examples} />
			) : (
				<p className={styles.controls}>
					Нет опубликованного блока этого типа для предпросмотра.
				</p>
			)}
			{family === 'faq' && faq?.type === 'faq' && (
				<div className={styles.reader}>
					<ContentBlocks
						blocks={[
							{
								id: faq.id,
								type: 'faq',
								title: 'FAQ внутри статьи, новости или промпта',
								questions: faq.questions,
							},
						]}
					/>
				</div>
			)}
		</>
	);
}

function createReaderPreviewBlocks(
	image: PromptImage | null,
	video: PromptImage | null,
): PromptContentBlock[] {
	const button = {
		id: 1,
		label: 'Посмотреть промпты',
		href: '/prompts',
		target: '_self' as const,
		variant: 'primary' as const,
		icon: null,
	};
	return [
		{
			id: 1,
			type: 'text',
			title: 'Текст, ссылки и таблицы',
			content:
				'<p>Материалы используют единую типографику. <strong>Важные детали</strong> остаются заметными, а <a href="/prompts">ссылки на библиотеку</a> переносятся целыми словами.</p><h3>Практические примеры</h3><ul><li>Опишите задачу и ожидаемый результат.</li><li>Добавьте контекст и ограничения.</li></ul><table><thead><tr><th>Формат</th><th>Что описать</th><th>Как проверить</th></tr></thead><tbody><tr><td>Фото</td><td>Композиция, свет, ракурс</td><td>Сравнить детали кадра</td></tr><tr><td>Видео</td><td>Действие и движение камеры</td><td>Проверить последовательность</td></tr></tbody></table><blockquote><p>Начните с понятной задачи и уточняйте детали по результату.</p><cite>Цитата внутри текста</cite></blockquote>',
		},
		{
			id: 2,
			type: 'html',
			title: 'Готовый пример',
			content:
				'<p>Создай предметное фото [ПРОДУКТ]. Используй мягкий дневной свет и нейтральный фон. Сохрани форму и детали упаковки.</p>',
		},
		{
			id: 3,
			type: 'html',
			title: 'Пример кода',
			content:
				'<pre><code>const prompt = "Мягкий дневной свет";\nconst parameters = { aspectRatio: "3:4" };</code></pre>',
		},
		{
			id: 4,
			type: 'quote',
			title: 'Полезно помнить',
			text: 'Хороший промпт описывает желаемый результат, а не только тему.',
			author: 'Редакция Нейролюба',
		},
		{
			id: 5,
			type: 'list',
			title: 'Что проверить',
			items: [
				{
					id: 1,
					title: 'Исходные материалы',
					description: 'Качество фото, свет и ракурс.',
				},
				{
					id: 2,
					title: 'Результат',
					description: 'Совпадение с задачей и сохранение важных деталей.',
				},
			],
		},
		{
			id: 6,
			type: 'steps',
			title: 'Как использовать промпт',
			steps: [
				{
					id: 1,
					title: 'Загрузите фото',
					description:
						'Выберите исходный кадр, на котором хорошо видны нужные детали.',
					isWarning: false,
					buttons: [],
				},
				{
					id: 2,
					title: 'Проверьте ограничения',
					description: 'Не отправляйте личные и конфиденциальные данные.',
					isWarning: true,
					buttons: [],
				},
				{
					id: 3,
					title: 'Вставьте промпт',
					description: 'Замените переменные под свою задачу.',
					isWarning: false,
					buttons: [button],
				},
				{
					id: 4,
					title: 'Сравните результат',
					description: 'Если нужно, уточните запрос и параметры.',
					isWarning: false,
					buttons: [],
				},
			],
		},
		{
			id: 7,
			type: 'cards',
			title: 'Подборки материалов',
			cards: [
				{
					id: 1,
					title: 'Фото и изображения',
					description: 'Портреты, товары и визуальные идеи.',
					href: '/prompts',
					image,
				},
				{
					id: 2,
					title: 'Гайды по нейросетям',
					description: 'Понятные инструкции и практические приёмы.',
					href: '/articles',
					image: null,
				},
				{
					id: 3,
					title: 'Пример без ссылки',
					description: 'Информационная карточка в том же стиле.',
					href: null,
					image: null,
				},
			],
		},
		...(image
			? [
					{
						id: 8,
						type: 'image' as const,
						title: 'Изображение',
						caption: 'Медиа из существующей библиотеки, без изменения файлов.',
						image,
					},
				]
			: []),
		{
			id: 9,
			type: 'video',
			title: 'Видео',
			caption:
				'Сохраняем оригинальные пропорции и стандартное управление плеером.',
			video,
			videoUrl: '/prompts',
		},
		{
			id: 10,
			type: 'cta',
			title: 'Найдите готовый пример для своей задачи',
			description:
				'Откройте библиотеку, выберите подходящий сценарий и адаптируйте детали.',
			buttons: [
				button,
				{
					...button,
					id: 2,
					label: 'Читать статьи',
					href: '/articles',
					variant: 'secondary',
				},
				{
					...button,
					id: 3,
					label: 'Новости',
					href: '/news',
					variant: 'outline',
				},
			],
		},
		{
			id: 11,
			type: 'faq',
			title: 'Частые вопросы',
			description:
				'Переиспользуем тот же аккордеон, что и в остальных материалах.',
			questions: [
				{
					id: 1,
					title: 'Можно ли адаптировать пример?',
					answer: '<p>Да, замените детали под свою задачу.</p>',
				},
				{
					id: 2,
					title: 'Как проверить результат?',
					answer: '<p>Сравните результат с описанием и уточните запрос.</p>',
				},
			],
		},
	];
}

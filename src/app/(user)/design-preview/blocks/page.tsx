import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PageBlock } from '@/entities/page';
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
			{examples.length ? (
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

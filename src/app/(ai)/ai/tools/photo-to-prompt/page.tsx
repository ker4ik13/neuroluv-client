import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getPageBySlug } from '@/shared/api/directus/pages';
import { getPageSeoByPath } from '@/shared/api/directus/seo';
import { buildAiPageMetadata } from '@/shared/lib/seo/ai-metadata';
import {
	buildBreadcrumbJsonLd,
	buildPageJsonLd,
} from '@/shared/lib/seo/json-ld';
import { JsonLd } from '@/shared/ui/json-ld';
import { CreateStudioPage } from '@/widgets/ai-pages';
import { PageBlocks } from '@/widgets/page-blocks';
import styles from './page.module.scss';

const PAGE_PATH = '/ai/tools/photo-to-prompt';
const FALLBACK_TITLE = 'Промпт по фото онлайн — создать готовый промт для нейросети';
const FALLBACK_DESCRIPTION =
	'Создайте промпт по фото онлайн: загрузите референс и получите готовый подробный промт для нейросети, портрета, аватарки или фотосессии.';
const FALLBACK_HEADING = 'Промпт по фото — создать готовый промт для нейросети онлайн';

export async function generateMetadata(): Promise<Metadata> {
	const pageSeo = await getPageSeoByPath(PAGE_PATH);

	return buildAiPageMetadata(
		PAGE_PATH,
		{
			title: FALLBACK_TITLE,
			description: FALLBACK_DESCRIPTION,
		},
		{
			absoluteTitle: true,
			canonicalPath: PAGE_PATH,
			indexable: Boolean(pageSeo),
		},
	);
}

export default async function Page() {
	const [page, nonceHeaders] = await Promise.all([
		getPageBySlug(PAGE_PATH),
		headers(),
	]);
	const heading = page?.title || FALLBACK_HEADING;
	const nonce = nonceHeaders.get('x-nonce') || undefined;

	return (
		<>
			<JsonLd
				data={[
					buildPageJsonLd(page, {
						title: heading,
						description: FALLBACK_DESCRIPTION,
						url: PAGE_PATH,
					}),
					buildBreadcrumbJsonLd([
						{ name: 'Главная', url: '/' },
						{ name: 'Нейролюб Studio', url: '/ai' },
						{ name: heading, url: PAGE_PATH },
					]),
				]}
				nonce={nonce}
			/>
			<section className={styles.workspace}>
				<CreateStudioPage
					kind='photo-to-prompt'
					pageTitle={heading}
				/>
			</section>
			{page?.blocks.length ? (
				<div className={styles.content}>
					<PageBlocks blocks={page.blocks} nonce={nonce} />
				</div>
			) : null}
		</>
	);
}

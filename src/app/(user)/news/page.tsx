import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { NewsPageData } from '@/entities/news';
import { type PageBlock, splitFirstHeroBlock } from '@/entities/page';
import { getNewsPageData } from '@/shared/api/directus/news';
import { getPageBySlug } from '@/shared/api/directus/pages';
import { getPageSeoByPath } from '@/shared/api/directus/seo';
import {
	buildBreadcrumbJsonLd,
	buildWebPageJsonLd,
} from '@/shared/lib/seo/json-ld';
import { buildPageMetadata } from '@/shared/lib/seo/metadata';
import {
	buildPaginationHref,
	normalizePaginationPage,
} from '@/shared/lib/url/pagination';
import {
	buildPathWithSearch,
	omitSearchParams,
} from '@/shared/lib/url/search-path';
import { JsonLd } from '@/shared/ui/json-ld';
import { type ContentListPageConfig, NewsPage } from '@/widgets/news-page';
import { PageBlocks } from '@/widgets/page-blocks';

const EMPTY_NEWS_DATA: NewsPageData = {
	hasMore: false,
	news: [],
	sidebarNews: [],
	topics: [],
	tags: [],
};

const NEWS_PAGE_CONFIG: ContentListPageConfig = {
	basePath: '/news',
	heroDescription:
		'Коротко и по делу рассказываем о новых моделях, инструментах, обновлениях и трендах, которые важны креаторам, маркетологам и бизнесу.',
	heroTitle: 'Следим за тем, что меняется в AI-сфере',
	itemLabel: 'Новости',
	latestTitle: 'Последние новости',
};

type NewsRouteProps = {
	searchParams?: Promise<{
		page?: string;
		q?: string;
		sort?: string;
		tag?: string;
		topic?: string;
	}>;
};

export async function generateMetadata({
	searchParams,
}: NewsRouteProps): Promise<Metadata> {
	const routeParams = await searchParams;
	const page = normalizePaginationPage(routeParams?.page);
	const params = normalizeExclusiveFilters(
		omitSearchParams(routeParams, ['page']),
	);
	const hasNonIndexableQuery = Boolean(params?.q || params?.sort);
	const currentPath = buildPathWithSearch('/news', params);
	const paginatedPath = buildPaginationHref(currentPath, page);
	const exactSeo =
		currentPath === '/news' ? null : await getPageSeoByPath(currentPath);
	const seo = exactSeo || (await getPageSeoByPath('/news'));

	return buildPageMetadata(seo, {
		canonicalPath: page > 1 ? paginatedPath : exactSeo ? currentPath : '/news',
		fallbackTitle: 'Новости | {SITE_NAME}',
		noindex: page > 1 || hasNonIndexableQuery,
		variables: {
			TITLE: 'Новости',
			URL: paginatedPath,
		},
	});
}

export default async function NewsRoute({ searchParams }: NewsRouteProps) {
	const routeParams = await searchParams;
	const page = normalizePaginationPage(routeParams?.page);
	const params = normalizeExclusiveFilters(
		omitSearchParams(routeParams, ['page']),
	);
	const sort = params?.sort === 'old' ? 'old' : 'fresh';
	const q = normalizeQueryParam(params?.q);
	const topic = normalizeQueryParam(params?.topic);
	const tag = topic ? null : normalizeQueryParam(params?.tag);
	let data = EMPTY_NEWS_DATA;
	let blocks: PageBlock[] = [];
	let heroTitle = NEWS_PAGE_CONFIG.heroTitle;
	let heroDescription = NEWS_PAGE_CONFIG.heroDescription;
	let dataLoaded = false;
	const currentPath = buildPathWithSearch('/news', params);
	const paginatedPath = buildPaginationHref(currentPath, page);

	try {
		const [newsData, exactPage, basePage] = await Promise.all([
			getNewsPageData({ includeFacets: true, page, q, sort, tag, topic }),
			currentPath === '/news'
				? Promise.resolve(null)
				: getPageBySlug(currentPath),
			getPageBySlug('/news'),
		]);
		const cmsPage = exactPage || basePage;

		data = newsData;
		dataLoaded = true;
		blocks = cmsPage?.blocks.length ? cmsPage.blocks : basePage?.blocks || [];
	} catch {
		data = EMPTY_NEWS_DATA;
		blocks = [];
	}

	if (page > 1 && dataLoaded && data.news.length === 0) {
		notFound();
	}

	const { hero: heroBlock, remainingBlocks } = splitFirstHeroBlock(blocks);
	heroTitle = heroBlock?.title || heroTitle;
	heroDescription = heroBlock?.description || heroDescription;

	return (
		<>
			<JsonLd
				data={[
					buildWebPageJsonLd({
						description: heroDescription,
						title: heroTitle,
						type: 'CollectionPage',
						url: paginatedPath,
					}),
					buildBreadcrumbJsonLd([
						{ name: 'Главная', url: '/' },
						{ name: 'Новости', url: '/news' },
					]),
				]}
			/>
			<NewsPage
				activeQuery={q}
				activeTag={tag}
				activeTopic={topic}
				config={{
					...NEWS_PAGE_CONFIG,
					heroTitle,
					heroDescription,
					heroActions: heroBlock?.buttons,
				}}
				data={data}
				initialPage={page}
				key={paginatedPath}
				paginationBasePath={currentPath}
				sort={sort}
			/>
			<PageBlocks blocks={remainingBlocks} />
		</>
	);
}

function normalizeQueryParam(value: string | undefined): string | null {
	if (!value) {
		return null;
	}

	return value;
}

function normalizeExclusiveFilters<T extends { tag?: string; topic?: string }>(
	params: Partial<T>,
): Partial<T> {
	if (!params.topic) {
		return params;
	}

	return {
		...params,
		tag: undefined,
	};
}

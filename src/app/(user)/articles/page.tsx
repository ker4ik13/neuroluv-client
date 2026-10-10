import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { NewsPageData } from '@/entities/news';
import { type PageBlock, splitFirstHeroBlock } from '@/entities/page';
import { getArticlesPageData } from '@/shared/api/directus/articles';
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
import { NewsPage } from '@/widgets/news-page';
import { PageBlocks } from '@/widgets/page-blocks';

const EMPTY_ARTICLES_DATA: NewsPageData = {
	hasMore: false,
	news: [],
	sidebarNews: [],
	topics: [],
	tags: [],
};

const ARTICLES_PAGE_CONFIG = {
	basePath: '/articles',
	heroDescription:
		'Разбираем AI-инструменты, промпты, визуальные пайплайны и контент-подходы, которые можно применить в реальных проектах.',
	heroTitle: 'Практические статьи про AI-контент',
	itemLabel: 'Статья',
	latestTitle: 'Последние статьи',
	presentation: 'magazine' as const,
};

type ArticlesRouteProps = {
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
}: ArticlesRouteProps): Promise<Metadata> {
	const routeParams = await searchParams;
	const page = normalizePaginationPage(routeParams?.page);
	const params = normalizeExclusiveFilters(
		omitSearchParams(routeParams, ['page']),
	);
	const hasNonIndexableQuery = Boolean(params?.q || params?.sort);
	const currentPath = buildPathWithSearch('/articles', params);
	const paginatedPath = buildPaginationHref(currentPath, page);
	const exactSeo =
		currentPath === '/articles' ? null : await getPageSeoByPath(currentPath);
	const seo = exactSeo || (await getPageSeoByPath('/articles'));

	return buildPageMetadata(seo, {
		canonicalPath:
			page > 1 ? paginatedPath : exactSeo ? currentPath : '/articles',
		fallbackTitle: 'Статьи | {SITE_NAME}',
		noindex: page > 1 || hasNonIndexableQuery,
		variables: {
			TITLE: 'Статьи',
			URL: paginatedPath,
		},
	});
}

export default async function ArticlesRoute({
	searchParams,
}: ArticlesRouteProps) {
	const routeParams = await searchParams;
	const page = normalizePaginationPage(routeParams?.page);
	const params = normalizeExclusiveFilters(
		omitSearchParams(routeParams, ['page']),
	);
	const sort = params?.sort === 'old' ? 'old' : 'fresh';
	const q = normalizeQueryParam(params?.q);
	const topic = normalizeQueryParam(params?.topic);
	const tag = topic ? null : normalizeQueryParam(params?.tag);
	let data = EMPTY_ARTICLES_DATA;
	let blocks: PageBlock[] = [];
	let heroTitle = ARTICLES_PAGE_CONFIG.heroTitle;
	let heroDescription = ARTICLES_PAGE_CONFIG.heroDescription;
	let dataLoaded = false;
	const currentPath = buildPathWithSearch('/articles', params);
	const paginatedPath = buildPaginationHref(currentPath, page);

	try {
		const [articlesData, exactPage, basePage] = await Promise.all([
			getArticlesPageData({ includeFacets: true, page, q, sort, tag, topic }),
			currentPath === '/articles'
				? Promise.resolve(null)
				: getPageBySlug(currentPath),
			getPageBySlug('/articles'),
		]);
		const cmsPage = exactPage || basePage;

		data = articlesData;
		dataLoaded = true;
		blocks = cmsPage?.blocks.length ? cmsPage.blocks : basePage?.blocks || [];
	} catch {
		data = EMPTY_ARTICLES_DATA;
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
						{ name: 'Статьи', url: '/articles' },
					]),
				]}
			/>
			<NewsPage
				activeQuery={q}
				activeTag={tag}
				activeTopic={topic}
				config={{
					...ARTICLES_PAGE_CONFIG,
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

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type PageBlock, splitFirstHeroBlock } from '@/entities/page';
import type { PromptSortOrder, PromptsPageData } from '@/entities/prompt';
import { getPageBySlug } from '@/shared/api/directus/pages';
import { getPromptsPageData } from '@/shared/api/directus/prompts';
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
import { PageBlocks } from '@/widgets/page-blocks';
import { PromptsPage } from '@/widgets/prompts-page';

const EMPTY_PROMPTS_DATA: PromptsPageData = {
	hasMore: false,
	prompts: [],
	sidebarPrompts: [],
	totalCount: 0,
	types: [],
	contentKinds: [],
	formats: [],
	tags: [],
	goals: [],
	neuralNetworks: [],
};

const DEFAULT_HERO_TITLE = 'Идеи, промпты и референсы для AI-контента';
const DEFAULT_HERO_DESCRIPTION =
	'800+ бесплатных промптов. Копируйте, адаптируйте, запускайте.';

type PromptsRouteProps = {
	searchParams?: Promise<{
		goal?: string;
		kind?: string;
		network?: string;
		page?: string;
		q?: string;
		sort?: string;
		tag?: string;
		type?: string;
	}>;
};

export async function generateMetadata({
	searchParams,
}: PromptsRouteProps): Promise<Metadata> {
	const routeParams = await searchParams;
	const page = normalizePaginationPage(routeParams?.page);
	const params = omitSearchParams(routeParams, ['page']);
	const hasNonIndexableQuery = Boolean(params?.q || params?.sort);
	const currentPath = buildPathWithSearch('/prompts', params);
	const paginatedPath = buildPaginationHref(currentPath, page);
	const exactSeo =
		currentPath === '/prompts' || hasNonIndexableQuery
			? null
			: await getPageSeoByPath(currentPath);
	const seo = exactSeo || (await getPageSeoByPath('/prompts'));

	return buildPageMetadata(seo, {
		canonicalPath:
			page > 1 ? paginatedPath : exactSeo ? currentPath : '/prompts',
		fallbackTitle: 'Промпты | {SITE_NAME}',
		noindex: page > 1 || hasNonIndexableQuery,
		variables: {
			TITLE: 'Промпты',
			URL: paginatedPath,
		},
	});
}

export default async function PromptsRoute({
	searchParams,
}: PromptsRouteProps) {
	const routeParams = await searchParams;
	const page = normalizePaginationPage(routeParams?.page);
	const params = omitSearchParams(routeParams, ['page']);
	const sort = normalizeSort(params?.sort);
	const type = normalizeQueryParam(params?.type);
	const kind = normalizeQueryParam(params?.kind);
	const tag = normalizeQueryParam(params?.tag);
	const network = normalizeQueryParam(params?.network);
	const goal = normalizeQueryParam(params?.goal);
	const q = normalizeQueryParam(params?.q);
	let data = EMPTY_PROMPTS_DATA;
	let blocks: PageBlock[] = [];
	let heroTitle = DEFAULT_HERO_TITLE;
	let heroDescription = DEFAULT_HERO_DESCRIPTION;
	let dataLoaded = false;
	const currentPath = buildPathWithSearch('/prompts', params);
	const paginatedPath = buildPaginationHref(currentPath, page);

	try {
		const [promptsData, exactPage, basePage] = await Promise.all([
			getPromptsPageData({
				goal,
				includeFacets: true,
				kind,
				network,
				page,
				q,
				sort,
				tag,
				type,
			}),
			currentPath === '/prompts'
				? Promise.resolve(null)
				: getPageBySlug(currentPath),
			getPageBySlug('/prompts'),
		]);
		const cmsPage = exactPage || basePage;

		data = promptsData;
		dataLoaded = true;
		blocks = cmsPage?.blocks.length ? cmsPage.blocks : basePage?.blocks || [];
	} catch {
		data = EMPTY_PROMPTS_DATA;
		blocks = [];
	}

	if (page > 1 && dataLoaded && data.prompts.length === 0) {
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
						{ name: 'Промпты', url: '/prompts' },
					]),
				]}
			/>
			<PromptsPage
				activeGoal={goal}
				activeKind={kind}
				activeNetwork={network}
				activeQuery={q}
				activeTag={tag}
				activeType={type}
				data={data}
				heroDescription={heroDescription}
				heroTitle={heroTitle}
				heroActions={heroBlock?.buttons}
				initialPage={page}
				key={paginatedPath}
				paginationBasePath={currentPath}
				sort={sort}
			/>
			<PageBlocks blocks={remainingBlocks} />
		</>
	);
}

function normalizeSort(value: string | undefined): PromptSortOrder {
	if (value === 'old') {
		return value;
	}

	return 'fresh';
}

function normalizeQueryParam(value: string | undefined): string | null {
	if (!value) {
		return null;
	}

	return value;
}

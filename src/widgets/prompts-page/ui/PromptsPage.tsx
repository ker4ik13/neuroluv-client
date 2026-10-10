'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaTelegram } from 'react-icons/fa';
import { FiGrid, FiZap } from 'react-icons/fi';
import type { PromptSortOrder, PromptsPageData } from '@/entities/prompt';
import { PromptGallery } from '@/entities/prompt';
import {
	buildPaginationHref,
	replacePaginationPageInAddressBar,
} from '@/shared/lib/url/pagination';
import {
	CatalogHeading,
	type CatalogHeadingAction,
} from '@/shared/ui/catalog-heading';
import {
	ContentListControls,
	type ContentListFilter,
	type ContentListSortOption,
} from '@/shared/ui/content-list-controls';
import { MobileFilterSheet } from '@/shared/ui/mobile-filter-sheet';
import { Noindex } from '@/shared/ui/noindex';
import { ScrollTopButton } from '@/shared/ui/scroll-top-button';
import { SmartStickySidebar } from '@/shared/ui/smart-sticky-sidebar';
import styles from './PromptsPage.module.scss';

type PromptsPageProps = {
	activeCollection?: string | null;
	activeGoal: string | null;
	activeKind?: string | null;
	activeNetwork: string | null;
	activeQuery: string | null;
	activeTag: string | null;
	activeType: string | null;
	basePath?: string;
	data: PromptsPageData;
	heroDescription?: string;
	heroTitle?: string;
	heroActions?: CatalogHeadingAction[];
	initialPage?: number;
	paginationBasePath?: string;
	resetHref?: string;
	showDefaultHero?: boolean;
	sort: PromptSortOrder;
};

type PromptFilterParams = {
	collection?: string | null;
	goal?: string | null;
	kind?: string | null;
	network?: string | null;
	q?: string | null;
	sort?: PromptSortOrder;
	tag?: string | null;
	type?: string | null;
};

export function PromptsPage({
	activeCollection = null,
	activeGoal,
	activeKind = null,
	activeNetwork,
	activeQuery,
	activeTag,
	activeType,
	basePath = '/prompts',
	data,
	heroDescription = '800+ бесплатных промптов. Копируйте, адаптируйте, запускайте.',
	heroTitle = 'Идеи, промпты и референсы для AI-контента',
	heroActions,
	initialPage = 1,
	paginationBasePath = basePath,
	resetHref = '/prompts',
	showDefaultHero = true,
	sort,
}: PromptsPageProps) {
	const [localData, setLocalData] = useState(data);
	const [currentPage, setCurrentPage] = useState(initialPage);
	const [isPaginationPending, setIsPaginationPending] = useState(false);
	const isPaginationLoadingRef = useRef(false);
	const sentinelRef = useRef<HTMLDivElement>(null);
	const activeParams = useMemo(
		() => ({
			goal: activeGoal,
			collection: activeCollection,
			kind: activeKind,
			network: activeNetwork,
			q: activeQuery,
			sort,
			tag: activeTag,
			type: activeType,
		}),
		[
			activeCollection,
			activeGoal,
			activeKind,
			activeNetwork,
			activeQuery,
			activeTag,
			activeType,
			sort,
		],
	);

	useEffect(() => {
		const sentinel = sentinelRef.current;

		if (!sentinel || !localData.hasMore) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting && !isPaginationLoadingRef.current) {
					void loadNextPromptsPage({
						activeParams,
						currentPage,
						onComplete: (nextData, nextPage) => {
							setLocalData((currentData) =>
								appendPromptsPageData(currentData, nextData),
							);
							setCurrentPage(nextPage);
							replacePaginationPageInAddressBar(nextPage);
						},
						setIsPending: setIsPaginationPending,
						statusRef: isPaginationLoadingRef,
					});
				}
			},
			{ rootMargin: '240px' },
		);

		observer.observe(sentinel);

		return () => observer.disconnect();
	}, [activeParams, currentPage, localData.hasMore]);

	return (
		<div className={styles.page}>
			{showDefaultHero && (
				<CatalogHeading
					breadcrumbs={[
						{ label: 'Главная', href: '/' },
						...(basePath === '/prompts'
							? [{ label: 'Промпты' }]
							: [{ label: 'Промпты', href: '/prompts' }, { label: heroTitle }]),
					]}
					title={heroTitle}
					description={heroDescription}
					actions={heroActions}
				/>
			)}

			<div className={styles.layout}>
				<div className={styles.main}>
					<SearchAndFilters
						activeParams={activeParams}
						basePath={basePath}
						data={localData}
						resetHref={resetHref}
					/>

					{localData.prompts.length > 0 ? (
						<PromptGallery prompts={localData.prompts} />
					) : (
						<EmptyState />
					)}

					<div
						aria-live='polite'
						className={`${styles.loader} ${isPaginationPending ? styles.loaderVisible : ''}`}
						ref={sentinelRef}
					>
						{isPaginationPending && (
							<>
								<span className={styles.loaderLine} />
								<span className={styles.loaderText}>
									<span className={styles.loaderDots} aria-hidden='true'>
										<span />
										<span />
										<span />
									</span>
									Загрузка
								</span>
							</>
						)}
						{!isPaginationPending && (currentPage > 1 || localData.hasMore) && (
							<nav
								aria-label='Пагинация промптов'
								className={styles.paginationFallback}
							>
								{currentPage > 1 && (
									<a
										className={styles.paginationLink}
										href={buildPaginationHref(
											paginationBasePath,
											currentPage - 1,
										)}
										rel='prev'
									>
										Предыдущая страница
									</a>
								)}
								{localData.hasMore && (
									<a
										className={styles.paginationLink}
										href={buildPaginationHref(
											paginationBasePath,
											currentPage + 1,
										)}
										rel='next'
									>
										Следующая страница
									</a>
								)}
							</nav>
						)}
					</div>
				</div>

				<PromptsSidebar activeParams={activeParams} data={localData} />
			</div>

			{localData.goals.length > 0 && (
				<section className={styles.collections}>
					<div className={styles.sectionHead}>
						<h2>Подборки</h2>
					</div>
					<div className={styles.collectionGrid}>
						{localData.goals.slice(0, 4).map((goal) => (
							<Link
								className={styles.collectionCard}
								href={buildPromptsHref({ goal: goal.slug })}
								key={`goal-${goal.id}`}
							>
								<strong>{goal.title}</strong>
								<span>{goal.count || 0} промптов</span>
								<small>Смотреть</small>
							</Link>
						))}
					</div>
				</section>
			)}

			<ScrollTopButton />
		</div>
	);
}

function SearchAndFilters({
	activeParams,
	basePath,
	data,
	resetHref,
}: {
	activeParams: PromptFilterParams;
	basePath: string;
	data: PromptsPageData;
	resetHref: string;
}) {
	const currentSort = activeParams.sort || 'fresh';
	const hasActiveFilters = Boolean(
		activeParams.collection ||
		activeParams.goal ||
		activeParams.kind ||
		activeParams.network ||
		activeParams.q ||
		activeParams.tag ||
		activeParams.type ||
		currentSort !== 'fresh',
	);
	const resultLabel = `${hasActiveFilters ? 'Найдено' : 'Всего'} ${data.totalCount} ${getPromptsCountWord(data.totalCount)}`;
	const filters: ContentListFilter[] = [
		{
			id: 'all',
			href: buildPromptsHref({
				q: activeParams.q,
				sort: activeParams.sort,
			}),
			isActive: !(
				activeParams.collection ||
				activeParams.goal ||
				activeParams.kind ||
				activeParams.network ||
				activeParams.tag ||
				activeParams.type
			),
			label: 'Все',
		},
		...data.contentKinds.map((kind) => ({
			id: `kind-${kind.id}`,
			href: buildPromptsHref({
				kind: kind.slug,
				q: activeParams.q,
				sort: activeParams.sort,
			}),
			isActive: activeParams.kind === kind.slug,
			label: kind.title,
		})),
	];
	const sortOptions: ContentListSortOption[] = [
		{
			href: buildPromptsHref({ ...activeParams, sort: 'fresh' }),
			isActive: currentSort !== 'old',
			label: 'Новые',
			value: 'fresh',
		},
		{
			href: buildPromptsHref({ ...activeParams, sort: 'old' }),
			isActive: currentSort === 'old',
			label: 'Старые',
			value: 'old',
		},
	];

	return (
		<ContentListControls
			action={basePath}
			filters={filters}
			hasActiveExternalFilters={Boolean(
				activeParams.collection ||
				activeParams.goal ||
				activeParams.kind ||
				activeParams.network ||
				activeParams.tag ||
				activeParams.type,
			)}
			hiddenInputs={{
				sort: currentSort !== 'fresh' ? currentSort : null,
			}}
			leadingLink={{
				href: '/prompts-menu',
				icon: <FiGrid aria-hidden='true' />,
				label: 'Каталог',
			}}
			mobileFilter={
				<MobileFilterSheet>
					<PromptsSidebarContent activeParams={activeParams} data={data} />
				</MobileFilterSheet>
			}
			resetHref={resetHref}
			resultLabel={resultLabel}
			searchDefaultValue={activeParams.q}
			searchLabel='Поиск по промптам'
			searchPlaceholder='Поиск по промптам, стилям, нейросетям...'
			sortOptions={sortOptions}
		/>
	);
}

function getPromptsCountWord(count: number): string {
	const absoluteCount = Math.abs(count);
	const lastTwoDigits = absoluteCount % 100;
	const lastDigit = absoluteCount % 10;

	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		return 'промптов';
	}

	if (lastDigit === 1) {
		return 'промпт';
	}

	if (lastDigit >= 2 && lastDigit <= 4) {
		return 'промпта';
	}

	return 'промптов';
}

function PromptsSidebar({
	activeParams,
	data,
}: {
	activeParams: PromptFilterParams;
	data: PromptsPageData;
}) {
	return (
		<Noindex>
			<SmartStickySidebar className={styles.sidebar}>
				<PromptsSidebarContent activeParams={activeParams} data={data} />
			</SmartStickySidebar>
		</Noindex>
	);
}

function PromptsSidebarContent({
	activeParams,
	data,
}: {
	activeParams: PromptFilterParams;
	data: PromptsPageData;
}) {
	const filterableGoals = data.goals
		.filter((goal) => goal.isFilterable === true && (goal.count || 0) > 0)
		.sort(compareTaxonomiesByCount);
	const filterableTags = data.tags.filter(
		(tag) => tag.isFilterable === true && (tag.count || 0) > 0,
	);

	return (
		<>
			{filterableGoals.length > 0 && (
				<SidebarPanel title='Цель промпта'>
					<div className={styles.categoryList}>
						{filterableGoals.map((goal) => (
							<SidebarCountLink
								active={activeParams.goal === goal.slug}
								count={goal.count || 0}
								href={buildPromptsHref({
									q: activeParams.q,
									sort: activeParams.sort,
									goal: activeParams.goal === goal.slug ? null : goal.slug,
								})}
								key={`sidebar-goal-${goal.id}`}
								title={goal.title}
							/>
						))}
					</div>
				</SidebarPanel>
			)}

			<SidebarPanel title='Нейросети'>
				<div className={styles.networkCloud}>
					{data.neuralNetworks.map((network) => (
						<Link
							className={`${styles.networkChip} ${
								activeParams.network === network.slug
									? styles.networkChipActive
									: ''
							}`}
							href={buildPromptsHref({
								q: activeParams.q,
								sort: activeParams.sort,
								network:
									activeParams.network === network.slug ? null : network.slug,
							})}
							key={`network-${network.id}`}
						>
							<PromptNetworkLogo network={network} />
							{network.title}
						</Link>
					))}
				</div>
			</SidebarPanel>

			{filterableTags.length > 0 && (
				<SidebarPanel title='Популярные теги'>
					<div className={styles.tagCloud}>
						{filterableTags.map((tag) => (
							<Link
								className={`${styles.tagChip} ${
									activeParams.tag === tag.slug ? styles.tagChipActive : ''
								}`}
								href={buildPromptsHref({
									q: activeParams.q,
									sort: activeParams.sort,
									tag: activeParams.tag === tag.slug ? null : tag.slug,
								})}
								key={`tag-${tag.id}`}
							>
								#{tag.title}
							</Link>
						))}
					</div>
				</SidebarPanel>
			)}

			<div className={styles.telegramCard}>
				<div className={styles.telegramHead}>
					<span>
						<FaTelegram aria-hidden='true' />
					</span>
					<strong>Подпишись на Telegram</strong>
				</div>
				<p>Новые промпты и примеры для ваших идей — в нашем канале.</p>
				<a
					href='https://t.me/+uThlnd6M6KwwY2Y6'
					rel='noreferrer'
					target='_blank'
				>
					Подписаться
				</a>
			</div>
		</>
	);
}

function PromptNetworkLogo({
	network,
}: {
	network: PromptsPageData['neuralNetworks'][number];
}) {
	return (
		<span aria-hidden='true' className={styles.networkLogo}>
			{network.logo ? (
				<Image alt='' height={18} src={network.logo.url} width={18} />
			) : (
				<FiZap />
			)}
		</span>
	);
}

function compareTaxonomiesByCount(
	first: { count?: number; title: string },
	second: { count?: number; title: string },
): number {
	const countDifference = (second.count || 0) - (first.count || 0);

	if (countDifference !== 0) {
		return countDifference;
	}

	return first.title.localeCompare(second.title, 'ru');
}

function SidebarPanel({
	children,
	title,
}: {
	children: ReactNode;
	title: string;
}) {
	return (
		<section className={styles.sidebarPanel}>
			<h2>{title}</h2>
			{children}
		</section>
	);
}

function SidebarCountLink({
	active,
	count,
	href,
	title,
}: {
	active: boolean;
	count: number;
	href: string;
	title: string;
}) {
	return (
		<Link
			className={`${styles.categoryLink} ${active ? styles.categoryLinkActive : ''}`}
			href={href}
		>
			<span>{title}</span>
			<small>{count}</small>
		</Link>
	);
}

function EmptyState() {
	return (
		<section className={styles.empty}>
			<h2>Промпты не найдены</h2>
			<p>Попробуйте изменить запрос, тип или выбранные фильтры.</p>
			<Link href='/prompts'>Сбросить фильтры</Link>
		</section>
	);
}

function buildPromptsHref(params: PromptFilterParams = {}): string {
	const searchParams = new URLSearchParams();
	const pathname = getPromptsCatalogPath(params);

	if (params.q) {
		searchParams.set('q', params.q);
	}

	if (params.sort && params.sort !== 'fresh') {
		searchParams.set('sort', params.sort);
	}

	const query = searchParams.toString();

	return query ? `${pathname}?${query}` : pathname;
}

function getPromptsCatalogPath(params: PromptFilterParams): string {
	if (params.collection) {
		return `/prompts-menu/collection-${params.collection}`;
	}

	if (params.kind) {
		return `/prompts-menu/kind-${params.kind}`;
	}

	if (params.tag) {
		return `/prompts-menu/tag-${params.tag}`;
	}

	if (params.network) {
		return `/prompts-menu/network-${params.network}`;
	}

	if (params.goal) {
		return `/prompts-menu/goal-${params.goal}`;
	}

	return '/prompts';
}

async function loadNextPromptsPage({
	activeParams,
	currentPage,
	onComplete,
	setIsPending,
	statusRef,
}: {
	activeParams: PromptFilterParams;
	currentPage: number;
	onComplete: (data: PromptsPageData, page: number) => void;
	setIsPending: (value: boolean) => void;
	statusRef: { current: boolean };
}) {
	statusRef.current = true;
	setIsPending(true);

	try {
		const nextPage = currentPage + 1;
		const response = await fetch(buildPromptsApiHref(activeParams, nextPage));

		if (!response.ok) {
			return;
		}

		onComplete((await response.json()) as PromptsPageData, nextPage);
	} finally {
		statusRef.current = false;
		setIsPending(false);
	}
}

function appendPromptsPageData(
	currentData: PromptsPageData,
	nextData: PromptsPageData,
): PromptsPageData {
	const knownIds = new Set(currentData.prompts.map((item) => item.id));

	return {
		...currentData,
		hasMore: nextData.hasMore,
		prompts: [
			...currentData.prompts,
			...nextData.prompts.filter((item) => !knownIds.has(item.id)),
		],
		sidebarPrompts:
			nextData.sidebarPrompts.length > 0
				? nextData.sidebarPrompts
				: currentData.sidebarPrompts,
		totalCount: nextData.totalCount || currentData.totalCount,
		contentKinds:
			nextData.contentKinds.length > 0
				? nextData.contentKinds
				: currentData.contentKinds,
		formats:
			nextData.formats.length > 0 ? nextData.formats : currentData.formats,
		goals: nextData.goals.length > 0 ? nextData.goals : currentData.goals,
		neuralNetworks:
			nextData.neuralNetworks.length > 0
				? nextData.neuralNetworks
				: currentData.neuralNetworks,
		tags: nextData.tags.length > 0 ? nextData.tags : currentData.tags,
		types: nextData.types.length > 0 ? nextData.types : currentData.types,
	};
}

function buildPromptsApiHref(params: PromptFilterParams, page: number): string {
	const searchParams = new URLSearchParams();

	searchParams.set('page', String(page));

	if (params.q) {
		searchParams.set('q', params.q);
	}

	if (params.type) {
		searchParams.set('type', params.type);
	}

	if (params.collection) {
		searchParams.set('collection', params.collection);
	}

	if (params.kind) {
		searchParams.set('kind', params.kind);
	}

	if (params.tag) {
		searchParams.set('tag', params.tag);
	}

	if (params.network) {
		searchParams.set('network', params.network);
	}

	if (params.goal) {
		searchParams.set('goal', params.goal);
	}

	if (params.sort && params.sort !== 'fresh') {
		searchParams.set('sort', params.sort);
	}

	return `/api/prompts?${searchParams.toString()}`;
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
	FormEvent,
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { FiBookmark, FiSearch } from 'react-icons/fi';
import { PromptCard as LibraryPromptCard } from '@/entities/prompt';
import { useAiLocale } from '@/features/ai-locale';
import { useAiSession } from '@/features/ai-session';
import {
	aiApiFetch,
	type AiPromptCard,
	type AiPromptCatalog,
	type AiPublicModel,
} from '@/shared/api/ai';
import { buttonClassName } from '@/shared/ui/button';
import { Masonry } from '@/shared/ui/masonry';
import { MobileFilterSheet } from '@/shared/ui/mobile-filter-sheet';
import { SmartStickySidebar } from '@/shared/ui/smart-sticky-sidebar';
import { getAiErrorMessage, toQueryString, useAiResource } from '../model/api';
import { toStudioPromptCard } from '../model/prompt-card';
import { AiModelLogo } from './AiModelLogo';
import styles from './AiPages.module.scss';
import { AiSelect } from './AiSelect';
import {
	AiButton,
	AiPage,
	AiPageHeader,
	AsyncState,
	FieldMessage,
} from './AiUi';

type PromptFilters = {
	search: string;
	modality: string;
	modelId: string;
	category: string;
	sort: PromptSort;
	favoritesOnly: boolean;
};

type PromptSort = 'popular' | 'newest' | 'title';

const INITIAL_FILTERS: PromptFilters = {
	search: '',
	modality: '',
	modelId: '',
	category: '',
	sort: 'newest',
	favoritesOnly: false,
};

export function PromptsPage({
	initialCatalog = null,
}: {
	initialCatalog?: AiPromptCatalog | null;
}) {
	const router = useRouter();
	const { session } = useAiSession();
	const { isEnglish, t } = useAiLocale();
	const [filters, setFilters] = useState<PromptFilters>(INITIAL_FILTERS);
	const [actionError, setActionError] = useState<string | null>(null);
	const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(
		null,
	);
	const [promptCatalog, setPromptCatalog] = useState<AiPromptCatalog | null>(
		initialCatalog,
	);
	const [catalogError, setCatalogError] = useState<string | null>(null);
	const [isCatalogLoading, setIsCatalogLoading] = useState(!initialCatalog);
	const [catalogRequestVersion, setCatalogRequestVersion] = useState(0);
	const [isPaginationPending, setIsPaginationPending] = useState(false);
	const [paginationError, setPaginationError] = useState<string | null>(null);
	const hasCatalogDataRef = useRef(Boolean(initialCatalog));
	const paginationRequestRef = useRef<string | null>(null);
	const preserveInitialCatalogRef = useRef(Boolean(initialCatalog));
	const sentinelRef = useRef<HTMLDivElement>(null);

	const catalogPath = useMemo(
		() => buildPromptCatalogPath(filters, 1),
		[filters],
	);
	const models = useAiResource<AiPublicModel[]>('/catalog/models');
	const availableModels = useMemo(() => {
		const modelIds = new Set(promptCatalog?.filters?.modelIds || []);
		return (
			models.data?.filter(
				(model) => model.available && modelIds.has(model.id),
			) || []
		);
	}, [models.data, promptCatalog?.filters?.modelIds]);
	const modelById = useMemo(
		() => new Map((models.data || []).map((model) => [model.id, model])),
		[models.data],
	);

	function updateFilters(patch: Partial<PromptFilters>) {
		const next = { ...filters, ...patch };
		const href = `/ai/prompts${toQueryString({
			search: next.search,
			modality: next.modality,
			model: next.modelId,
			category: next.category,
			sort: next.sort === 'newest' ? '' : next.sort,
			favorites: next.favoritesOnly ? '1' : undefined,
		})}`;

		setFilters(next);
		window.history.replaceState(window.history.state, '', href);
	}

	function handleSearch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const value = String(
			new FormData(event.currentTarget).get('search') || '',
		).trim();
		updateFilters({ search: value });
	}

	function toggleFavoritesFilter() {
		if (!session.authenticated) {
			router.push(
				`/ai/auth?returnTo=${encodeURIComponent('/ai/prompts?favorites=1')}`,
			);
			return;
		}

		updateFilters({ favoritesOnly: !filters.favoritesOnly });
	}

	useEffect(() => {
		const timer = window.setTimeout(() => {
			const nextFilters = getPromptFiltersFromLocation();

			setFilters((current) =>
				arePromptFiltersEqual(current, nextFilters) ? current : nextFilters,
			);
		}, 0);

		return () => window.clearTimeout(timer);
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		let active = true;
		const preserveInitialCatalog =
			preserveInitialCatalogRef.current &&
			catalogRequestVersion === 0 &&
			catalogPath === buildPromptCatalogPath(INITIAL_FILTERS, 1);

		if (!preserveInitialCatalog) hasCatalogDataRef.current = false;

		paginationRequestRef.current = null;
		queueMicrotask(() => {
			if (!active) return;
			if (!preserveInitialCatalog) setPromptCatalog(null);
			setCatalogError(null);
			setIsCatalogLoading(!preserveInitialCatalog);
			setIsPaginationPending(false);
			setPaginationError(null);
		});

		aiApiFetch<AiPromptCatalog>(catalogPath, { signal: controller.signal })
			.then((data) => {
				if (!active) return;
				hasCatalogDataRef.current = true;
				setPromptCatalog(data);
			})
			.catch((error: unknown) => {
				if (!active || controller.signal.aborted) return;
				if (!hasCatalogDataRef.current) {
					setCatalogError(getAiErrorMessage(error));
				}
			})
			.finally(() => {
				if (active) {
					preserveInitialCatalogRef.current = false;
					setIsCatalogLoading(false);
				}
			});

		return () => {
			active = false;
			controller.abort();
		};
	}, [catalogPath, catalogRequestVersion]);

	const loadNextPage = useCallback(async () => {
		if (!promptCatalog?.hasMore || paginationRequestRef.current) return;

		const nextPage = promptCatalog.page + 1;
		const requestKey = `${catalogPath}:${nextPage}`;
		paginationRequestRef.current = requestKey;
		setIsPaginationPending(true);
		setPaginationError(null);

		try {
			const nextCatalog = await aiApiFetch<AiPromptCatalog>(
				buildPromptCatalogPath(filters, nextPage),
			);

			if (paginationRequestRef.current !== requestKey) return;

			setPromptCatalog((current) => {
				if (!current || current.page >= nextCatalog.page) return current;

				const prompts = new Map(
					current.data.map((prompt) => [prompt.id, prompt]),
				);
				nextCatalog.data.forEach((prompt) => prompts.set(prompt.id, prompt));

				return {
					...nextCatalog,
					data: [...prompts.values()],
					filters: nextCatalog.filters || current.filters,
				};
			});
		} catch (error) {
			if (paginationRequestRef.current === requestKey) {
				setPaginationError(getAiErrorMessage(error));
			}
		} finally {
			if (paginationRequestRef.current === requestKey) {
				paginationRequestRef.current = null;
				setIsPaginationPending(false);
			}
		}
	}, [catalogPath, filters, promptCatalog]);

	useEffect(() => {
		const sentinel = sentinelRef.current;

		if (!sentinel || !promptCatalog?.hasMore || paginationError) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) void loadNextPage();
			},
			{ rootMargin: '240px' },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [loadNextPage, paginationError, promptCatalog?.hasMore]);

	async function toggleFavorite(prompt: AiPromptCard) {
		if (!session.authenticated) {
			router.push(`/ai/auth?returnTo=${encodeURIComponent('/ai/prompts')}`);
			return;
		}

		setPendingFavoriteId(prompt.id);
		setActionError(null);
		try {
			await aiApiFetch(`/catalog/prompts/${prompt.id}/favorite`, {
				method: prompt.favorite ? 'DELETE' : 'POST',
			});
			if (filters.favoritesOnly && prompt.favorite) {
				setCatalogRequestVersion((version) => version + 1);
				return;
			}
			setPromptCatalog((current) =>
				current
					? {
							...current,
							data: current.data.map((item) =>
								item.id === prompt.id
									? { ...item, favorite: !item.favorite }
									: item,
							),
						}
					: current,
			);
		} catch (error) {
			setActionError(getAiErrorMessage(error));
		} finally {
			setPendingFavoriteId(null);
		}
	}

	const hasActiveFilters = Boolean(
		filters.search ||
		filters.modality ||
		filters.modelId ||
		filters.category ||
		filters.favoritesOnly ||
		filters.sort !== INITIAL_FILTERS.sort,
	);

	const sidebarContent = (
		<>
			<SidebarPanel title={t('Тип контента', 'Content type')}>
				<SidebarOptions
					activeValue={filters.modality}
					options={[
						{ value: '', label: t('Все', 'All') },
						{ value: 'image', label: t('Фото', 'Image') },
						{ value: 'video', label: t('Видео', 'Video') },
						{ value: 'text', label: t('Текст', 'Text') },
					]}
					onChange={(modality) => updateFilters({ modality })}
				/>
			</SidebarPanel>

			{promptCatalog?.filters?.categories?.length ? (
				<SidebarPanel title={t('Цель промпта', 'Prompt goal')}>
					<SidebarOptions
						activeValue={filters.category}
						options={[
							{ value: '', label: t('Все цели', 'All goals') },
							...promptCatalog.filters.categories,
						]}
						onChange={(category) => updateFilters({ category })}
					/>
				</SidebarPanel>
			) : null}

			{availableModels.length ? (
				<SidebarPanel title={t('Нейросети', 'AI models')}>
					<div className={styles.promptModelCloud}>
						<button
							className={!filters.modelId ? styles.promptFilterChipActive : ''}
							data-mobile-filter-action
							type='button'
							onClick={() => updateFilters({ modelId: '' })}
						>
							{t('Все', 'All')}
						</button>
						{availableModels.map((model) => (
							<button
								className={
									filters.modelId === model.id
										? styles.promptFilterChipActive
										: ''
								}
								data-mobile-filter-action
								key={model.id}
								type='button'
								onClick={() =>
									updateFilters({
										modelId: filters.modelId === model.id ? '' : model.id,
									})
								}
							>
								<AiModelLogo label={model.name} logoUrl={model.logoUrl} />
								<span>{model.name}</span>
							</button>
						))}
					</div>
				</SidebarPanel>
			) : null}
		</>
	);

	return (
		<AiPage>
			<AiPageHeader
				title={t('Промпты', 'Prompts')}
				description={t(
					'Выберите идею, настройте детали и создайте свой результат в Studio.',
					'Choose an idea, adjust the details and create your result in Studio.',
				)}
			/>

			<div className={styles.promptCatalogLayout}>
				<MobileFilterSheet
					closeOnActionSelector='[data-mobile-filter-action]'
					label={t('Фильтры', 'Filters')}
					title={t('Фильтры промптов', 'Prompt filters')}
					tone='ai'
				>
					{sidebarContent}
				</MobileFilterSheet>

				<div className={styles.promptCatalogMain}>
					<div className={styles.promptCatalogControls}>
						<form
							className={`${styles.searchForm} ${styles.promptCatalogSearchForm}`}
							onSubmit={handleSearch}
						>
							<label
								className={`${styles.searchField} ${styles.promptCatalogSearchField}`}
							>
								<span className={styles.visuallyHidden}>
									{t('Поиск по промптам', 'Search prompts')}
								</span>
								<input
									defaultValue={filters.search}
									key={filters.search}
									name='search'
									placeholder={t(
										'Поиск по промптам, стилям и задачам...',
										'Search prompts, styles and tasks...',
									)}
									type='search'
								/>
							</label>
							<AiButton type='submit'>
								{t('Найти', 'Search')}
								<FiSearch aria-hidden='true' />
							</AiButton>
						</form>

						<div className={styles.promptCatalogControlActions}>
							<AiButton
								className={styles.promptToolbarReset}
								disabled={!hasActiveFilters}
								type='button'
								variant='secondary'
								onClick={() => updateFilters(INITIAL_FILTERS)}
							>
								{t('Сбросить', 'Reset')}
							</AiButton>
							<AiButton
								aria-pressed={filters.favoritesOnly}
								className={`${styles.promptFavoritesFilter} ${
									filters.favoritesOnly
										? styles.promptFavoritesFilterActive
										: ''
								}`}
								type='button'
								variant='secondary'
								onClick={toggleFavoritesFilter}
							>
								<FiBookmark
									aria-hidden='true'
									fill={filters.favoritesOnly ? 'currentColor' : 'none'}
								/>
								<span className={styles.promptFavoritesLabel}>
									{t('Избранные', 'Favorites')}
								</span>
							</AiButton>
							<AiSelect
								className={styles.promptSortSelect}
								compact
								id='prompt-sort'
								options={[
									{
										value: 'newest',
										label: t('Сначала новые', 'Newest first'),
										selectedLabel: t('Новые', 'Newest'),
									},
									{
										value: 'popular',
										label: t('Популярные', 'Popular'),
										selectedLabel: t('Популярные', 'Popular'),
									},
									{
										value: 'title',
										label: t('По названию', 'By title'),
										selectedLabel: t('По названию', 'By title'),
									},
								]}
								value={filters.sort}
								onChange={(sort) =>
									updateFilters({ sort: normalizePromptSort(sort) })
								}
							/>
						</div>
					</div>

					{actionError ? <FieldMessage>{actionError}</FieldMessage> : null}
					{promptCatalog ? (
						<p className={styles.catalogCount}>
							{promptCatalog.total}{' '}
							{promptCountWord(promptCatalog.total, isEnglish)}
						</p>
					) : null}

					<AsyncState
						error={catalogError}
						isEmpty={!promptCatalog?.data.length}
						isLoading={isCatalogLoading}
						emptyTitle={t('Промпты не найдены', 'No prompts found')}
						emptyDescription={t(
							'Попробуйте изменить запрос или сбросить фильтры.',
							'Try changing the search or resetting filters.',
						)}
						onRetry={() => {
							setCatalogRequestVersion((version) => version + 1);
						}}
					>
						<Masonry>
							{promptCatalog?.data.map((prompt, index) => (
								<PromptCard
									isEnglish={isEnglish}
									isFavoritePending={pendingFavoriteId === prompt.id}
									key={prompt.id}
									model={modelById.get(prompt.modelIds?.[0] || '') || null}
									priority={index < 3}
									prompt={prompt}
									t={t}
									onToggleFavorite={() => void toggleFavorite(prompt)}
								/>
							))}
						</Masonry>

						<div
							aria-live='polite'
							className={`${styles.promptPaginationSentinel} ${
								isPaginationPending
									? styles.promptPaginationSentinelVisible
									: ''
							}`}
							ref={sentinelRef}
						>
							{isPaginationPending ? (
								<span
									aria-label={t('Загрузка промптов', 'Loading prompts')}
									className={styles.promptPaginationSpinner}
									role='status'
								/>
							) : null}
							{paginationError ? (
								<div className={styles.promptPaginationError}>
									<FieldMessage>{paginationError}</FieldMessage>
									<AiButton
										type='button'
										variant='secondary'
										onClick={() => void loadNextPage()}
									>
										{t('Повторить', 'Retry')}
									</AiButton>
								</div>
							) : null}
						</div>
					</AsyncState>
				</div>

				<SmartStickySidebar className={styles.promptCatalogSidebar}>
					{sidebarContent}
				</SmartStickySidebar>
			</div>
		</AiPage>
	);
}

function PromptCard({
	isEnglish,
	isFavoritePending,
	model,
	priority,
	prompt,
	t,
	onToggleFavorite,
}: {
	isEnglish: boolean;
	isFavoritePending: boolean;
	model: AiPublicModel | null;
	priority: boolean;
	prompt: AiPromptCard;
	t: (russian: string, english: string) => string;
	onToggleFavorite: () => void;
}) {
	const customButton = prompt.buttons?.[0];
	const useHref = customButton?.url || `/ai/prompts/${prompt.slug}`;

	return (
		<LibraryPromptCard
			prompt={toStudioPromptCard(prompt, model, isEnglish)}
			priority={priority}
			actions={
				<div className={styles.promptCardActions}>
					{customButton ? (
						<a
							className={buttonClassName('secondary')}
							href={useHref}
							rel={customButton.target === '_blank' ? 'noreferrer' : undefined}
							target={customButton.target}
						>
							{t('Использовать', 'Use')}
						</a>
					) : (
						<Link className={buttonClassName('secondary')} href={useHref}>
							{t('Использовать', 'Use')}
						</Link>
					)}
					<AiButton
						aria-label={
							prompt.favorite
								? t('Убрать из избранного', 'Remove from favorites')
								: t('Добавить в избранное', 'Add to favorites')
						}
						className={styles.promptFavoriteButton}
						disabled={isFavoritePending}
						type='button'
						variant='ghost'
						onClick={onToggleFavorite}
					>
						<FiBookmark
							aria-hidden='true'
							fill={prompt.favorite ? 'currentColor' : 'none'}
						/>
					</AiButton>
				</div>
			}
		/>
	);
}

function SidebarPanel({
	children,
	title,
}: {
	children: ReactNode;
	title: string;
}) {
	return (
		<section className={styles.promptSidebarPanel}>
			<h2>{title}</h2>
			{children}
		</section>
	);
}

function SidebarOptions({
	activeValue,
	options,
	onChange,
}: {
	activeValue: string;
	options: Array<{ value: string; label: string }>;
	onChange: (value: string) => void;
}) {
	return (
		<div className={styles.promptSidebarOptions}>
			{options.map((option) => (
				<button
					aria-pressed={activeValue === option.value}
					className={
						activeValue === option.value ? styles.promptSidebarOptionActive : ''
					}
					key={option.value || 'all'}
					data-mobile-filter-action
					type='button'
					onClick={() => onChange(option.value)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}

function normalizePromptSort(value?: string): PromptSort {
	if (value === 'popular' || value === 'title') return value;
	return 'newest';
}

function getPromptFiltersFromLocation(): PromptFilters {
	const params = new URLSearchParams(window.location.search);
	const favorites = params.get('favorites');

	return {
		search: params.get('search') || '',
		modality: params.get('modality') || '',
		modelId: params.get('model') || '',
		category: params.get('category') || '',
		sort: normalizePromptSort(params.get('sort') || undefined),
		favoritesOnly: favorites === '1' || favorites === 'true',
	};
}

function arePromptFiltersEqual(
	first: PromptFilters,
	second: PromptFilters,
): boolean {
	return (
		first.search === second.search &&
		first.modality === second.modality &&
		first.modelId === second.modelId &&
		first.category === second.category &&
		first.sort === second.sort &&
		first.favoritesOnly === second.favoritesOnly
	);
}

function buildPromptCatalogPath(filters: PromptFilters, page: number): string {
	return `/catalog/prompts${toQueryString({
		search: filters.search,
		modality: filters.modality,
		modelId: filters.modelId,
		category: filters.category,
		sort: filters.sort,
		favoritesOnly: filters.favoritesOnly ? 'true' : undefined,
		page,
		pageSize: 12,
	})}`;
}

function promptCountWord(count: number, isEnglish: boolean): string {
	if (isEnglish) return count === 1 ? 'prompt' : 'prompts';
	const lastTwo = Math.abs(count) % 100;
	const last = Math.abs(count) % 10;
	if (lastTwo >= 11 && lastTwo <= 14) return 'промптов';
	if (last === 1) return 'промпт';
	if (last >= 2 && last <= 4) return 'промпта';
	return 'промптов';
}

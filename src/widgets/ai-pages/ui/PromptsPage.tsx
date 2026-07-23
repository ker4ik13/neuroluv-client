"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiBookmark,
  FiImage,
  FiSearch,
  FiX,
} from "react-icons/fi";

import { useAiLocale } from "@/features/ai-locale";
import { useAiSession } from "@/features/ai-session";
import {
  aiApiFetch,
  type AiPromptCard,
  type AiPromptCatalog,
  type AiPublicModel,
} from "@/shared/api/ai";
import { SmartStickySidebar } from "@/shared/ui/smart-sticky-sidebar";

import { getAiErrorMessage, toQueryString, useAiResource } from "../model/api";
import { AiButton, AiPage, AsyncState, FieldMessage } from "./AiUi";
import { AiModelLogo } from "./AiModelLogo";
import { AiSelect } from "./AiSelect";
import styles from "./AiPages.module.scss";

type PromptFilters = {
  search: string;
  modality: string;
  modelId: string;
  category: string;
  sort: PromptSort;
  favoritesOnly: boolean;
};

type PromptSort = "popular" | "newest" | "title";

const INITIAL_FILTERS: PromptFilters = {
  search: "",
  modality: "",
  modelId: "",
  category: "",
  sort: "newest",
  favoritesOnly: false,
};

export function PromptsPage({
  initialSearchParams = {},
}: {
  initialSearchParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const { session } = useAiSession();
  const { isEnglish, t } = useAiLocale();
  const [filters, setFilters] = useState<PromptFilters>(() => ({
    search: initialSearchParams.search || "",
    modality: initialSearchParams.modality || "",
    modelId: initialSearchParams.model || "",
    category: initialSearchParams.category || "",
    sort: normalizePromptSort(initialSearchParams.sort),
    favoritesOnly:
      initialSearchParams.favorites === "1" || initialSearchParams.favorites === "true",
  }));
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);
  const [promptCatalog, setPromptCatalog] = useState<AiPromptCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogRequestVersion, setCatalogRequestVersion] = useState(0);
  const [isPaginationPending, setIsPaginationPending] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const paginationRequestRef = useRef<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const catalogPath = useMemo(
    () => buildPromptCatalogPath(filters, 1),
    [filters],
  );
  const models = useAiResource<AiPublicModel[]>("/catalog/models");
  const availableModels = useMemo(() => {
    const modelIds = new Set(promptCatalog?.filters?.modelIds || []);
    return models.data?.filter((model) => model.available && modelIds.has(model.id)) || [];
  }, [models.data, promptCatalog?.filters?.modelIds]);

  function updateFilters(patch: Partial<PromptFilters>) {
    const next = { ...filters, ...patch };
    const href = `/ai/prompts${toQueryString({
      search: next.search,
      modality: next.modality,
      model: next.modelId,
      category: next.category,
      sort: next.sort === "newest" ? "" : next.sort,
      favorites: next.favoritesOnly ? "1" : undefined,
    })}`;

    setFilters(next);
    window.history.replaceState(window.history.state, "", href);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("search") || "").trim();
    updateFilters({ search: value });
  }

  function toggleFavoritesFilter() {
    if (!session.authenticated) {
      router.push(`/ai/auth?returnTo=${encodeURIComponent("/ai/prompts?favorites=1")}`);
      return;
    }

    updateFilters({ favoritesOnly: !filters.favoritesOnly });
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    paginationRequestRef.current = null;
    queueMicrotask(() => {
      if (!active) return;
      setPromptCatalog(null);
      setCatalogError(null);
      setIsCatalogLoading(true);
      setIsPaginationPending(false);
      setPaginationError(null);
    });

    aiApiFetch<AiPromptCatalog>(catalogPath, { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setPromptCatalog(data);
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        setCatalogError(getAiErrorMessage(error));
      })
      .finally(() => {
        if (active) setIsCatalogLoading(false);
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

        const prompts = new Map(current.data.map((prompt) => [prompt.id, prompt]));
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
      { rootMargin: "240px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNextPage, paginationError, promptCatalog?.hasMore]);

  async function toggleFavorite(prompt: AiPromptCard) {
    if (!session.authenticated) {
      router.push(`/ai/auth?returnTo=${encodeURIComponent("/ai/prompts")}`);
      return;
    }

    setPendingFavoriteId(prompt.id);
    setActionError(null);
    try {
      await aiApiFetch(`/catalog/prompts/${prompt.id}/favorite`, {
        method: prompt.favorite ? "DELETE" : "POST",
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
                item.id === prompt.id ? { ...item, favorite: !item.favorite } : item,
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
      filters.favoritesOnly,
  );

  return (
    <AiPage>
      <header className={styles.promptCatalogHeader}>
        <div>
          <h1>{t("Промпты", "Prompts")}</h1>
          <p>
            {t(
              "Готовые идеи и точные инструкции для генерации контента.",
              "Ready-to-use ideas and precise instructions for content generation.",
            )}
          </p>
        </div>
        {promptCatalog ? (
          <span>
            {promptCatalog.total} {promptCountWord(promptCatalog.total, isEnglish)}
          </span>
        ) : null}
      </header>

      <div className={styles.promptCatalogLayout}>
        <div className={styles.promptCatalogMain}>
          <div className={styles.promptCatalogControls}>
            <form className={styles.searchForm} onSubmit={handleSearch}>
              <label className={styles.searchField}>
                <FiSearch aria-hidden="true" />
                <span className={styles.visuallyHidden}>
                  {t("Поиск по промптам", "Search prompts")}
                </span>
                <input
                  defaultValue={filters.search}
                  key={filters.search}
                  name="search"
                  placeholder={t(
                    "Поиск по промптам, стилям и задачам...",
                    "Search prompts, styles and tasks...",
                  )}
                  type="search"
                />
              </label>
              <AiButton type="submit">{t("Найти", "Search")}</AiButton>
            </form>

            <div className={styles.promptCatalogControlActions}>
              <AiSelect
                className={styles.promptSortSelect}
                compact
                id="prompt-sort"
                options={[
                  { value: "newest", label: t("Сначала новые", "Newest first") },
                  { value: "popular", label: t("Популярные", "Popular") },
                  { value: "title", label: t("По названию", "By title") },
                ]}
                value={filters.sort}
                onChange={(sort) => updateFilters({ sort: normalizePromptSort(sort) })}
              />
              <AiButton
                aria-pressed={filters.favoritesOnly}
                className={`${styles.promptFavoritesFilter} ${
                  filters.favoritesOnly ? styles.promptFavoritesFilterActive : ""
                }`}
                type="button"
                variant="secondary"
                onClick={toggleFavoritesFilter}
              >
                <FiBookmark
                  aria-hidden="true"
                  fill={filters.favoritesOnly ? "currentColor" : "none"}
                />
                {t("Избранные", "Favorites")}
              </AiButton>
            </div>
          </div>

          {actionError ? <FieldMessage>{actionError}</FieldMessage> : null}

          <AsyncState
            error={catalogError}
            isEmpty={!promptCatalog?.data.length}
            isLoading={isCatalogLoading}
            emptyTitle={t("Промпты не найдены", "No prompts found")}
            emptyDescription={t(
              "Попробуйте изменить запрос или сбросить фильтры.",
              "Try changing the search or resetting filters.",
            )}
            onRetry={() => {
              setCatalogRequestVersion((version) => version + 1);
            }}
          >
            <div className={styles.promptGrid}>
              {promptCatalog?.data.map((prompt, index) => (
                <PromptCard
                  isEnglish={isEnglish}
                  isFavoritePending={pendingFavoriteId === prompt.id}
                  key={prompt.id}
                  priority={index < 3}
                  prompt={prompt}
                  t={t}
                  onToggleFavorite={() => void toggleFavorite(prompt)}
                />
              ))}
            </div>

            <div
              aria-live="polite"
              className={`${styles.promptPaginationSentinel} ${
                isPaginationPending ? styles.promptPaginationSentinelVisible : ""
              }`}
              ref={sentinelRef}
            >
              {isPaginationPending ? (
                <span
                  aria-label={t("Загрузка промптов", "Loading prompts")}
                  className={styles.promptPaginationSpinner}
                  role="status"
                />
              ) : null}
              {paginationError ? (
                <div className={styles.promptPaginationError}>
                  <FieldMessage>{paginationError}</FieldMessage>
                  <AiButton type="button" variant="secondary" onClick={() => void loadNextPage()}>
                    {t("Повторить", "Retry")}
                  </AiButton>
                </div>
              ) : null}
            </div>
          </AsyncState>
        </div>

        <SmartStickySidebar className={styles.promptCatalogSidebar}>
          <SidebarPanel title={t("Тип контента", "Content type")}>
            <SidebarOptions
              activeValue={filters.modality}
              options={[
                { value: "", label: t("Все", "All") },
                { value: "image", label: t("Фото", "Image") },
                { value: "video", label: t("Видео", "Video") },
                { value: "text", label: t("Текст", "Text") },
              ]}
              onChange={(modality) => updateFilters({ modality })}
            />
          </SidebarPanel>

          {promptCatalog?.filters?.categories?.length ? (
            <SidebarPanel title={t("Цель промпта", "Prompt goal")}>
              <SidebarOptions
                activeValue={filters.category}
                options={[
                  { value: "", label: t("Все цели", "All goals") },
                  ...promptCatalog.filters.categories,
                ]}
                onChange={(category) => updateFilters({ category })}
              />
            </SidebarPanel>
          ) : null}

          {availableModels.length ? (
            <SidebarPanel title={t("Нейросети", "AI models")}>
              <div className={styles.promptModelCloud}>
                <button
                  className={!filters.modelId ? styles.promptFilterChipActive : ""}
                  type="button"
                  onClick={() => updateFilters({ modelId: "" })}
                >
                  {t("Все", "All")}
                </button>
                {availableModels.map((model) => (
                  <button
                    className={
                      filters.modelId === model.id ? styles.promptFilterChipActive : ""
                    }
                    key={model.id}
                    type="button"
                    onClick={() =>
                      updateFilters({
                        modelId: filters.modelId === model.id ? "" : model.id,
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

          {hasActiveFilters ? (
            <AiButton
              className={styles.promptResetButton}
              type="button"
              variant="secondary"
              onClick={() => updateFilters(INITIAL_FILTERS)}
            >
              <FiX aria-hidden="true" />
              {t("Сбросить фильтры", "Reset filters")}
            </AiButton>
          ) : null}
        </SmartStickySidebar>
      </div>
    </AiPage>
  );
}

function PromptCard({
  isEnglish,
  isFavoritePending,
  priority,
  prompt,
  t,
  onToggleFavorite,
}: {
  isEnglish: boolean;
  isFavoritePending: boolean;
  priority: boolean;
  prompt: AiPromptCard;
  t: (russian: string, english: string) => string;
  onToggleFavorite: () => void;
}) {
  return (
    <article className={styles.promptCard}>
      <Link className={styles.promptCardMedia} href={`/ai/prompts/${prompt.slug}`}>
        {prompt.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL выдаёт backend/CDN
          <img
            alt=""
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            height={864}
            loading={priority ? "eager" : "lazy"}
            sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1080px) calc(50vw - 36px), 300px"
            src={prompt.imageUrl}
            srcSet={buildPromptImageSrcSet(prompt.imageUrl)}
            width={720}
          />
        ) : (
          <span className={styles.promptCardPlaceholder}>
            <FiImage aria-hidden="true" />
          </span>
        )}
      </Link>

      <div className={styles.promptCardBody}>
        <div className={styles.promptCardBadges}>
          <span className={styles.promptCardBadgePrimary}>
            {getModalityLabel(prompt.modality, isEnglish)}
          </span>
          {prompt.modelNames[0] ? <span>{prompt.modelNames[0]}</span> : null}
          {prompt.category ? <span>{prompt.category}</span> : null}
        </div>
        <Link className={styles.promptCardTitle} href={`/ai/prompts/${prompt.slug}`}>
          {prompt.title}
        </Link>
        <div className={styles.promptCardActions}>
          <Link className={styles.promptUseLink} href={`/ai/prompts/${prompt.slug}`}>
            {t("Использовать", "Use")}
          </Link>
          <AiButton
            aria-label={
              prompt.favorite
                ? t("Убрать из избранного", "Remove from favorites")
                : t("Добавить в избранное", "Add to favorites")
            }
            className={styles.promptFavoriteButton}
            disabled={isFavoritePending}
            type="button"
            variant="ghost"
            onClick={onToggleFavorite}
          >
            <FiBookmark
              aria-hidden="true"
              fill={prompt.favorite ? "currentColor" : "none"}
            />
          </AiButton>
        </div>
      </div>
    </article>
  );
}

function SidebarPanel({ children, title }: { children: ReactNode; title: string }) {
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
          className={activeValue === option.value ? styles.promptSidebarOptionActive : ""}
          key={option.value || "all"}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function normalizePromptSort(value?: string): PromptSort {
  if (value === "popular" || value === "title") return value;
  return "newest";
}

function buildPromptImageSrcSet(value: string): string {
  return [360, 540, 720, 960]
    .map((width) => `${withPromptImageWidth(value, width)} ${width}w`)
    .join(", ");
}

function withPromptImageWidth(value: string, width: number): string {
  try {
    const url = new URL(value);
    url.searchParams.set("width", String(width));
    url.searchParams.set("height", String(Math.round(width * 1.2)));
    url.searchParams.set("fit", "cover");
    url.searchParams.set("quality", "78");
    url.searchParams.set("format", "webp");
    return url.toString();
  } catch {
    return value;
  }
}

function buildPromptCatalogPath(filters: PromptFilters, page: number): string {
  return `/catalog/prompts${toQueryString({
    search: filters.search,
    modality: filters.modality,
    modelId: filters.modelId,
    category: filters.category,
    sort: filters.sort,
    favoritesOnly: filters.favoritesOnly ? "true" : undefined,
    page,
    pageSize: 12,
  })}`;
}

function getModalityLabel(modality: string, isEnglish: boolean): string {
  if (modality === "image") return isEnglish ? "Image" : "Фото";
  if (modality === "video") return isEnglish ? "Video" : "Видео";
  if (modality === "text") return isEnglish ? "Text" : "Текст";
  return isEnglish ? "AI tool" : "AI-инструмент";
}

function promptCountWord(count: number, isEnglish: boolean): string {
  if (isEnglish) return count === 1 ? "prompt" : "prompts";
  const lastTwo = Math.abs(count) % 100;
  const last = Math.abs(count) % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "промптов";
  if (last === 1) return "промпт";
  if (last >= 2 && last <= 4) return "промпта";
  return "промптов";
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  FiArrowRight,
  FiBookmark,
  FiImage,
  FiSearch,
  FiX,
} from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import {
  aiApiFetch,
  type AiPromptCard,
  type AiPromptCatalog,
  type AiPublicModel,
} from "@/shared/api/ai";

import { getAiErrorMessage, toQueryString, useAiResource } from "../model/api";
import {
  AiButton,
  AiCard,
  AiLinkButton,
  AiPage,
  AiPageHeader,
  AsyncState,
  FieldMessage,
} from "./AiUi";
import styles from "./AiPages.module.scss";

type PromptFilters = {
  search: string;
  modality: string;
  modelId: string;
  category: string;
  access: string;
  sort: string;
  page: number;
};

const INITIAL_FILTERS: PromptFilters = {
  search: "",
  modality: "",
  modelId: "",
  category: "",
  access: "",
  sort: "popular",
  page: 1,
};

export function PromptsPage({
  initialSearchParams = {},
}: {
  initialSearchParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const { session } = useAiSession();
  const [filters, setFilters] = useState<PromptFilters>(() => ({
    search: initialSearchParams.search || "",
    modality: initialSearchParams.modality || "",
    modelId: initialSearchParams.model || "",
    category: initialSearchParams.category || "",
    access: initialSearchParams.access || "",
    sort: initialSearchParams.sort || "popular",
    page: Math.max(1, Number(initialSearchParams.page) || 1),
  }));
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useMemo(
    () =>
      toQueryString({
        search: filters.search,
        modality: filters.modality,
        modelId: filters.modelId,
        category: filters.category,
        access: filters.access,
        sort: filters.sort,
        page: filters.page,
        pageSize: 12,
      }),
    [filters],
  );
  const catalog = useAiResource<AiPromptCatalog>(`/catalog/prompts${query}`);
  const models = useAiResource<AiPublicModel[]>("/catalog/models");

  function updateFilters(patch: Partial<PromptFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    router.replace(
      `/ai/prompts${toQueryString({
        search: next.search,
        modality: next.modality,
        model: next.modelId,
        category: next.category,
        access: next.access,
        sort: next.sort === "popular" ? "" : next.sort,
        page: next.page > 1 ? next.page : undefined,
      })}`,
      { scroll: false },
    );
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("search") || "").trim();
    updateFilters({ search: value, page: 1 });
  }

  async function toggleFavorite(prompt: AiPromptCard) {
    if (!session.authenticated) {
      router.push(`/ai/auth?returnTo=${encodeURIComponent(`/ai/prompts/${prompt.slug}`)}`);
      return;
    }

    setActionError(null);
    try {
      await aiApiFetch(`/catalog/prompts/${prompt.id}/favorite`, {
        method: prompt.favorite ? "DELETE" : "POST",
      });
      catalog.reload();
    } catch (error) {
      setActionError(getAiErrorMessage(error));
    }
  }

  const hasActiveFilters = Boolean(
    filters.search || filters.modality || filters.modelId || filters.category || filters.access,
  );

  return (
    <AiPage>
      <AiPageHeader
        eyebrow="Библиотека идей"
        title="Каталог промптов"
        description="Проверенные сценарии от редакции. Выберите промпт, заполните переменные и получите расчёт до запуска."
        actions={
          <AiLinkButton href="/ai/create" variant="secondary">
            Чистая форма
            <FiArrowRight aria-hidden="true" />
          </AiLinkButton>
        }
      />

      <AiCard className={styles.filtersCard}>
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <label className={styles.searchField}>
            <FiSearch aria-hidden="true" />
            <span className={styles.visuallyHidden}>Поиск по промптам</span>
            <input
              defaultValue={filters.search}
              key={filters.search}
              name="search"
              placeholder="Поиск по названию и задаче"
              type="search"
            />
          </label>
          <AiButton type="submit" variant="secondary">Найти</AiButton>
        </form>

        <div className={styles.filterGrid}>
          <label className={styles.compactField}>
            <span>Тип</span>
            <select
              value={filters.modality}
              onChange={(event) => updateFilters({ modality: event.target.value, page: 1 })}
            >
              <option value="">Все типы</option>
              <option value="image">Изображение</option>
              <option value="video">Видео</option>
              <option value="text">Текст</option>
            </select>
          </label>
          <label className={styles.compactField}>
            <span>Модель</span>
            <select
              disabled={models.isLoading || Boolean(models.error)}
              value={filters.modelId}
              onChange={(event) => updateFilters({ modelId: event.target.value, page: 1 })}
            >
              <option value="">Все модели</option>
              {models.data?.filter((model) => model.available).map((model) => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </label>
          <label className={styles.compactField}>
            <span>Категория</span>
            <select
              value={filters.category}
              onChange={(event) => updateFilters({ category: event.target.value, page: 1 })}
            >
              <option value="">Все категории</option>
              {catalog.data?.filters?.categories?.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
          </label>
          <label className={styles.compactField}>
            <span>Доступ</span>
            <select
              value={filters.access}
              onChange={(event) => updateFilters({ access: event.target.value, page: 1 })}
            >
              <option value="">Любой</option>
              {(catalog.data?.filters?.access || [
                { value: "free", label: "Бесплатный" },
                { value: "subscription", label: "По подписке" },
              ]).map((access) => (
                <option key={access.value} value={access.value}>{access.label}</option>
              ))}
            </select>
          </label>
          <label className={styles.compactField}>
            <span>Сортировка</span>
            <select
              value={filters.sort}
              onChange={(event) => updateFilters({ sort: event.target.value, page: 1 })}
            >
              <option value="popular">Популярные</option>
              <option value="newest">Сначала новые</option>
              <option value="title">По названию</option>
            </select>
          </label>
          {hasActiveFilters && (
            <AiButton
              className={styles.resetButton}
              type="button"
              variant="ghost"
              onClick={() => updateFilters(INITIAL_FILTERS)}
            >
              <FiX aria-hidden="true" />
              Сбросить
            </AiButton>
          )}
        </div>
      </AiCard>

      {actionError ? <FieldMessage>{actionError}</FieldMessage> : null}

      <AsyncState
        error={catalog.error}
        isEmpty={!catalog.data?.data.length}
        isLoading={catalog.isLoading}
        emptyTitle="Промпты не найдены"
        emptyDescription="Попробуйте изменить запрос или сбросить фильтры."
        onRetry={catalog.reload}
      >
        <div className={styles.promptGrid}>
          {catalog.data?.data.map((prompt) => (
            <article className={styles.promptCard} key={prompt.id}>
              <Link className={styles.promptMedia} href={`/ai/prompts/${prompt.slug}`}>
                {prompt.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- backend/CDN URL with unknown host
                  <img alt="" loading="lazy" src={prompt.imageUrl} />
                ) : (
                  <span className={styles.mediaPlaceholder}>
                    <FiImage aria-hidden="true" />
                  </span>
                )}
                <span className={styles.promptAccess}>
                  {prompt.access === "free" ? "Открытый" : "По подписке"}
                </span>
              </Link>
              <div className={styles.promptBody}>
                <div className={styles.promptMeta}>
                  <span>{getModalityLabel(prompt.modality)}</span>
                  {prompt.category ? <span>{prompt.category}</span> : null}
                </div>
                <Link href={`/ai/prompts/${prompt.slug}`}>
                  <h2>{prompt.title}</h2>
                </Link>
                {prompt.excerpt ? <p>{prompt.excerpt}</p> : null}
                {prompt.modelNames.length ? (
                  <div className={styles.chipRow}>
                    {prompt.modelNames.map((name) => <span key={name}>{name}</span>)}
                  </div>
                ) : null}
                <div className={styles.promptActions}>
                  <AiLinkButton href={`/ai/prompts/${prompt.slug}`}>
                    Использовать
                  </AiLinkButton>
                  <AiButton
                    aria-label={prompt.favorite ? "Убрать из избранного" : "Добавить в избранное"}
                    className={styles.iconButton}
                    type="button"
                    variant="ghost"
                    onClick={() => void toggleFavorite(prompt)}
                  >
                    <FiBookmark aria-hidden="true" fill={prompt.favorite ? "currentColor" : "none"} />
                  </AiButton>
                </div>
              </div>
            </article>
          ))}
        </div>

        {catalog.data && catalog.data.total > catalog.data.pageSize ? (
          <nav aria-label="Страницы каталога" className={styles.pagination}>
            <AiButton
              disabled={filters.page <= 1}
              type="button"
              variant="secondary"
              onClick={() => updateFilters({ page: Math.max(1, filters.page - 1) })}
            >
              Назад
            </AiButton>
            <span>
              Страница {catalog.data.page} из {Math.ceil(catalog.data.total / catalog.data.pageSize)}
            </span>
            <AiButton
              disabled={!catalog.data.hasMore}
              type="button"
              variant="secondary"
              onClick={() => updateFilters({ page: filters.page + 1 })}
            >
              Дальше
            </AiButton>
          </nav>
        ) : null}
      </AsyncState>
    </AiPage>
  );
}

function getModalityLabel(modality: string): string {
  if (modality === "image") return "Изображение";
  if (modality === "video") return "Видео";
  if (modality === "text") return "Текст";
  return "AI-инструмент";
}

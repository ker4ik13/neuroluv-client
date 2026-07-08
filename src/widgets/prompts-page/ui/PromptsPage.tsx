"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaArrowRight, FaBars, FaMagic, FaTelegram } from "react-icons/fa";

import type {
  PromptItem,
  PromptsPageData,
  PromptSortOrder,
} from "@/entities/prompt";
import {
  ContentListControls,
  type ContentListFilter,
  type ContentListSortOption,
} from "@/shared/ui/content-list-controls";
import { removePaginationParamFromAddressBar } from "@/shared/lib/url/remove-pagination-param";
import { Noindex } from "@/shared/ui/noindex";
import { ScrollTopButton } from "@/shared/ui/scroll-top-button";
import { SmartStickySidebar } from "@/shared/ui/smart-sticky-sidebar";

import styles from "./PromptsPage.module.scss";

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
  resetHref?: string;
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
  basePath = "/prompts",
  data,
  heroDescription = "800+ бесплатных промптов. Копируйте, адаптируйте, запускайте.",
  heroTitle = "Идеи, промпты и референсы для AI-контента",
  resetHref = "/prompts",
  sort,
}: PromptsPageProps) {
  const [localData, setLocalData] = useState(data);
  const [currentPage, setCurrentPage] = useState(1);
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

  useEffect(removePaginationParamFromAddressBar, []);

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
            onComplete: (nextData) => {
              setLocalData(nextData);
              setCurrentPage((page) => page + 1);
            },
            setIsPending: setIsPaginationPending,
            statusRef: isPaginationLoadingRef,
          });
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [activeParams, currentPage, localData.hasMore]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Промпты</p>
          <h1 className={styles.heroTitle}>{heroTitle}</h1>
          <p className={styles.heroDescription}>{heroDescription}</p>
          <a
            className={styles.heroButton}
            href="https://t.me/neuroluv"
            rel="noreferrer"
            target="_blank"
          >
            Заказать AI-контент
            <FaMagic aria-hidden="true" />
          </a>
        </div>
        <div className={styles.heroImage}>
          <Image
            priority
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 440px"
            src="/images/news-hero-person.png"
          />
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.main}>
          <SearchAndFilters
            activeParams={activeParams}
            basePath={basePath}
            data={localData}
            resetHref={resetHref}
          />

          {localData.prompts.length > 0 ? (
            <div className={styles.cards}>
              {localData.prompts.map((prompt, index) => (
                <PromptCard
                  key={`prompt-${prompt.id}-${index}`}
                  prompt={prompt}
                />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}

          <div
            aria-live="polite"
            className={`${styles.loader} ${isPaginationPending ? styles.loaderVisible : ""}`}
            ref={sentinelRef}
          >
            {isPaginationPending && (
              <>
                <span className={styles.loaderLine} />
                <span className={styles.loaderText}>
                  <span className={styles.loaderDots} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  Загрузка
                </span>
              </>
            )}
          </div>
        </div>

        <PromptsSidebar activeParams={activeParams} data={localData} />
      </div>

      {localData.sidebarPrompts.length > 0 && (
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
    </main>
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
  const currentSort = activeParams.sort || "fresh";
  const hasActiveFilters = Boolean(
    activeParams.collection ||
      activeParams.goal ||
      activeParams.kind ||
      activeParams.network ||
      activeParams.q ||
      activeParams.tag ||
      activeParams.type ||
      currentSort !== "fresh",
  );
  const resultLabel = `${hasActiveFilters ? "Найдено" : "Всего"} ${data.totalCount} ${getPromptsCountWord(data.totalCount)}`;
  const filters: ContentListFilter[] = [
    {
      id: "all",
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
      label: "Все",
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
      href: buildPromptsHref({ ...activeParams, sort: "fresh" }),
      isActive: currentSort !== "old",
      label: "Новые",
      value: "fresh",
    },
    {
      href: buildPromptsHref({ ...activeParams, sort: "old" }),
      isActive: currentSort === "old",
      label: "Старые",
      value: "old",
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
        sort: currentSort !== "fresh" ? currentSort : null,
      }}
      leadingLink={{
        href: "/prompts-menu",
        icon: <FaBars aria-hidden="true" />,
        label: "Каталог",
      }}
      resetHref={resetHref}
      resultLabel={resultLabel}
      searchDefaultValue={activeParams.q}
      searchLabel="Поиск по промптам"
      searchPlaceholder="Поиск по промптам, стилям, нейросетям..."
      sortOptions={sortOptions}
    />
  );
}

function getPromptsCountWord(count: number): string {
  const absoluteCount = Math.abs(count);
  const lastTwoDigits = absoluteCount % 100;
  const lastDigit = absoluteCount % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "промптов";
  }

  if (lastDigit === 1) {
    return "промпт";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "промпта";
  }

  return "промптов";
}

function PromptCard({
  prompt,
}: {
  prompt: PromptItem;
}) {
  const type = prompt.contentKind || prompt.types[0];

  return (
    <Link className={styles.card} href={prompt.href}>
      <span className={styles.cardImage}>
        {prompt.image ? (
          <Image
            alt={getPromptImageAlt(prompt.image.title, prompt.title)}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 45vw, 290px"
            src={prompt.image.url}
          />
        ) : (
          <span className={styles.cardPlaceholder}>
            {type?.title || prompt.neuralNetwork?.title || "AI"}
          </span>
        )}
      </span>

      <span className={styles.cardBody}>
        <span className={styles.badges}>
          {type && <span className={styles.badgePrimary}>{type.title}</span>}
          {prompt.neuralNetwork && (
            <span className={styles.badge}>{prompt.neuralNetwork.title}</span>
          )}
          {prompt.format && <span className={styles.badge}>{prompt.format}</span>}
          {prompt.difficultyLabel && (
            <span className={styles.badge}>{prompt.difficultyLabel}</span>
          )}
        </span>
        <span className={styles.cardTitle}>{prompt.title}</span>
      </span>
    </Link>
  );
}

function PromptsSidebar({
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
    <Noindex>
      <SmartStickySidebar className={styles.sidebar}>
        {filterableGoals.length > 0 && (
          <SidebarPanel title="Цель промпта">
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

        <SidebarPanel title="Нейросети">
          <div className={styles.networkCloud}>
            {data.neuralNetworks.map((network) => (
              <Link
                className={`${styles.networkChip} ${
                  activeParams.network === network.slug
                    ? styles.networkChipActive
                    : ""
                }`}
                href={buildPromptsHref({
                  q: activeParams.q,
                  sort: activeParams.sort,
                  network:
                    activeParams.network === network.slug ? null : network.slug,
                })}
                key={`network-${network.id}`}
              >
                <span />
                {network.title}
              </Link>
            ))}
          </div>
        </SidebarPanel>

        {filterableTags.length > 0 && (
          <SidebarPanel title="Популярные теги">
            <div className={styles.tagCloud}>
              {filterableTags.map((tag) => (
                <Link
                  className={`${styles.tagChip} ${
                    activeParams.tag === tag.slug ? styles.tagChipActive : ""
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
              <FaTelegram aria-hidden="true" />
            </span>
            <strong>Подпишись на Telegram</strong>
          </div>
          <p>6000+ подписчиков. Лучшие промпты каждую неделю.</p>
          <a href="https://t.me/neuroluv" rel="noreferrer" target="_blank">
            Подписаться
            <FaArrowRight aria-hidden="true" />
          </a>
        </div>
      </SmartStickySidebar>
    </Noindex>
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

  return first.title.localeCompare(second.title, "ru");
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
      className={`${styles.categoryLink} ${active ? styles.categoryLinkActive : ""}`}
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
      <Link href="/prompts">Сбросить фильтры</Link>
    </section>
  );
}

function buildPromptsHref(params: PromptFilterParams = {}): string {
  const searchParams = new URLSearchParams();
  const pathname = getPromptsCatalogPath(params);

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.sort && params.sort !== "fresh") {
    searchParams.set("sort", params.sort);
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

  return "/prompts";
}

function getPromptImageAlt(imageTitle: string, fallback: string): string {
  return imageTitle.trim() || fallback;
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
  onComplete: (data: PromptsPageData) => void;
  setIsPending: (value: boolean) => void;
  statusRef: { current: boolean };
}) {
  statusRef.current = true;
  setIsPending(true);

  try {
    const response = await fetch(buildPromptsApiHref(activeParams, currentPage + 1));

    if (!response.ok) {
      return;
    }

    onComplete((await response.json()) as PromptsPageData);
  } finally {
    statusRef.current = false;
    setIsPending(false);
  }
}

function buildPromptsApiHref(
  params: PromptFilterParams,
  page: number,
): string {
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(page));

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.type) {
    searchParams.set("type", params.type);
  }

  if (params.collection) {
    searchParams.set("collection", params.collection);
  }

  if (params.kind) {
    searchParams.set("kind", params.kind);
  }

  if (params.tag) {
    searchParams.set("tag", params.tag);
  }

  if (params.network) {
    searchParams.set("network", params.network);
  }

  if (params.goal) {
    searchParams.set("goal", params.goal);
  }

  if (params.sort && params.sort !== "fresh") {
    searchParams.set("sort", params.sort);
  }

  return `/api/prompts?${searchParams.toString()}`;
}

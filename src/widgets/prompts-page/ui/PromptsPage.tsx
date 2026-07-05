"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode, Ref } from "react";
import { useEffect, useRef, useTransition } from "react";
import { AiOutlineSearch } from "react-icons/ai";
import { FaArrowRight, FaMagic, FaTelegram } from "react-icons/fa";

import type {
  PromptItem,
  PromptsPageData,
  PromptSortOrder,
  PromptTaxonomy,
} from "@/entities/prompt";
import { SmartStickySidebar } from "@/shared/ui/smart-sticky-sidebar";

import styles from "./PromptsPage.module.scss";

type PromptsPageProps = {
  activeGoal: string | null;
  activeNetwork: string | null;
  activeQuery: string | null;
  activeTag: string | null;
  activeType: string | null;
  currentPage: number;
  data: PromptsPageData;
  heroTitle?: string;
  sort: PromptSortOrder;
};

type PromptFilterParams = {
  goal?: string | null;
  network?: string | null;
  q?: string | null;
  sort?: PromptSortOrder;
  tag?: string | null;
  type?: string | null;
};

const PAGINATION_STEP = 30;

export function PromptsPage({
  activeGoal,
  activeNetwork,
  activeQuery,
  activeTag,
  activeType,
  currentPage,
  data,
  heroTitle = "Идеи, промпты и референсы для AI-контента",
  sort,
}: PromptsPageProps) {
  const router = useRouter();
  const [isPaginationPending, startPaginationTransition] = useTransition();
  const pageAnchorRef = useRef<HTMLAnchorElement>(null);
  const shouldRestorePaginationScrollRef = useRef(currentPage > 1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pageStartIndex = currentPage > 1 ? (currentPage - 1) * PAGINATION_STEP : -1;
  const activeParams = {
    goal: activeGoal,
    network: activeNetwork,
    q: activeQuery,
    sort,
    tag: activeTag,
    type: activeType,
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !data.hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isPaginationPending) {
          startPaginationTransition(() => {
            router.replace(buildPaginationHref(currentPage + 1), { scroll: false });
          });
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [currentPage, data.hasMore, isPaginationPending, router]);

  useEffect(() => {
    if (!shouldRestorePaginationScrollRef.current || !pageAnchorRef.current) {
      return;
    }

    shouldRestorePaginationScrollRef.current = false;

    requestAnimationFrame(() => {
      pageAnchorRef.current?.scrollIntoView({ block: "start" });
      window.scrollBy({ top: -130 });
    });
  }, [data.prompts.length]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Промпты</p>
          <h1 className={styles.heroTitle}>{heroTitle}</h1>
          <p className={styles.heroDescription}>
            800+ бесплатных промптов. Копируйте, адаптируйте, запускайте.
          </p>
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
            data={data}
          />

          {data.prompts.length > 0 ? (
            <div className={styles.cards}>
              {data.prompts.map((prompt, index) => (
                <PromptCard
                  anchorRef={index === pageStartIndex ? pageAnchorRef : undefined}
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

        <PromptsSidebar activeParams={activeParams} data={data} />
      </div>

      {data.sidebarPrompts.length > 0 && (
        <section className={styles.collections}>
          <div className={styles.sectionHead}>
            <h2>Подборки</h2>
          </div>
          <div className={styles.collectionGrid}>
            {data.goals.slice(0, 4).map((goal) => (
              <Link
                className={styles.collectionCard}
                href={buildPromptsHref({ goal: goal.slug })}
                key={`goal-${goal.id}`}
              >
                <strong>{goal.title}</strong>
                <span>{getGoalCount(goal, data.sidebarPrompts)} промптов</span>
                <small>Смотреть</small>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function SearchAndFilters({
  activeParams,
  data,
}: {
  activeParams: PromptFilterParams;
  data: PromptsPageData;
}) {
  return (
    <section className={styles.filtersPanel}>
      <form action="/prompts" className={styles.searchForm}>
        <AiOutlineSearch aria-hidden="true" className={styles.searchIcon} />
        <input
          aria-label="Поиск по промптам"
          defaultValue={activeParams.q || ""}
          name="q"
          placeholder="Поиск по промптам, стилям, нейросетям..."
          type="search"
        />
        {activeParams.type && <input name="type" type="hidden" value={activeParams.type} />}
        {activeParams.tag && <input name="tag" type="hidden" value={activeParams.tag} />}
        {activeParams.network && (
          <input name="network" type="hidden" value={activeParams.network} />
        )}
        {activeParams.goal && <input name="goal" type="hidden" value={activeParams.goal} />}
        {activeParams.sort && activeParams.sort !== "fresh" && (
          <input name="sort" type="hidden" value={activeParams.sort} />
        )}
        <button type="submit">
          Найти
          <FaArrowRight aria-hidden="true" />
        </button>
      </form>

      <div className={styles.typeTabs} aria-label="Типы промптов">
        <Link
          className={`${styles.typeTab} ${!activeParams.type ? styles.typeTabActive : ""}`}
          href={buildPromptsHref({ ...activeParams, type: null })}
        >
          Все
        </Link>
        {data.types.map((type) => (
          <Link
            className={`${styles.typeTab} ${
              activeParams.type === type.slug ? styles.typeTabActive : ""
            }`}
            href={buildPromptsHref({ ...activeParams, type: type.slug })}
            key={`type-${type.id}`}
          >
            {type.title}
          </Link>
        ))}
      </div>

      <div className={styles.sortTabs}>
        <Link
          className={`${styles.sortTab} ${activeParams.sort === "fresh" ? styles.sortTabActive : ""}`}
          href={buildPromptsHref({ ...activeParams, sort: "fresh" })}
        >
          Свежее
        </Link>
        <Link
          className={`${styles.sortTab} ${activeParams.sort === "popular" ? styles.sortTabActive : ""}`}
          href={buildPromptsHref({ ...activeParams, sort: "popular" })}
        >
          Популярное
        </Link>
        <Link
          className={`${styles.sortTab} ${activeParams.sort === "old" ? styles.sortTabActive : ""}`}
          href={buildPromptsHref({ ...activeParams, sort: "old" })}
        >
          Старые
        </Link>
      </div>
    </section>
  );
}

function buildPaginationHref(page: number): string {
  const url = new URL(window.location.href);

  if (page <= 1) {
    url.searchParams.delete("page");
  } else {
    url.searchParams.set("page", String(page));
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function PromptCard({
  anchorRef,
  prompt,
}: {
  anchorRef?: Ref<HTMLAnchorElement>;
  prompt: PromptItem;
}) {
  const type = prompt.types[0];

  return (
    <Link className={styles.card} href={prompt.href} ref={anchorRef}>
      <span className={styles.cardImage}>
        {prompt.image ? (
          <Image
            alt={prompt.image.title}
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
  return (
    <SmartStickySidebar className={styles.sidebar}>
      <SidebarPanel title="Категории">
        <div className={styles.categoryList}>
          {data.goals.slice(0, 8).map((goal) => (
            <SidebarCountLink
              active={activeParams.goal === goal.slug}
              count={getGoalCount(goal, data.sidebarPrompts)}
              href={buildPromptsHref({
                ...activeParams,
                goal: activeParams.goal === goal.slug ? null : goal.slug,
              })}
              key={`sidebar-goal-${goal.id}`}
              title={goal.title}
            />
          ))}
        </div>
      </SidebarPanel>

      <SidebarPanel title="По нейросети">
        <div className={styles.networkCloud}>
          {data.neuralNetworks.map((network) => (
            <Link
              className={`${styles.networkChip} ${
                activeParams.network === network.slug ? styles.networkChipActive : ""
              }`}
              href={buildPromptsHref({
                ...activeParams,
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

      <SidebarPanel title="Популярные теги">
        <div className={styles.tagCloud}>
          {data.tags.slice(0, 18).map((tag) => (
            <Link
              className={`${styles.tagChip} ${
                activeParams.tag === tag.slug ? styles.tagChipActive : ""
              }`}
              href={buildPromptsHref({
                ...activeParams,
                tag: activeParams.tag === tag.slug ? null : tag.slug,
              })}
              key={`tag-${tag.id}`}
            >
              #{tag.title}
            </Link>
          ))}
        </div>
      </SidebarPanel>

      <div className={styles.telegramCard}>
        <div className={styles.telegramHead}>
          <span>
            <FaTelegram aria-hidden="true" />
          </span>
          <strong>Подпишись на Telegram</strong>
        </div>
        <p>10 000+ подписчиков. Лучшие промпты каждую неделю.</p>
        <a href="https://t.me/neuroluv" rel="noreferrer" target="_blank">
          Подписаться
          <FaArrowRight aria-hidden="true" />
        </a>
      </div>
    </SmartStickySidebar>
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

function getGoalCount(goal: PromptTaxonomy, prompts: PromptItem[]): number {
  return prompts.filter((prompt) => prompt.goal?.slug === goal.slug).length;
}

function buildPromptsHref(params: PromptFilterParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.type) {
    searchParams.set("type", params.type);
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

  const query = searchParams.toString();

  return query ? `/prompts?${query}` : "/prompts";
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode, Ref } from "react";
import { useEffect, useMemo, useRef, useTransition } from "react";
import { FaEye, FaTelegram } from "react-icons/fa";

import type {
  NewsItem,
  NewsPageData,
  NewsSortOrder,
  NewsTaxonomy,
} from "@/entities/news";
import {
  ContentListControls,
  type ContentListFilter,
  type ContentListSortOption,
} from "@/shared/ui/content-list-controls";
import { ScrollTopButton } from "@/shared/ui/scroll-top-button";
import { SmartStickySidebar } from "@/shared/ui/smart-sticky-sidebar";

import styles from "./NewsPage.module.scss";

type NewsPageProps = {
  activeQuery: string | null;
  activeTag: string | null;
  activeTopic: string | null;
  config?: ContentListPageConfig;
  currentPage: number;
  data: NewsPageData;
  sort: NewsSortOrder;
};

export type ContentListPageConfig = {
  basePath: string;
  heroDescription: string;
  heroEyebrow: string;
  heroImageSrc: string;
  heroTitle: string;
  itemLabel: string;
  latestTitle: string;
};

type FilterOption = {
  id: string;
  kind: "all" | "tag" | "topic";
  label: string;
  slug: string;
};

const PAGINATION_STEP = 30;

const DEFAULT_CONFIG: ContentListPageConfig = {
  basePath: "/news",
  heroDescription:
    "Коротко и по делу рассказываем о новых моделях, инструментах, обновлениях и трендах, которые важны креаторам, маркетологам и бизнесу.",
  heroEyebrow: "Новости",
  heroImageSrc: "/images/news-hero-person.png",
  heroTitle: "Следим за тем, что меняется в AI-сфере",
  itemLabel: "Новости",
  latestTitle: "Последние новости",
};

export function NewsPage({
  activeQuery,
  activeTag,
  activeTopic,
  config = DEFAULT_CONFIG,
  currentPage,
  data,
  sort,
}: NewsPageProps) {
  const router = useRouter();
  const [isPaginationPending, startPaginationTransition] = useTransition();
  const pageAnchorRef = useRef<HTMLAnchorElement>(null);
  const shouldRestorePaginationScrollRef = useRef(currentPage > 1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const activeFilterKey = getActiveFilterKey(activeTopic, activeTag);
  const featuredNews = data.news[0] || null;
  const gridNews = data.news.slice(1);
  const pageStartIndex = currentPage > 1 ? (currentPage - 1) * PAGINATION_STEP : -1;

  const filters = useMemo(
    () => buildFilterOptions(data.topics, data.tags),
    [data.tags, data.topics],
  );

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
  }, [data.news.length]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroPattern} />
        <div className={styles.heroImage}>
          <Image
            priority
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 620px"
            src={config.heroImageSrc}
          />
        </div>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>{config.heroEyebrow}</p>
          <h1 className={styles.heroTitle}>{config.heroTitle}</h1>
          <p className={styles.heroDescription}>{config.heroDescription}</p>
        </div>
      </section>

      <div className={styles.contentShell}>
        <div className={styles.mainColumn}>
          <FilterBar
            activeFilterKey={activeFilterKey}
            activeQuery={activeQuery}
            activeTag={activeTag}
            activeTopic={activeTopic}
            basePath={config.basePath}
            filters={filters}
            sort={sort}
          />

          {featuredNews ? (
            <>
              <FeaturedNewsCard
                anchorRef={pageStartIndex === 0 ? pageAnchorRef : undefined}
                item={featuredNews}
                label={config.itemLabel}
              />

              {gridNews.length > 0 && (
                <div className={styles.grid}>
                  {gridNews.map((item, index) => (
                    <NewsCard
                      anchorRef={
                        index + 1 === pageStartIndex ? pageAnchorRef : undefined
                      }
                      item={item}
                      key={`news-card-${item.id}-${index}`}
                      label={config.itemLabel}
                    />
                  ))}
                </div>
              )}
            </>
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

        <NewsSidebar
          activeFilterKey={activeFilterKey}
          basePath={config.basePath}
          filters={filters.filter((filter) => filter.kind !== "all")}
          latestTitle={config.latestTitle}
          news={data.sidebarNews}
          sort={sort}
        />
      </div>

      <DigestCta />
      <ScrollTopButton />
    </div>
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

function FilterBar({
  activeFilterKey,
  activeQuery,
  activeTag,
  activeTopic,
  basePath,
  filters,
  sort,
}: {
  activeFilterKey: string;
  activeQuery: string | null;
  activeTag: string | null;
  activeTopic: string | null;
  basePath: string;
  filters: FilterOption[];
  sort: NewsSortOrder;
}) {
  const controlFilters: ContentListFilter[] = filters.map((filter) => ({
    id: filter.id,
    href: buildNewsHref({
      basePath,
      filter,
      q: activeQuery,
      sort,
    }),
    isActive: activeFilterKey === getFilterKey(filter),
    label: filter.label,
  }));
  const sortOptions: ContentListSortOption[] = [
    {
      href: buildNewsHref({
        basePath,
        q: activeQuery,
        sort: "fresh",
        tag: activeTag,
        topic: activeTopic,
      }),
      isActive: sort === "fresh",
      label: "По свежести",
      value: "fresh",
    },
    {
      href: buildNewsHref({
        basePath,
        q: activeQuery,
        sort: "old",
        tag: activeTag,
        topic: activeTopic,
      }),
      isActive: sort === "old",
      label: "Сначала старые",
      value: "old",
    },
  ];

  return (
    <ContentListControls
      action={basePath}
      filters={controlFilters}
      hiddenInputs={{
        sort: sort !== "fresh" ? sort : null,
        tag: activeTag,
        topic: activeTopic,
      }}
      resetHref={basePath}
      searchDefaultValue={activeQuery}
      searchLabel="Поиск по материалам"
      searchPlaceholder="Поиск по темам, тегам и материалам..."
      sortOptions={sortOptions}
    />
  );
}

function FeaturedNewsCard({
  anchorRef,
  item,
  label,
}: {
  anchorRef?: Ref<HTMLAnchorElement>;
  item: NewsItem;
  label: string;
}) {
  return (
    <Link className={styles.featuredCard} href={item.href} ref={anchorRef}>
      <NewsImage className={styles.featuredImage} image={item.image} priority />
      <span className={styles.featuredOverlay} />
      <span className={styles.featuredContent}>
        <TopicBadge item={item} label={label} />
        <span className={styles.featuredTitle}>{item.title}</span>
        {item.miniDescription && (
          <span className={styles.featuredDescription}>
            {item.miniDescription}
          </span>
        )}
        <NewsMeta item={item} isDark />
      </span>
    </Link>
  );
}

function NewsCard({
  anchorRef,
  item,
  label,
}: {
  anchorRef?: Ref<HTMLAnchorElement>;
  item: NewsItem;
  label: string;
}) {
  return (
    <Link className={styles.card} href={item.href} ref={anchorRef}>
      <NewsImage className={styles.cardImage} image={item.image} />
      <span className={styles.cardBody}>
        <TopicBadge item={item} label={label} />
        <span className={styles.cardTitle}>{item.title}</span>
        {item.miniDescription && (
          <span className={styles.cardDescription}>{item.miniDescription}</span>
        )}
      </span>
      <NewsMeta item={item} />
    </Link>
  );
}

function NewsImage({
  className,
  image,
  priority,
}: {
  className: string;
  image: NewsItem["image"];
  priority?: boolean;
}) {
  return (
    <span className={className}>
      {image ? (
        <Image
          alt={image.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 62vw, 900px"
          src={image.url}
        />
      ) : (
        <span className={styles.imagePlaceholder}>AI</span>
      )}
    </span>
  );
}

function TopicBadge({ item, label }: { item: NewsItem; label: string }) {
  const badgeLabel = item.topic?.title || item.tags[0]?.title || label;

  return <span className={styles.badge}>{badgeLabel}</span>;
}

function NewsMeta({ item, isDark }: { item: NewsItem; isDark?: boolean }) {
  return (
    <span className={`${styles.meta} ${isDark ? styles.metaDark : ""}`}>
      <span className={styles.author}>
        <AuthorAvatar item={item} />
        <span>{item.author?.name || "Нейролюб"}</span>
      </span>
      <span className={styles.metaDetails}>
        {item.publishedAtLabel && <span>{item.publishedAtLabel}</span>}
        {item.readTime && <span>{item.readTime} мин</span>}
        {item.viewsCount !== null && (
          <span className={styles.viewsMeta}>
            {item.viewsCount} 
            <FaEye aria-hidden="true" aria-label="Просмотры" />
          </span>
        )}
      </span>
    </span>
  );
}

function AuthorAvatar({ item }: { item: NewsItem }) {
  const avatar = item.author?.avatar;

  if (avatar) {
    return (
      <span className={styles.avatar}>
        <Image alt="" fill sizes="28px" src={avatar.url} />
      </span>
    );
  }

  return <span className={styles.avatarFallback}>Н</span>;
}

function NewsSidebar({
  activeFilterKey,
  basePath,
  filters,
  latestTitle,
  news,
  sort,
}: {
  activeFilterKey: string;
  basePath: string;
  filters: FilterOption[];
  latestTitle: string;
  news: NewsItem[];
  sort: NewsSortOrder;
}) {
  const trendNews = news.slice(0, 5);
  const latestNews = news.slice(0, 4);
  const visibleFilters = filters.slice(0, 12);

  return (
    <SmartStickySidebar className={styles.sidebar}>
      {trendNews.length > 0 && (
        <SidebarPanel title="В тренде">
          <ol className={styles.trendList}>
            {trendNews.map((item, index) => (
              <li className={styles.trendItem} key={`trend-${item.id}-${index}`}>
                <span className={styles.trendNumber}>{index + 1}</span>
                <Link className={styles.trendLink} href={item.href}>
                  {item.title}
                </Link>
              </li>
            ))}
          </ol>
        </SidebarPanel>
      )}

      {visibleFilters.length > 0 && (
        <SidebarPanel title="Популярные темы">
          <div className={styles.topicCloud}>
            {visibleFilters.map((filter, index) => {
              const isActive = activeFilterKey === getFilterKey(filter);

              return (
              <Link
                className={`${styles.topicChip} ${
                  isActive ? styles.topicChipActive : ""
                }`}
                href={
                  isActive
                    ? buildNewsHref({ basePath, sort })
                    : buildNewsHref({ basePath, filter, sort })
                }
                key={`topic-${filter.id}-${index}`}
              >
                <span>{filter.label}</span>
                {isActive && <span className={styles.topicReset}>×</span>}
              </Link>
              );
            })}
          </div>
        </SidebarPanel>
      )}

      <div className={styles.telegramPanel}>
        <p className={styles.telegramTitle}>Подпишись на наш Telegram</p>
        <p className={styles.telegramText}>
          Чтобы не пропустить новости и полезные разборы по AI.
        </p>
        <a
          className={styles.telegramButton}
          href="https://t.me/neuroluv"
          rel="noreferrer"
          target="_blank"
        >
          Подписаться
          <FaTelegram aria-hidden="true" className={styles.telegramIcon} />
        </a>
      </div>

      {latestNews.length > 0 && (
        <SidebarPanel title={latestTitle}>
          <div className={styles.latestList}>
            {latestNews.map((item, index) => (
              <Link
                className={styles.latestItem}
                href={item.href}
                key={`latest-${item.id}-${index}`}
              >
                <NewsImage className={styles.latestImage} image={item.image} />
                <span className={styles.latestText}>
                  <span className={styles.latestTitle}>{item.title}</span>
                  <span className={styles.latestDate}>{item.publishedAtLabel}</span>
                </span>
              </Link>
            ))}
          </div>
        </SidebarPanel>
      )}
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
      <h2 className={styles.sidebarTitle}>{title}</h2>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>Новостей пока нет</p>
      <p className={styles.emptyText}>
        Когда в Directus появятся опубликованные новости, они отобразятся здесь.
      </p>
    </div>
  );
}

function DigestCta() {
  return (
    <section className={styles.digest}>
      <div className={styles.digestText}>
        <h2 className={styles.digestTitle}>Получайте дайджест Нейролюба</h2>
        <p className={styles.digestDescription}>
          Раз в неделю — лучшие новости, статьи, промпты и идеи для AI-контента.
        </p>
      </div>
      <Image
        alt=""
        className={styles.digestImage}
        height={220}
        src="/images/news-hero-person.png"
        width={220}
      />
      <a
        className={styles.digestButton}
        href="https://t.me/neuroluv"
        rel="noreferrer"
        target="_blank"
      >
        Подписаться
        <FaTelegram aria-hidden="true" className={styles.digestIcon} />
      </a>
    </section>
  );
}

function buildFilterOptions(
  topics: NewsTaxonomy[],
  tags: NewsTaxonomy[],
): FilterOption[] {
  const options = new Map<string, FilterOption>();

  options.set("all", {
    id: "all",
    kind: "all",
    label: "Все",
    slug: "all",
  });

  topics.forEach((item) => {
    const key = `topic:${item.slug}`;

    if (!options.has(key)) {
      options.set(key, {
        id: key,
        kind: "topic",
        label: item.title,
        slug: item.slug,
      });
    }
  });

  tags.forEach((item) => {
    const key = `tag:${item.slug}`;

    if (!options.has(key)) {
      options.set(key, {
        id: key,
        kind: "tag",
        label: item.title,
        slug: item.slug,
      });
    }
  });

  return [...options.values()];
}

function getFilterKey(filter: FilterOption): string {
  if (filter.kind === "all") {
    return "all";
  }

  return `${filter.kind}:${filter.slug}`;
}

function getActiveFilterKey(topic: string | null, tag: string | null): string {
  if (topic) {
    return `topic:${topic}`;
  }

  if (tag) {
    return `tag:${tag}`;
  }

  return "all";
}

function buildNewsHref({
  basePath,
  filter,
  q,
  sort,
  tag,
  topic,
}: {
  basePath: string;
  filter?: FilterOption;
  q?: string | null;
  sort: NewsSortOrder;
  tag?: string | null;
  topic?: string | null;
}): string {
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (sort === "old") {
    params.set("sort", "old");
  }

  if (filter) {
    if (filter.kind === "topic") {
      params.set("topic", filter.slug);
    }

    if (filter.kind === "tag") {
      params.set("tag", filter.slug);
    }
  } else {
    if (topic) {
      params.set("topic", topic);
    }

    if (tag) {
      params.set("tag", tag);
    }
  }

  const query = params.toString();

  return query ? `${basePath}?${query}` : basePath;
}

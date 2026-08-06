"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { FaEye, FaTelegram } from "react-icons/fa";

import type {
  NewsItem,
  NewsPageData,
  NewsSortOrder,
  NewsTaxonomy,
} from "@/entities/news";
import {
  ContentListControls,
  type ContentListSortOption,
} from "@/shared/ui/content-list-controls";
import { removePaginationParamFromAddressBar } from "@/shared/lib/url/remove-pagination-param";
import { Noindex } from "@/shared/ui/noindex";
import { ScrollTopButton } from "@/shared/ui/scroll-top-button";
import { SmartStickySidebar } from "@/shared/ui/smart-sticky-sidebar";

import styles from "./NewsPage.module.scss";

type NewsPageProps = {
  activeQuery: string | null;
  activeTag: string | null;
  activeTopic: string | null;
  config?: ContentListPageConfig;
  data: NewsPageData;
  showDefaultHero?: boolean;
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
  data,
  showDefaultHero = true,
  sort,
}: NewsPageProps) {
  const [localData, setLocalData] = useState(data);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPaginationPending, setIsPaginationPending] = useState(false);
  const isPaginationLoadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const featuredNews = localData.news[0] || null;
  const gridNews = localData.news.slice(1);

  useEffect(removePaginationParamFromAddressBar, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !localData.hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isPaginationLoadingRef.current) {
          void loadNextNewsPage({
            activeQuery,
            activeTag,
            activeTopic,
            basePath: config.basePath,
            currentPage,
            onComplete: (nextData) => {
              setLocalData((currentData) =>
                appendNewsPageData(currentData, nextData),
              );
              setCurrentPage((page) => page + 1);
            },
            setIsPending: setIsPaginationPending,
            sort,
            statusRef: isPaginationLoadingRef,
          });
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [
    activeQuery,
    activeTag,
    activeTopic,
    config.basePath,
    currentPage,
    localData.hasMore,
    sort,
  ]);

  return (
    <div className={`${styles.page} ${showDefaultHero ? "" : styles.pageWithoutHero}`}>
      {showDefaultHero && (
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
      )}

      <div className={styles.contentShell}>
        <div className={styles.mainColumn}>
          <FilterBar
            activeQuery={activeQuery}
            activeTag={activeTag}
            activeTopic={activeTopic}
            basePath={config.basePath}
            sort={sort}
          />

          {featuredNews ? (
            <>
              <FeaturedNewsCard
                item={featuredNews}
                label={config.itemLabel}
              />

              {gridNews.length > 0 && (
                <div className={styles.grid}>
                  {gridNews.map((item, index) => (
                    <NewsCard
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
          activeQuery={activeQuery}
          activeTag={activeTag}
          activeTopic={activeTopic}
          basePath={config.basePath}
          latestTitle={config.latestTitle}
          news={localData.sidebarNews}
          sort={sort}
          tags={localData.tags}
          topics={localData.topics}
        />
      </div>

      <ScrollTopButton />
    </div>
  );
}

function FilterBar({
  activeQuery,
  activeTag,
  activeTopic,
  basePath,
  sort,
}: {
  activeQuery: string | null;
  activeTag: string | null;
  activeTopic: string | null;
  basePath: string;
  sort: NewsSortOrder;
}) {
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
      filters={[]}
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
  item,
  label,
}: {
  item: NewsItem;
  label: string;
}) {
  return (
    <Link className={styles.featuredCard} href={item.href}>
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
  item,
  label,
}: {
  item: NewsItem;
  label: string;
}) {
  return (
    <Link className={styles.card} href={item.href}>
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
  activeQuery,
  activeTag,
  activeTopic,
  basePath,
  latestTitle,
  news,
  sort,
  tags,
  topics,
}: {
  activeQuery: string | null;
  activeTag: string | null;
  activeTopic: string | null;
  basePath: string;
  latestTitle: string;
  news: NewsItem[];
  sort: NewsSortOrder;
  tags: NewsTaxonomy[];
  topics: NewsTaxonomy[];
}) {
  const latestNews = news.slice(0, 4);
  const visibleTopics = topics.slice(0, 8);
  const visibleTags = tags.slice(0, 18);

  return (
    <Noindex>
    <SmartStickySidebar className={styles.sidebar}>
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

      {visibleTopics.length > 0 && (
        <SidebarPanel title="Темы">
          <div className={styles.categoryList}>
            {visibleTopics.map((topic) => {
              const isActive = activeTopic === topic.slug;

              return (
                <SidebarTaxonomyLink
                  active={isActive}
                  href={buildNewsHref({
                    basePath,
                    q: activeQuery,
                    sort,
                    tag: null,
                    topic: isActive ? null : topic.slug,
                  })}
                  key={`sidebar-topic-${topic.id}`}
                  title={topic.title}
                />
              );
            })}
          </div>
        </SidebarPanel>
      )}

      {visibleTags.length > 0 && (
        <SidebarPanel title="Теги">
          <div className={styles.tagCloud}>
            {visibleTags.map((tag) => {
              const isActive = activeTag === tag.slug;

              return (
                <Link
                  className={`${styles.tagChip} ${
                    isActive ? styles.tagChipActive : ""
                  }`}
                  href={buildNewsHref({
                    basePath,
                    q: activeQuery,
                    sort,
                    tag: isActive ? null : tag.slug,
                    topic: null,
                  })}
                  key={`sidebar-tag-${tag.id}`}
                >
                  #{tag.title}
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
    </SmartStickySidebar>
    </Noindex>
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

function SidebarTaxonomyLink({
  active,
  href,
  title,
}: {
  active: boolean;
  href: string;
  title: string;
}) {
  return (
    <Link
      className={`${styles.categoryLink} ${active ? styles.categoryLinkActive : ""}`}
      href={href}
    >
      <span>{title}</span>
      {active && <small>×</small>}
    </Link>
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

function buildNewsHref({
  basePath,
  q,
  sort,
  tag,
  topic,
}: {
  basePath: string;
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

  if (topic) {
    params.set("topic", topic);
  } else if (tag) {
    params.set("tag", tag);
  }

  const query = params.toString();

  return query ? `${basePath}?${query}` : basePath;
}

async function loadNextNewsPage({
  activeQuery,
  activeTag,
  activeTopic,
  basePath,
  currentPage,
  onComplete,
  setIsPending,
  sort,
  statusRef,
}: {
  activeQuery: string | null;
  activeTag: string | null;
  activeTopic: string | null;
  basePath: string;
  currentPage: number;
  onComplete: (data: NewsPageData) => void;
  setIsPending: (value: boolean) => void;
  sort: NewsSortOrder;
  statusRef: { current: boolean };
}) {
  statusRef.current = true;
  setIsPending(true);

  try {
    const response = await fetch(
      buildNewsApiHref({
        basePath,
        page: currentPage + 1,
        q: activeQuery,
        sort,
        tag: activeTag,
        topic: activeTopic,
      }),
    );

    if (!response.ok) {
      return;
    }

    onComplete((await response.json()) as NewsPageData);
  } finally {
    statusRef.current = false;
    setIsPending(false);
  }
}

function appendNewsPageData(
  currentData: NewsPageData,
  nextData: NewsPageData,
): NewsPageData {
  const knownIds = new Set(currentData.news.map((item) => item.id));

  return {
    hasMore: nextData.hasMore,
    news: [
      ...currentData.news,
      ...nextData.news.filter((item) => !knownIds.has(item.id)),
    ],
    sidebarNews:
      nextData.sidebarNews.length > 0
        ? nextData.sidebarNews
        : currentData.sidebarNews,
    tags: nextData.tags.length > 0 ? nextData.tags : currentData.tags,
    topics:
      nextData.topics.length > 0 ? nextData.topics : currentData.topics,
  };
}

function buildNewsApiHref({
  basePath,
  page,
  q,
  sort,
  tag,
  topic,
}: {
  basePath: string;
  page: number;
  q?: string | null;
  sort: NewsSortOrder;
  tag?: string | null;
  topic?: string | null;
}): string {
  const params = new URLSearchParams();

  params.set("page", String(page));

  if (q) {
    params.set("q", q);
  }

  if (sort === "old") {
    params.set("sort", "old");
  }

  if (topic) {
    params.set("topic", topic);
  } else if (tag) {
    params.set("tag", tag);
  }

  const endpoint = basePath === "/articles" ? "/api/articles" : "/api/news";

  return `${endpoint}?${params.toString()}`;
}

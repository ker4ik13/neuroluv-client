import Image from "next/image";
import Link from "next/link";
import { FaArrowRight, FaEye, FaTelegram } from "react-icons/fa";
import { FaVk } from "react-icons/fa6";

import type { NewsContentBlock, NewsDetail, NewsItem } from "@/entities/news";
import { SHARE_SITE_URL } from "@/shared/config/site";
import {
  buildContentHeadings,
  ContentBlocks,
  ContentToc,
} from "@/shared/ui/content-blocks";
import { Noindex } from "@/shared/ui/noindex";
import { SmartStickySidebar } from "@/shared/ui/smart-sticky-sidebar";
import { AuthorCard } from "@/shared/ui/author-card";

import styles from "./ContentDetailPage.module.scss";

type ContentDetailPageProps = {
  basePath?: string;
  contentLabel?: string;
  item: NewsDetail;
  related: NewsItem[];
  relatedTitle?: string;
};

export function ContentDetailPage({
  basePath = "/news",
  contentLabel = "Новость",
  item,
  related,
  relatedTitle = "Читайте также",
}: ContentDetailPageProps) {
  const shareHref = buildTelegramShareHref(item, basePath);
  const vkShareHref = buildVkShareHref(item, basePath);
  const headings = buildContentHeadings(item.contentBlocks);
  const sidebarCta = item.miniCta || getSidebarCta(item.contentBlocks);

  return (
    <main className={styles.page}>
      <DetailHero contentLabel={contentLabel} item={item} />

      <div className={styles.layout}>
        <article className={styles.article}>
          {headings.length > 0 && <ContentToc headings={headings} />}

          {item.contentBlocks.length > 0 ? (
            <ContentBlocks blocks={item.contentBlocks} headings={headings} />
          ) : (
            <div className={styles.htmlBlock}>
              <h2>Коротко</h2>
              <p>{item.description}</p>
            </div>
          )}
        </article>

        <Noindex>
          <SmartStickySidebar className={styles.sidebar}>
            <AuthorSidebarCard
              item={item}
              shareHref={shareHref}
              vkShareHref={vkShareHref}
            />
            {sidebarCta && <SidebarCta block={sidebarCta} />}
          </SmartStickySidebar>
        </Noindex>
      </div>

      {related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedTitle}>{relatedTitle}</h2>
          <div className={styles.relatedGrid}>
            {related.map((news, index) => (
              <RelatedCard
                contentLabel={contentLabel}
                item={news}
                key={`related-${news.id}-${index}`}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

type NewsCtaBlock = Extract<NewsContentBlock, { type: "cta" }>;

function SidebarCta({ block }: { block: NewsCtaBlock }) {
  return (
    <div className={styles.sideCta}>
      <p className={styles.sideCtaTitle}>{block.title}</p>
      <p className={styles.sideCtaText}>{block.description}</p>
      {block.buttons.map((button, index) => (
        <a
          className={styles.sideCtaButton}
          href={button.href}
          key={`sidebar-cta-${button.id}-${index}`}
          rel={button.target === "_blank" ? "noreferrer" : undefined}
          target={button.target}
        >
          {button.label}
          <FaArrowRight aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function AuthorSidebarCard({
  item,
  shareHref,
  vkShareHref,
}: {
  item: NewsDetail;
  shareHref: string;
  vkShareHref: string;
}) {
  const authorName = item.author?.name || "Редакция Нейролюба";

  return (
    <AuthorCard
      avatarUrl={item.author?.avatar?.url}
      className={styles.authorCard}
      name={authorName}
      role={`Автор · ${item.author?.jobTitle || "AI-креатор"}`}
    >
      <div className={styles.authorShare}>
        <span className={styles.authorShareLabel}>Поделиться</span>
        <div className={styles.shareButtons}>
          <a
            aria-label="Поделиться в Telegram"
            className={styles.shareButton}
            href={shareHref}
            rel="noreferrer"
            target="_blank"
          >
            <FaTelegram aria-hidden="true" />
          </a>
          <a
            aria-label="Поделиться во ВКонтакте"
            className={styles.shareButton}
            href={vkShareHref}
            rel="noreferrer"
            target="_blank"
          >
            <FaVk aria-hidden="true" />
          </a>
        </div>
      </div>
    </AuthorCard>
  );
}

function DetailHero({
  contentLabel,
  item,
}: {
  contentLabel: string;
  item: NewsDetail;
}) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        {item.image && <HeroTags contentLabel={contentLabel} item={item} />}

        <h1 className={styles.heroTitle}>{item.title}</h1>
        <p className={styles.heroDescription}>{item.description}</p>
        {item.image && <HeroAuthorAndMeta item={item} />}

      </div>

      <div
        className={`${styles.heroVisual} ${
          item.image ? "" : styles.heroMetaPanel
        }`}
      >
        {item.image ? (
          <Image
            priority
            alt={item.image.title}
            fill
            sizes="(max-width: 1024px) 100vw, 470px"
            src={item.image.url}
          />
        ) : (
          <>
            <HeroTags contentLabel={contentLabel} item={item} />
            <span className={styles.metaPanelAuthorLabel}>Автор</span>
            <HeroAuthorAndMeta item={item} />
          </>
        )}
      </div>
    </section>
  );
}

function HeroTags({
  contentLabel,
  item,
}: {
  contentLabel: string;
  item: NewsDetail;
}) {
  return (
    <div className={styles.badges}>
      <span className={styles.badgePrimary}>{contentLabel}</span>
      {item.topic && <span className={styles.badgeMuted}>{item.topic.title}</span>}
      {item.tags.slice(0, 2).map((tag, index) => (
        <span className={styles.badgeMuted} key={`tag-${tag.id}-${index}`}>
          {tag.title}
        </span>
      ))}
    </div>
  );
}

function HeroAuthorAndMeta({ item }: { item: NewsDetail }) {
  return (
    <div className={styles.heroPublicationInfo}>
      <span className={styles.heroAuthor}>
        <AuthorAvatar item={item} />
        <span>{item.author?.name || "Редакция Нейролюба"}</span>
      </span>
      <p className={styles.heroMeta}>
        {[
          item.publishedAtLabel,
          item.readTime ? `${item.readTime} минут чтения` : null,
          item.viewsCount !== null ? `${item.viewsCount} просмотров` : null,
          item.topic?.title,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}

function RelatedCard({
  contentLabel,
  item,
}: {
  contentLabel: string;
  item: NewsItem;
}) {
  return (
    <Link className={styles.relatedCard} href={item.href}>
      <span className={styles.relatedImage}>
        {item.image ? (
          <Image
            alt={item.image.title}
            fill
            sizes="(max-width: 768px) 100vw, 380px"
            src={item.image.url}
          />
        ) : (
          <span className={styles.relatedPlaceholder}>AI</span>
        )}
      </span>
      <span className={styles.relatedBody}>
        <span className={styles.relatedBadge}>
          {item.topic?.title || item.tags[0]?.title || contentLabel}
        </span>
        <span className={styles.relatedCardTitle}>{item.title}</span>
        <span className={styles.relatedText}>{item.miniDescription}</span>
      </span>
      <span className={styles.relatedMeta}>
        <span>{item.author?.name || "Нейролюб"}</span>
        <span>
          {item.viewsCount !== null ? (
            <>
              {item.viewsCount} <FaEye aria-hidden="true" aria-label="Просмотры" />
            </>
          ) : (
            item.publishedAtLabel
          )}
        </span>
      </span>
    </Link>
  );
}

function AuthorAvatar({ item }: { item: NewsItem }) {
  const avatar = item.author?.avatar;

  if (avatar) {
    return (
      <span className={styles.heroAuthorAvatar}>
        <Image alt="" fill sizes="34px" src={avatar.url} />
      </span>
    );
  }

  return <span className={styles.heroAuthorFallback}>Н</span>;
}

function buildTelegramShareHref(item: NewsDetail, basePath: string): string {
  const path = `${basePath}/${item.slug}`;
  const text = encodeURIComponent(item.title);

  return `https://t.me/share/url?url=${encodeURIComponent(`${SHARE_SITE_URL}${path}`)}&text=${text}`;
}

function buildVkShareHref(item: NewsDetail, basePath: string): string {
  const path = `${basePath}/${item.slug}`;
  const params = new URLSearchParams({
    title: item.title,
    url: `${SHARE_SITE_URL}${path}`,
  });

  if (item.description) {
    params.set("description", item.description);
  }

  return `https://vk.ru/share.php?${params.toString()}`;
}

function getSidebarCta(blocks: NewsContentBlock[]): NewsCtaBlock | null {
  return blocks.find((block): block is NewsCtaBlock => block.type === "cta") || null;
}

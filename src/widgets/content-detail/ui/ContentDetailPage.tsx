import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FaArrowRight, FaEye, FaShareAlt, FaTelegram } from "react-icons/fa";
import { FaVk } from "react-icons/fa6";

import type { NewsContentBlock, NewsDetail, NewsItem } from "@/entities/news";
import { SITE_URL } from "@/shared/config/site";
import { CopyContentBox } from "@/shared/ui/copy-content-box";
import { Noindex } from "@/shared/ui/noindex";
import { SmartStickySidebar } from "@/shared/ui/smart-sticky-sidebar";

import styles from "./ContentDetailPage.module.scss";

type ContentDetailPageProps = {
  basePath?: string;
  contentLabel?: string;
  item: NewsDetail;
  related: NewsItem[];
  relatedTitle?: string;
};

type ArticleHeading = {
  id: string;
  title: string;
  blockId: number;
  localIndex: number;
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
  const headings = buildArticleHeadings(item.contentBlocks);
  const sidebarCta = item.miniCta || getSidebarCta(item.contentBlocks);

  return (
    <main className={styles.page}>
      <DetailHero contentLabel={contentLabel} item={item} shareHref={shareHref} />

      <div className={styles.layout}>
        <article className={styles.article}>
          {item.contentBlocks.length > 0 ? (
            item.contentBlocks.map((block, index) => (
              <ContentBlockView
                block={block}
                headings={headings}
                key={`content-block-${block.type}-${block.id}-${index}`}
              />
            ))
          ) : (
            <div className={styles.htmlBlock}>
              <h2>Коротко</h2>
              <p>{item.description}</p>
            </div>
          )}
        </article>

        <Noindex>
          <SmartStickySidebar className={styles.sidebar}>
            <SidebarPanel title="Содержание">
              <div className={styles.tocList}>
                {headings.length > 0 ? (
                  headings.map((heading) => (
                    <a
                      className={styles.tocItem}
                      href={`#${heading.id}`}
                      key={heading.id}
                    >
                      {heading.title}
                    </a>
                  ))
                ) : (
                  <span className={styles.tocItem}>Материал</span>
                )}
              </div>
            </SidebarPanel>

            <SidebarPanel title="Поделиться">
              <div className={styles.shareButtons}>
                <a
                  className={styles.shareButton}
                  href={shareHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FaTelegram aria-hidden="true" />
                </a>
                <a
                  className={styles.shareButton}
                  href={vkShareHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FaVk aria-hidden="true" />
                </a>
              </div>
            </SidebarPanel>

            <AuthorSidebarCard contentLabel={contentLabel} item={item} />
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
  contentLabel,
  item,
}: {
  contentLabel: string;
  item: NewsDetail;
}) {
  return (
    <section className={styles.authorCard}>
      <span className={styles.authorCardEyebrow}>Автор</span>
      <div className={styles.authorCardMain}>
        <AuthorAvatar item={item} />
        <span className={styles.authorCardText}>
          <strong>{item.author?.name || "Редакция Нейролюба"}</strong>
          <span>{item.author ? `${contentLabel} подготовил автор` : "Команда Нейролюба"}</span>
        </span>
      </div>
      <div className={styles.authorCardMeta}>
        {item.publishedAtLabel && <span>{item.publishedAtLabel}</span>}
        {item.readTime && <span>{item.readTime} мин</span>}
        {item.viewsCount !== null && <span>{item.viewsCount} просмотров</span>}
      </div>
    </section>
  );
}

function DetailHero({
  contentLabel,
  item,
  shareHref,
}: {
  contentLabel: string;
  item: NewsDetail;
  shareHref: string;
}) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroPattern} />
      <div className={styles.heroContent}>
        <div className={styles.badges}>
          <span className={styles.badgePrimary}>{contentLabel}</span>
          {item.topic && <span className={styles.badgeMuted}>{item.topic.title}</span>}
          {item.tags.slice(0, 2).map((tag, index) => (
            <span className={styles.badgeMuted} key={`tag-${tag.id}-${index}`}>
              {tag.title}
            </span>
          ))}
        </div>

        <h1 className={styles.heroTitle}>{item.title}</h1>
        <p className={styles.heroDescription}>{item.description}</p>
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

        <a
          className={styles.heroShare}
          href={shareHref}
          rel="noreferrer"
          target="_blank"
        >
          Поделиться
          <FaShareAlt aria-hidden="true" />
        </a>
      </div>

      <div className={styles.heroVisual}>
        {item.image ? (
          <Image
            priority
            alt={item.image.title}
            fill
            sizes="(max-width: 1024px) 100vw, 470px"
            src={item.image.url}
          />
        ) : (
          <span className={styles.heroPlaceholder}>AI</span>
        )}
      </div>
    </section>
  );
}

function ContentBlockView({
  block,
  headings,
}: {
  block: NewsContentBlock;
  headings: ArticleHeading[];
}) {
  if (block.type === "html") {
    return (
      <section className={styles.copyHtmlBlock}>
        <CopyContentBox copyText={block.content} title={block.title || "Текст"}>
          <div
            dangerouslySetInnerHTML={{
              __html: addHeadingIdsToHtml(
                block.content,
                getBlockHeadings(headings, block.id),
              ),
            }}
          />
        </CopyContentBox>
      </section>
    );
  }

  if (block.type === "text") {
    return (
      <section className={styles.textBlock}>
        {block.title && <h2 id={getBlockHeadingId(headings, block.id)}>{block.title}</h2>}
        <div
          dangerouslySetInnerHTML={{
            __html: addHeadingIdsToHtml(
              block.content,
              getBlockHeadings(headings, block.id),
            ),
          }}
        />
      </section>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote className={styles.quoteBlock}>
        {block.title && <h2 id={getBlockHeadingId(headings, block.id)}>{block.title}</h2>}
        <p>{block.text}</p>
        {block.author && (
          <footer>
            <cite>{block.author}</cite>
          </footer>
        )}
      </blockquote>
    );
  }

  if (block.type === "video") {
    const headingId = getBlockHeadingId(headings, block.id);

    return (
      <figure className={styles.videoBlock}>
        {block.title && <h2 id={headingId}>{block.title}</h2>}
        {block.video ? (
          <video controls playsInline preload="metadata" src={block.video.url} />
        ) : (
          <a href={block.videoUrl || "#"} rel="noreferrer" target="_blank">
            Смотреть видео
          </a>
        )}
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </figure>
    );
  }

  if (block.type === "list") {
    const headingId = getBlockHeadingId(headings, block.id);

    return (
      <section className={styles.listBlock}>
        {block.title && <h2 id={headingId}>{block.title}</h2>}
        <div className={styles.listItems}>
          {block.items.map((item, index) => (
            <div className={styles.listItem} key={`list-item-${item.id}-${index}`}>
              <p className={styles.listItemTitle}>{item.title}</p>
              <p className={styles.listItemText}>{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "image") {
    return (
      <figure className={styles.imageBlock}>
        <span className={styles.imageWrap}>
          <Image
            alt={block.image.title}
            fill
            sizes="(max-width: 1024px) 100vw, 840px"
            src={block.image.url}
          />
        </span>
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </figure>
    );
  }

  if (block.type === "cta") {
    const headingId = getBlockHeadingId(headings, block.id);

    return (
      <section className={styles.ctaBlock}>
        <div>
          <h2 id={headingId}>{block.title}</h2>
          <p>{block.description}</p>
        </div>
        {block.buttons.length > 0 && (
          <div className={styles.ctaButtons}>
            {block.buttons.map((button, index) => (
              <a
                className={`${styles.ctaButton} ${
                  button.variant === "outline" ? styles.ctaButtonOutline : ""
                }`}
                href={button.href}
                key={`cta-button-${button.id}-${index}`}
                rel={button.target === "_blank" ? "noreferrer" : undefined}
                target={button.target}
              >
                {button.label}
              </a>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (block.type === "cards") {
    const headingId = getBlockHeadingId(headings, block.id);

    return (
      <section className={styles.cardsBlock}>
        {block.title && <h2 id={headingId}>{block.title}</h2>}
        <div className={styles.contentCards}>
          {block.cards.map((card, index) => {
            const content = (
              <>
                {card.image && (
                  <span className={styles.contentCardImage}>
                    <Image
                      alt={card.image.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 260px"
                      src={card.image.url}
                    />
                  </span>
                )}
                <span className={styles.contentCardText}>
                  <span>{card.title}</span>
                  <small>{card.description}</small>
                </span>
              </>
            );

            if (card.href) {
              return (
                <Link
                  className={styles.contentCard}
                  href={card.href}
                  key={`content-card-${card.id}-${index}`}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                className={styles.contentCard}
                key={`content-card-${card.id}-${index}`}
              >
                {content}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (block.type === "steps") {
    const headingId = getBlockHeadingId(headings, block.id);

    return (
      <section className={styles.stepsBlock}>
        {block.title && <h2 id={headingId}>{block.title}</h2>}
        <div className={styles.stepsList}>
          {block.steps.map((step, index) => (
            <div className={styles.stepItem} key={`step-${step.id}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p>{step.title}</p>
                <small>{step.description}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return null;
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
          {item.viewsCount !== null
            ? `${item.viewsCount} `
            : item.publishedAtLabel}
          <FaEye aria-hidden="true" aria-label="Просмотры" />
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

  return `https://t.me/share/url?url=${encodeURIComponent(`${SITE_URL}${path}`)}&text=${text}`;
}

function buildVkShareHref(item: NewsDetail, basePath: string): string {
  const path = `${basePath}/${item.slug}`;
  const params = new URLSearchParams({
    title: item.title,
    url: `${SITE_URL}${path}`,
  });

  if (item.description) {
    params.set("description", item.description);
  }

  return `https://vk.com/share.php?${params.toString()}`;
}

function getSidebarCta(blocks: NewsContentBlock[]): NewsCtaBlock | null {
  return blocks.find((block): block is NewsCtaBlock => block.type === "cta") || null;
}

function buildArticleHeadings(blocks: NewsContentBlock[]): ArticleHeading[] {
  const usedIds = new Map<string, number>();
  const headings: ArticleHeading[] = [];

  blocks.forEach((block) => {
    if (block.type === "html") {
      extractHtmlHeadings(block.content).forEach((title, localIndex) => {
        headings.push({
          id: createUniqueHeadingId(title, usedIds),
          title,
          blockId: block.id,
          localIndex,
        });
      });

      return;
    }

    const title = getContentBlockTitle(block);

    if (title) {
      headings.push({
        id: createUniqueHeadingId(title, usedIds),
        title,
        blockId: block.id,
        localIndex: 0,
      });
    }
  });

  return headings;
}

function extractHtmlHeadings(html: string): string[] {
  return [...html.matchAll(/<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/gi)]
    .map((match) => stripHtml(match[1] || "").trim())
    .filter(Boolean);
}

function addHeadingIdsToHtml(html: string, headings: ArticleHeading[]): string {
  let index = 0;

  return html.replace(
    /<(h[2-3])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag: string, attributes: string, content: string) => {
      const heading = headings[index];
      index += 1;

      if (!heading) {
        return match;
      }

      const cleanAttributes = attributes.replace(/\s+id=(["']).*?\1/i, "");

      return `<${tag}${cleanAttributes} id="${heading.id}">${content}</${tag}>`;
    },
  );
}

function getContentBlockTitle(block: NewsContentBlock): string | null {
  if (
    block.type === "text" ||
    block.type === "video" ||
    block.type === "list" ||
    block.type === "cta" ||
    block.type === "cards" ||
    block.type === "steps"
  ) {
    return block.title;
  }

  return null;
}

function getBlockHeadings(
  headings: ArticleHeading[],
  blockId: number,
): ArticleHeading[] {
  return headings.filter((heading) => heading.blockId === blockId);
}

function getBlockHeadingId(
  headings: ArticleHeading[],
  blockId: number,
): string | undefined {
  return headings.find((heading) => heading.blockId === blockId)?.id;
}

function createUniqueHeadingId(
  title: string,
  usedIds: Map<string, number>,
): string {
  const baseId = slugify(title) || "section";
  const count = usedIds.get(baseId) || 0;

  usedIds.set(baseId, count + 1);

  return count === 0 ? baseId : `${baseId}-${count + 1}`;
}

function slugify(value: string): string {
  return stripHtml(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BsArrowRight, BsEye, BsShareFill } from "react-icons/bs";
import { FaTelegram } from "react-icons/fa6";

import type { NewsContentBlock, NewsDetail, NewsItem } from "@/entities/news";

import styles from "./ContentDetailPage.module.scss";

type ContentDetailPageProps = {
  item: NewsDetail;
  related: NewsItem[];
};

type ArticleHeading = {
  id: string;
  title: string;
  blockId: number;
  localIndex: number;
};

export function ContentDetailPage({ item, related }: ContentDetailPageProps) {
  const shareHref = buildTelegramShareHref(item);
  const headings = buildArticleHeadings(item.contentBlocks);

  return (
    <main className={styles.page}>
      <DetailHero item={item} shareHref={shareHref} />

      <div className={styles.layout}>
        <article className={styles.article}>
          {item.contentBlocks.length > 0 ? (
            item.contentBlocks.map((block) => (
              <ContentBlockView
                block={block}
                headings={headings}
                key={`${block.type}-${block.id}`}
              />
            ))
          ) : (
            <div className={styles.htmlBlock}>
              <h2>Коротко</h2>
              <p>{item.description}</p>
            </div>
          )}
        </article>

        <aside className={styles.sidebar}>
          <SidebarPanel title="В этой статье">
            <div className={styles.tocList}>
              {headings.map((heading) => (
                <a
                  className={styles.tocItem}
                  href={`#${heading.id}`}
                  key={heading.id}
                >
                  {heading.title}
                </a>
              ))}
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
              <a className={styles.shareButton} href={shareHref}>
                <BsShareFill aria-hidden="true" />
              </a>
            </div>
          </SidebarPanel>

          <div className={styles.sideCta}>
            <p className={styles.sideCtaTitle}>Нужен такой контент?</p>
            <p className={styles.sideCtaText}>
              Подберём промпты, визуал и AI-решение под вашу задачу.
            </p>
            <a
              className={styles.sideCtaButton}
              href="https://t.me/neuroluv"
              rel="noreferrer"
              target="_blank"
            >
              Обсудить
              <BsArrowRight aria-hidden="true" />
            </a>
          </div>
        </aside>
      </div>

      <section className={styles.digest}>
        <div className={styles.digestText}>
          <h2 className={styles.digestTitle}>Получайте дайджест Нейролюба</h2>
          <p className={styles.digestDescription}>
            Раз в неделю - лучшие новости, статьи, промпты и идеи для AI-контента.
          </p>
        </div>
        <a
          className={styles.digestButton}
          href="https://t.me/neuroluv"
          rel="noreferrer"
          target="_blank"
        >
          Подписаться
          <FaTelegram aria-hidden="true" />
        </a>
      </section>

      {related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedTitle}>Читайте также</h2>
          <div className={styles.relatedGrid}>
            {related.map((news) => (
              <RelatedCard item={news} key={news.id} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function DetailHero({ item, shareHref }: { item: NewsDetail; shareHref: string }) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroPattern} />
      <div className={styles.heroContent}>
        <div className={styles.badges}>
          <span className={styles.badgePrimary}>Новость</span>
          {item.topic && <span className={styles.badgeMuted}>{item.topic.title}</span>}
          {item.tags.slice(0, 2).map((tag) => (
            <span className={styles.badgeMuted} key={tag.id}>
              {tag.title}
            </span>
          ))}
        </div>

        <h1 className={styles.heroTitle}>{item.title}</h1>
        <p className={styles.heroDescription}>{item.description}</p>
        <p className={styles.heroMeta}>
          {[
            item.publishedAtLabel,
            item.readTime ? `${item.readTime} минут чтения` : null,
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
          <BsShareFill aria-hidden="true" />
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
      <section
        className={styles.htmlBlock}
        dangerouslySetInnerHTML={{
          __html: addHeadingIdsToHtml(block.content, getBlockHeadings(headings, block.id)),
        }}
      />
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote className={styles.quoteBlock}>
        <p>{block.text}</p>
        {block.author && <cite>{block.author}</cite>}
      </blockquote>
    );
  }

  if (block.type === "list") {
    const headingId = getBlockHeadingId(headings, block.id);

    return (
      <section className={styles.listBlock}>
        {block.title && <h2 id={headingId}>{block.title}</h2>}
        <div className={styles.listItems}>
          {block.items.map((item) => (
            <div className={styles.listItem} key={item.id}>
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
            {block.buttons.map((button) => (
              <a
                className={`${styles.ctaButton} ${
                  button.variant === "outline" ? styles.ctaButtonOutline : ""
                }`}
                href={button.href}
                key={button.id}
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
          {block.cards.map((card) => {
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
                <Link className={styles.contentCard} href={card.href} key={card.id}>
                  {content}
                </Link>
              );
            }

            return (
              <div className={styles.contentCard} key={card.id}>
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
            <div className={styles.stepItem} key={step.id}>
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

function RelatedCard({ item }: { item: NewsItem }) {
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
          {item.topic?.title || item.tags[0]?.title || "Новости"}
        </span>
        <span className={styles.relatedCardTitle}>{item.title}</span>
        <span className={styles.relatedText}>{item.miniDescription}</span>
      </span>
      <span className={styles.relatedMeta}>
        <span>{item.author?.name || "Нейролюб"}</span>
        <span>
          {item.publishedAtLabel}
          <BsEye aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

function buildTelegramShareHref(item: NewsDetail): string {
  const path = `/news/${item.slug}`;
  const text = encodeURIComponent(item.title);

  return `https://t.me/share/url?url=${encodeURIComponent(path)}&text=${text}`;
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
  if (block.type === "list" || block.type === "cta" || block.type === "cards" || block.type === "steps") {
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

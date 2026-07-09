import Image from "next/image";
import Link from "next/link";

import type { NewsContentBlock } from "@/entities/news";
import { CopyContentBox } from "@/shared/ui/copy-content-box";

import styles from "./ContentBlocks.module.scss";

export type ContentHeading = {
  id: string;
  title: string;
  blockId: number;
  localIndex: number;
  source: "block-title" | "html";
};

type ContentBlocksProps = {
  blocks: NewsContentBlock[];
  headings?: ContentHeading[];
};

type ContentTocProps = {
  fallbackLabel?: string;
  headings: ContentHeading[];
  title?: string;
};

export function ContentBlocks({ blocks, headings }: ContentBlocksProps) {
  const resolvedHeadings = headings || buildContentHeadings(blocks);

  return (
    <>
      {blocks.map((block, index) => (
        <ContentBlockView
          block={block}
          headings={resolvedHeadings}
          key={`content-block-${block.type}-${block.id}-${index}`}
        />
      ))}
    </>
  );
}

export function ContentToc({
  fallbackLabel,
  headings,
  title = "Содержание",
}: ContentTocProps) {
  if (headings.length === 0 && !fallbackLabel) {
    return null;
  }

  return (
    <section className={styles.toc}>
      <h2>{title}</h2>
      <div className={styles.tocList}>
        {headings.length > 0 ? (
          headings.map((heading) => (
            <a className={styles.tocItem} href={`#${heading.id}`} key={heading.id}>
              {heading.title}
            </a>
          ))
        ) : (
          <span className={styles.tocItem}>{fallbackLabel}</span>
        )}
      </div>
    </section>
  );
}

export function buildContentHeadings(blocks: NewsContentBlock[]): ContentHeading[] {
  const usedIds = new Map<string, number>();
  const headings: ContentHeading[] = [];

  blocks.forEach((block) => {
    const blockTitle = getContentBlockTitle(block);

    if (blockTitle) {
      headings.push({
        id: createUniqueHeadingId(blockTitle, usedIds),
        title: blockTitle,
        blockId: block.id,
        localIndex: 0,
        source: "block-title",
      });
    }

    const htmlContent = getHtmlContent(block);

    if (htmlContent) {
      extractHtmlHeadings(htmlContent).forEach((title, localIndex) => {
        headings.push({
          id: createUniqueHeadingId(title, usedIds),
          title,
          blockId: block.id,
          localIndex,
          source: "html",
        });
      });
    }
  });

  return headings;
}

function ContentBlockView({
  block,
  headings,
}: {
  block: NewsContentBlock;
  headings: ContentHeading[];
}) {
  if (block.type === "html") {
    return (
      <section className={styles.copyHtmlBlock}>
        <CopyContentBox copyText={block.content} title={block.title || "Текст"}>
          <div
            dangerouslySetInnerHTML={{
              __html: addHeadingIdsToHtml(
                block.content,
                getHtmlHeadings(headings, block.id),
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
              getHtmlHeadings(headings, block.id),
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

function extractHtmlHeadings(html: string): string[] {
  return [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((match) => stripHtml(match[1] || "").trim())
    .filter(Boolean);
}

function addHeadingIdsToHtml(html: string, headings: ContentHeading[]): string {
  let index = 0;

  return html.replace(
    /<(h2)([^>]*)>([\s\S]*?)<\/\1>/gi,
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

function getHtmlContent(block: NewsContentBlock): string | null {
  if (block.type === "html" || block.type === "text") {
    return block.content;
  }

  return null;
}

function getHtmlHeadings(
  headings: ContentHeading[],
  blockId: number,
): ContentHeading[] {
  return headings.filter(
    (heading) => heading.blockId === blockId && heading.source === "html",
  );
}

function getBlockHeadingId(
  headings: ContentHeading[],
  blockId: number,
): string | undefined {
  return headings.find(
    (heading) => heading.blockId === blockId && heading.source === "block-title",
  )?.id;
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

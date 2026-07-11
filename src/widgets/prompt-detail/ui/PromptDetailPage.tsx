import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { FaArrowRight, FaTelegram } from "react-icons/fa";
import { FaVk } from "react-icons/fa6";

import type {
  PromptContentBlock,
  PromptDetail,
  PromptItem,
} from "@/entities/prompt";
import { SITE_URL } from "@/shared/config/site";
import { CopyContentBox } from "@/shared/ui/copy-content-box";
import { Noindex } from "@/shared/ui/noindex";
import { PromptCardMedia } from "@/shared/ui/prompt-card-media";
import { SmartStickySidebar } from "@/shared/ui/smart-sticky-sidebar";

import { CopyPromptButton } from "./CopyPromptButton";
import { PromptComposer } from "./PromptComposer";
import styles from "./PromptDetailPage.module.scss";

type PromptDetailPageProps = {
  item: PromptDetail;
  related: PromptItem[];
};

type PromptHeading = {
  id: string;
  title: string;
  blockId: number | "prompt";
  localIndex: number;
};

export function PromptDetailPage({ item, related }: PromptDetailPageProps) {
  const shareHref = buildTelegramShareHref(item);
  const vkShareHref = buildVkShareHref(item);
  const promptSourceBlock = item.contentBlocks.find(
    (block) => block.type === "html" && block.content === item.promptText,
  );
  const contentBlocks = item.contentBlocks.filter(
    (block) => !(block.type === "html" && block.content === item.promptText),
  );
  const headings = buildPromptHeadings(
    item.isPaid ? "" : item.promptText,
    contentBlocks,
  );
  const sidebarCta = getSidebarCta(contentBlocks);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badges}>
            {(item.contentKind || item.types[0]) && (
              <span className={styles.badgePrimary}>
                {(item.contentKind || item.types[0])?.title}
              </span>
            )}
            {item.neuralNetwork && (
              <span className={styles.badgeMuted}>{item.neuralNetwork.title}</span>
            )}
          </div>
          <h1 className={styles.heroTitle}>{item.title}</h1>
          <p className={styles.heroDescription}>{item.description}</p>
          <div className={styles.heroActions}>
            {!item.isPaid && <CopyPromptButton text={item.promptText} />}
            <a
              className={styles.adaptButton}
              href="https://t.me/neuroluv"
              rel="noreferrer"
              target="_blank"
            >
              Заказать адаптацию
              <FaArrowRight aria-hidden="true" />
            </a>
          </div>
          <div className={styles.heroMeta}>
            {item.neuralNetwork && (
              <span>
                Модель: <strong>{item.neuralNetwork.title}</strong>
              </span>
            )}
            {item.format && (
              <span>
                Формат: <strong>{item.format}</strong>
              </span>
            )}
            {item.difficultyLabel && (
              <span>
                Сложность: <strong>{item.difficultyLabel}</strong>
              </span>
            )}
          </div>
        </div>

        <PromptHeroVisual item={item} />
      </section>

      <div className={styles.layout}>
        <article className={styles.article}>
          {!item.isPaid && (
            <section className={styles.promptBox} id="prompt">
              <PromptComposer
                modelLabel={item.neuralNetwork?.title}
                promptText={item.promptText}
                title={promptSourceBlock?.title}
              />
            </section>
          )}

          {contentBlocks.length > 0 && (
            <div className={styles.contentBlocks}>
              {contentBlocks.map((block, index) => (
                <ContentBlockView
                  block={block}
                  headings={headings}
                  key={`prompt-content-${block.type}-${block.id}-${index}`}
                />
              ))}
            </div>
          )}
        </article>

        <Noindex>
          <SmartStickySidebar className={styles.sidebar}>
            <SidebarPanel title="Содержание">
              <div className={styles.toc}>
                {headings.map((heading) => (
                  <a href={`#${heading.id}`} key={heading.id}>
                    {heading.title}
                  </a>
                ))}
              </div>
            </SidebarPanel>

            <SidebarPanel title="Поделиться">
              <div className={styles.shareRow}>
                <a href={shareHref} rel="noreferrer" target="_blank">
                  <FaTelegram aria-hidden="true" />
                </a>
                <a href={vkShareHref} rel="noreferrer" target="_blank">
                  <FaVk aria-hidden="true" />
                </a>
              </div>
            </SidebarPanel>

            <AuthorCard item={item} />
            {sidebarCta && <SidebarCta block={sidebarCta} />}
          </SmartStickySidebar>
        </Noindex>
      </div>

      {related.length > 0 && (
        <section className={styles.related}>
          <div className={styles.relatedHead}>
            <h2>Похожие промпты из этой темы</h2>
            <Link href="/prompts">Все промпты</Link>
          </div>
          <div className={styles.relatedGrid}>
            {related.slice(0, 6).map((prompt, index) => (
              <RelatedPromptCard
                key={`related-prompt-${prompt.id}-${index}`}
                prompt={prompt}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

type PromptCtaBlock = Extract<PromptContentBlock, { type: "cta" }>;

function SidebarCta({ block }: { block: PromptCtaBlock }) {
  return (
    <div className={styles.sideCta}>
      <h2>{block.title}</h2>
      <p>{block.description}</p>
      {block.buttons.map((button, index) => (
        <a
          href={button.href}
          key={`prompt-sidebar-cta-${button.id}-${index}`}
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

function PromptHeroVisual({ item }: { item: PromptDetail }) {
  const isVideo = isVideoPrompt(item);
  const mediaStyle = {
    "--prompt-media-ratio": getPromptAspectRatio(item.format, isVideo),
  } as CSSProperties;

  return (
    <div className={styles.heroVisual} style={mediaStyle}>
      {item.image ? (
        item.image.type?.startsWith("video/") ? (
          <video
            autoPlay
            controls
            loop
            muted
            playsInline
            preload="metadata"
            src={item.image.url}
          />
        ) : (
          <Image
            priority
            alt={getImageAlt(item.image.title, item.title)}
            fill
            sizes="(max-width: 1024px) 100vw, 420px"
            src={item.image.url}
          />
        )
      ) : (
        <span>{item.contentKind?.title || item.types[0]?.title || "AI"}</span>
      )}
    </div>
  );
}

function ContentBlockView({
  block,
  headings,
}: {
  block: PromptContentBlock;
  headings: PromptHeading[];
}) {
  if (block.type === "html") {
    return (
      <section className={styles.promptBox}>
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
      <section className={styles.htmlBlock}>
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

  if (block.type === "list") {
    return (
      <section className={styles.listBlock}>
        {block.title && <h2 id={getBlockHeadingId(headings, block.id)}>{block.title}</h2>}
        <div className={styles.steps}>
          {block.items.map((item, index) => (
            <div className={styles.step} key={`step-${item.id}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
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
            alt={getImageAlt(block.image.title, block.title || block.caption || "Изображение промпта")}
            fill
            sizes="(max-width: 1024px) 100vw, 840px"
            src={block.image.url}
          />
        </span>
        {block.caption && <figcaption>{block.caption}</figcaption>}
      </figure>
    );
  }

  if (block.type === "video") {
    return (
      <figure className={styles.videoBlock}>
        {block.title && <h2 id={getBlockHeadingId(headings, block.id)}>{block.title}</h2>}
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

  if (block.type === "cta") {
    return (
      <section className={styles.ctaBlock}>
        <div>
          <h2 id={getBlockHeadingId(headings, block.id)}>{block.title}</h2>
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
    return (
      <section className={styles.cardsBlock}>
        {block.title && <h2 id={getBlockHeadingId(headings, block.id)}>{block.title}</h2>}
        <div className={styles.contentCards}>
          {block.cards.map((card, index) => {
            const content = (
              <>
                {card.image && (
                  <span className={styles.contentCardImage}>
                    <Image
                      alt={getImageAlt(card.image.title, card.title || card.description)}
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
    return (
      <section className={styles.stepsBlock}>
        {block.title && <h2 id={getBlockHeadingId(headings, block.id)}>{block.title}</h2>}
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

function AuthorCard({ item }: { item: PromptDetail }) {
  const initial = (item.author?.name || "N").slice(0, 1);

  return (
    <section className={styles.authorCard}>
      <span className={styles.authorAvatar}>
        {item.author?.avatar ? (
          <Image alt="" fill sizes="58px" src={item.author.avatar.url} />
        ) : (
          initial
        )}
      </span>
      <span>
        <strong>{item.author?.name || "Ирина / NeuroLuv"}</strong>
        <small>Автор промпта · AI-креатор</small>
      </span>
    </section>
  );
}

function RelatedPromptCard({ prompt }: { prompt: PromptItem }) {
  return (
    <Link className={styles.relatedCard} href={prompt.href}>
      <PromptCardMedia
        alt={prompt.image ? getImageAlt(prompt.image.title, prompt.title) : prompt.title}
        autoPlay={prompt.autoplay}
        className={styles.relatedImage}
        image={prompt.image}
        sizes="(max-width: 768px) 100vw, 386px"
      >
        <span>{prompt.contentKind?.title || prompt.types[0]?.title || "Фото"}</span>
      </PromptCardMedia>
      <span className={styles.relatedBadges}>
        {(prompt.contentKind || prompt.types[0]) && (
          <small>{(prompt.contentKind || prompt.types[0])?.title}</small>
        )}
        {prompt.neuralNetwork && <small>{prompt.neuralNetwork.title}</small>}
      </span>
      <strong>{prompt.title}</strong>
    </Link>
  );
}

function buildTelegramShareHref(item: PromptDetail): string {
  const url = `${SITE_URL}/prompts/${item.slug}`;
  const text = `${item.title} - Нейролюб`;

  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

function buildVkShareHref(item: PromptDetail): string {
  const params = new URLSearchParams({
    title: item.title,
    url: `${SITE_URL}/prompts/${item.slug}`,
  });

  if (item.description) {
    params.set("description", item.description);
  }

  return `https://vk.com/share.php?${params.toString()}`;
}

function getImageAlt(imageTitle: string, fallback: string): string {
  return imageTitle.trim() || fallback;
}

function buildPromptHeadings(
  promptText: string,
  blocks: PromptContentBlock[],
): PromptHeading[] {
  const usedIds = new Map<string, number>();
  const headings: PromptHeading[] = [];

  extractHtmlHeadings(promptText).forEach((title, localIndex) => {
    headings.push({
      id: createUniqueHeadingId(title, usedIds),
      title,
      blockId: "prompt",
      localIndex,
    });
  });

  if (headings.length === 0) {
    headings.push({
      id: "prompt",
      title: "Промпт",
      blockId: "prompt",
      localIndex: 0,
    });
  }

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

function addHeadingIdsToHtml(html: string, headings: PromptHeading[]): string {
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

function getContentBlockTitle(block: PromptContentBlock): string | null {
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

function isVideoPrompt(item: PromptDetail): boolean {
  return (
    item.image?.type?.startsWith("video/") === true ||
    item.contentKind?.slug === "video"
  );
}

function getPromptAspectRatio(format: string | null, isVideo: boolean): string {
  if (isVideo) {
    return "3 / 4";
  }

  const match = format?.match(/(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/);

  if (!match) {
    return "1 / 1";
  }

  return `${Number(match[1])} / ${Number(match[2])}`;
}

function getBlockHeadings(
  headings: PromptHeading[],
  blockId: PromptHeading["blockId"],
): PromptHeading[] {
  return headings.filter((heading) => heading.blockId === blockId);
}

function getBlockHeadingId(
  headings: PromptHeading[],
  blockId: PromptHeading["blockId"],
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

function getSidebarCta(blocks: PromptContentBlock[]): PromptCtaBlock | null {
  return blocks.find((block): block is PromptCtaBlock => block.type === "cta") || null;
}

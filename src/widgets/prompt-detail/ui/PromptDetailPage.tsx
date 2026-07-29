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
import { SHARE_SITE_URL } from "@/shared/config/site";
import {
  ContentBlocks,
  type ContentHeading,
} from "@/shared/ui/content-blocks";
import { Noindex } from "@/shared/ui/noindex";
import { PromptCardMedia } from "@/shared/ui/prompt-card-media";
import { SmartStickySidebar } from "@/shared/ui/smart-sticky-sidebar";
import { AuthorCard } from "@/shared/ui/author-card";

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
  source: ContentHeading["source"] | "prompt";
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
  const contentHeadings = buildPromptContentHeadings(headings);
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
            {item.aiEnabled ? (
              <Link
                className={styles.heroActionButton}
                href={`/ai/prompts/${item.slug}`}
              >
                Сгенерировать
                <FaArrowRight aria-hidden="true" />
              </Link>
            ) : item.isPaid ? (
              <a
                className={styles.heroActionButton}
                href="https://t.me/imishka0"
                rel="noreferrer"
                target="_blank"
              >
                Заказать
                <FaArrowRight aria-hidden="true" />
              </a>
            ) : (
              <CopyPromptButton label="Скопировать" text={item.promptText} />
            )}
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
              <ContentBlocks blocks={contentBlocks} headings={contentHeadings} />
            </div>
          )}
        </article>

        <Noindex>
          <SmartStickySidebar className={styles.sidebar}>
            {headings.length > 0 && (
              <SidebarPanel title="Содержание">
                <div className={styles.toc}>
                  {headings.map((heading) => (
                    <a href={`#${heading.id}`} key={heading.id}>
                      {heading.title}
                    </a>
                  ))}
                </div>
              </SidebarPanel>
            )}

            <PromptAuthorCard
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

function PromptAuthorCard({
  item,
  shareHref,
  vkShareHref,
}: {
  item: PromptDetail;
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
        <div className={styles.shareRow}>
          <a
            aria-label="Поделиться в Telegram"
            href={shareHref}
            rel="noreferrer"
            target="_blank"
          >
            <FaTelegram aria-hidden="true" />
          </a>
          <a
            aria-label="Поделиться во ВКонтакте"
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
  const url = `${SHARE_SITE_URL}/prompts/${item.slug}`;
  const text = `${item.title} - Нейролюб`;

  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

function buildVkShareHref(item: PromptDetail): string {
  const params = new URLSearchParams({
    title: item.title,
    url: `${SHARE_SITE_URL}/prompts/${item.slug}`,
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
      source: "prompt",
    });
  });

  if (headings.length === 0 && promptText.trim().length > 0) {
    headings.push({
      id: "prompt",
      title: "Промпт",
      blockId: "prompt",
      localIndex: 0,
      source: "prompt",
    });
  }

  blocks.forEach((block) => {
    const title = getContentBlockTitle(block);

    if (title) {
      headings.push({
        id: createUniqueHeadingId(title, usedIds),
        title,
        blockId: block.id,
        localIndex: 0,
        source: "block-title",
      });
    }

    if (block.type === "html" || block.type === "text") {
      extractHtmlHeadings(block.content).forEach((title, localIndex) => {
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

function buildPromptContentHeadings(headings: PromptHeading[]): ContentHeading[] {
  return headings.flatMap((heading) => {
    if (heading.blockId === "prompt" || heading.source === "prompt") {
      return [];
    }

    return {
      blockId: heading.blockId,
      id: heading.id,
      localIndex: heading.localIndex,
      source: heading.source,
      title: heading.title,
    };
  });
}

function extractHtmlHeadings(html: string): string[] {
  return [...html.matchAll(/<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/gi)]
    .map((match) => stripHtml(match[1] || "").trim())
    .filter(Boolean);
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

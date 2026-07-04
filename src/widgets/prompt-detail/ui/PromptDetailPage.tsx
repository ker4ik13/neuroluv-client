import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BsArrowRight, BsEye, BsShareFill } from "react-icons/bs";
import { FaTelegram } from "react-icons/fa6";

import type {
  PromptContentBlock,
  PromptDetail,
  PromptItem,
} from "@/entities/prompt";
import { SITE_URL } from "@/shared/config/site";
import { SmartStickySidebar } from "@/shared/ui/smart-sticky-sidebar";

import { CopyPromptButton } from "./CopyPromptButton";
import styles from "./PromptDetailPage.module.scss";

type PromptDetailPageProps = {
  item: PromptDetail;
  related: PromptItem[];
};

export function PromptDetailPage({ item, related }: PromptDetailPageProps) {
  const shareHref = buildTelegramShareHref(item);
  const contentBlocks = item.contentBlocks.filter(
    (block) => !(block.type === "html" && block.content === item.promptText),
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badges}>
            {item.types[0] && (
              <span className={styles.badgePrimary}>{item.types[0].title}</span>
            )}
            {item.neuralNetwork && (
              <span className={styles.badgeMuted}>{item.neuralNetwork.title}</span>
            )}
          </div>
          <h1 className={styles.heroTitle}>{item.title}</h1>
          <p className={styles.heroDescription}>{item.description}</p>
          <div className={styles.heroActions}>
            <CopyPromptButton text={item.promptText} />
            <a
              className={styles.adaptButton}
              href="https://t.me/neuroluv"
              rel="noreferrer"
              target="_blank"
            >
              Заказать адаптацию
              <BsArrowRight aria-hidden="true" />
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

        <div className={styles.heroVisual}>
          {item.image ? (
            <Image
              priority
              alt={item.image.title}
              fill
              sizes="(max-width: 1024px) 100vw, 420px"
              src={item.image.url}
            />
          ) : (
            <span>{item.types[0]?.title || "AI"}</span>
          )}
        </div>
      </section>

      <div className={styles.layout}>
        <article className={styles.article}>
          <section className={styles.promptBox} id="prompt">
            <div className={styles.promptBoxHead}>
              <h2>Промпт</h2>
              <CopyPromptButton text={item.promptText} />
            </div>
            <div
              className={styles.promptText}
              dangerouslySetInnerHTML={{ __html: item.promptText }}
            />
          </section>

          {contentBlocks.length > 0 && (
            <div className={styles.contentBlocks}>
              {contentBlocks.map((block, index) => (
                <ContentBlockView
                  block={block}
                  key={`prompt-content-${block.type}-${block.id}-${index}`}
                />
              ))}
            </div>
          )}
        </article>

        <SmartStickySidebar className={styles.sidebar}>
          <SidebarPanel title="В этом промпте">
            <div className={styles.toc}>
              <a href="#prompt">Промпт</a>
              <a href="#usage">Как использовать</a>
              <a href="#parameters">Параметры</a>
              <a href="#tags">Теги</a>
            </div>
            <div className={styles.shareRow}>
              <a href={shareHref} rel="noreferrer" target="_blank">
                <FaTelegram aria-hidden="true" />
              </a>
              <a href={shareHref} rel="noreferrer" target="_blank">
                <BsShareFill aria-hidden="true" />
              </a>
            </div>
          </SidebarPanel>

          <AuthorCard item={item} />
          <ParametersCard item={item} />
          {/* <AlbumCard item={item} /> */}
          <TagsCard item={item} />

          <div className={styles.sideCta}>
            <h2>Нужен промпт под задачу?</h2>
            <p>Адаптируем стиль, тон, цвета и референсы.</p>
            <a href="https://t.me/neuroluv" rel="noreferrer" target="_blank">
              Заказать
              <BsArrowRight aria-hidden="true" />
            </a>
          </div>
        </SmartStickySidebar>
      </div>

      {related.length > 0 && (
        <section className={styles.related}>
          <div className={styles.relatedHead}>
            <h2>Похожие промпты из этой темы</h2>
            <Link href="/prompts">Все промпты</Link>
          </div>
          <div className={styles.relatedGrid}>
            {related.slice(0, 3).map((prompt, index) => (
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

function ContentBlockView({ block }: { block: PromptContentBlock }) {
  if (block.type === "html") {
    return (
      <section
        className={styles.htmlBlock}
        id="usage"
        dangerouslySetInnerHTML={{ __html: block.content }}
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

  return (
    <section className={styles.listBlock}>
      {block.title && <h2>{block.title}</h2>}
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

function ParametersCard({ item }: { item: PromptDetail }) {
  const rows = [
    ["Тип", item.types[0]?.title],
    ["Формат", item.format],
    ["Сложность", item.difficultyLabel],
    ["Цель", item.goal?.title],
    ["Просмотры", `${item.viewsCount}`],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <section className={styles.parameters} id="parameters">
      <h2>Параметры</h2>
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}

// function AlbumCard({ item }: { item: PromptDetail }) {
//   const albumImage = item.images[1] || item.image;
//
//   if (!albumImage && !item.goal) {
//     return null;
//   }
//
//   return (
//     <section className={styles.albumCard}>
//       <h2>Альбом</h2>
//       {albumImage && (
//         <span className={styles.albumImage}>
//           <Image alt={albumImage.title} fill sizes="270px" src={albumImage.url} />
//         </span>
//       )}
//       <p>{item.goal?.description || item.goal?.title || "Промпты для AI-контента"}</p>
//       {item.goal && <Link href={`/prompts?goal=${item.goal.slug}`}>Смотреть все</Link>}
//     </section>
//   );
// }

function TagsCard({ item }: { item: PromptDetail }) {
  if (item.tags.length === 0) {
    return null;
  }

  return (
    <section className={styles.tagsCard} id="tags">
      <h2>Теги</h2>
      <div>
        {item.tags.map((tag) => (
          <Link href={`/prompts?tag=${tag.slug}`} key={`prompt-tag-${tag.id}`}>
            #{tag.title}
          </Link>
        ))}
      </div>
    </section>
  );
}

function RelatedPromptCard({ prompt }: { prompt: PromptItem }) {
  return (
    <Link className={styles.relatedCard} href={prompt.href}>
      <span className={styles.relatedImage}>
        {prompt.image ? (
          <Image
            alt={prompt.image.title}
            fill
            sizes="(max-width: 768px) 100vw, 386px"
            src={prompt.image.url}
          />
        ) : (
          <span>{prompt.types[0]?.title || "Фото"}</span>
        )}
      </span>
      <span className={styles.relatedBadges}>
        {prompt.types[0] && <small>{prompt.types[0].title}</small>}
        {prompt.neuralNetwork && <small>{prompt.neuralNetwork.title}</small>}
      </span>
      <strong>{prompt.title}</strong>
      <p>{prompt.description}</p>
      <span className={styles.relatedMeta}>
        {prompt.viewsCount} просмотров
        <BsEye aria-hidden="true" />
      </span>
    </Link>
  );
}

function buildTelegramShareHref(item: PromptDetail): string {
  const url = `${SITE_URL}/prompts/${item.slug}`;
  const text = `${item.title} - Нейролюб`;

  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

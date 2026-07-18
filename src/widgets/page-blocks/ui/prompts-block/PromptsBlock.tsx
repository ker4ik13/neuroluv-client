import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";

import type { PagePromptCard, PagePromptsBlock } from "@/entities/page";
import { PromptCardMedia } from "@/shared/ui/prompt-card-media";

import styles from "./PromptsBlock.module.scss";

type PromptsBlockProps = {
  block: PagePromptsBlock;
};

const difficultyLabels: Record<string, string> = {
  easy: "Легко",
  medium: "Средне",
  hard: "Сложно",
};

export function PromptsBlock({ block }: PromptsBlockProps) {
  if (block.prompts.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <div className={styles.headText}>
            <h2 className={styles.title}>{block.title}</h2>
            {block.description && (
              <p className={styles.description}>{block.description}</p>
            )}
          </div>

          {block.link && (
            <Link className={styles.moreLink} href={block.link}>
              Все промпты
              <FaArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>

        <div className={styles.cards}>
          {block.prompts.map((prompt, index) => (
            <PromptCard key={`prompt-${prompt.id}-${index}`} prompt={prompt} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PromptCard({ prompt }: { prompt: PagePromptCard }) {
  return (
    <Link className={styles.card} href={prompt.href}>
      {prompt.image && (
        <PromptCardMedia
          alt={prompt.image.title || prompt.title}
          autoPlay={prompt.autoplay}
          className={styles.imageWrap}
          image={prompt.image}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      )}

      <span className={styles.cardContent}>
        <span className={styles.meta}>
          {prompt.neuralNetwork && (
            <span className={styles.badge}>{prompt.neuralNetwork}</span>
          )}
          {prompt.format && <span className={styles.badge}>{prompt.format}</span>}
          {prompt.difficulty && (
            <span className={styles.badge}>
              {difficultyLabels[prompt.difficulty] || prompt.difficulty}
            </span>
          )}
        </span>

        <span className={styles.cardTitle}>{prompt.title}</span>
      </span>
    </Link>
  );
}

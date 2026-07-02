import type { PageFaqBlock, PageFaqItem } from "@/entities/page";
import { AppIcon } from "@/shared/ui/app-icon";

import styles from "./FaqBlock.module.scss";

type FaqBlockProps = {
  block: PageFaqBlock;
};

export function FaqBlock({ block }: FaqBlockProps) {
  if (block.questions.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.title}>{block.title}</h2>
          {(block.description || block.link) && (
            <p className={styles.description}>
              {block.description && <span>{block.description}</span>}
              {block.link && (
                <a
                  className={styles.link}
                  href={normalizeExternalLink(block.link)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <AppIcon className={styles.linkIcon} icon={block.icon} />
                  <span>{block.link}</span>
                </a>
              )}
            </p>
          )}
        </div>

        <div className={styles.questions}>
          {block.questions.map((question, index) => (
            <FaqItem
              isDefaultOpen={index === 0}
              key={question.id}
              question={question}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({
  isDefaultOpen,
  question,
}: {
  isDefaultOpen: boolean;
  question: PageFaqItem;
}) {
  return (
    <details className={styles.item} open={isDefaultOpen}>
      <summary className={styles.question}>
        <span>{question.title}</span>
        <span className={styles.toggle} aria-hidden="true" />
      </summary>
      {question.answer && (
        <div
          className={styles.answer}
          dangerouslySetInnerHTML={{ __html: question.answer }}
        />
      )}
    </details>
  );
}

function normalizeExternalLink(link: string): string {
  if (/^https?:\/\//.test(link)) {
    return link;
  }

  return `https://${link}`;
}

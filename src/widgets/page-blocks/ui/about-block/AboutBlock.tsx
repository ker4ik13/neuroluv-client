import type { PageAboutBlock, PageAboutCard } from "@/entities/page";
import { AppIcon } from "@/shared/ui/app-icon";

import styles from "./AboutBlock.module.scss";

type AboutBlockProps = {
  block: PageAboutBlock;
};

export function AboutBlock({ block }: AboutBlockProps) {
  return (
    <section className={styles.about}>
      <div className={styles.inner}>
        <div className={styles.textColumn}>
          <div className={styles.content}>
            <h2 className={styles.title}>{block.title}</h2>
            <p className={styles.description}>{block.description}</p>
          </div>
          <div className={styles.promptCard}>
            {block.advantageImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={block.advantageImage.title}
                className={styles.promptImage}
                src={block.advantageImage.url}
              />
            )}

            <div className={styles.promptOverlay}>
              {block.advantageTitle && (
                <strong className={styles.promptNumber}>
                  {block.advantageTitle}
                </strong>
              )}
              {block.advantageDescription && (
                <span className={styles.promptText}>
                  {block.advantageDescription}
                </span>
              )}
            </div>
          </div>
        </div>

        {block.cards.length > 0 && (
          <div className={styles.cards}>
            {block.cards.map((card, index) => (
              <AboutCard card={card} key={`about-card-${card.id}-${index}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AboutCard({ card }: { card: PageAboutCard }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.iconBox}>
          <AppIcon className={styles.cardIcon} icon={card.icon} />
        </span>
        <h3 className={styles.cardTitle}>{card.title}</h3>
      </div>
      <p className={styles.cardDescription}>{card.description}</p>
    </article>
  );
}

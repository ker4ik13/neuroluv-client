import Link from "next/link";

import type { NavigationIcon } from "@/entities/navigation";
import type {
  PageTaskExamplesBlock,
  PageTaskExamplesCard,
} from "@/entities/page";
import { AppIcon } from "@/shared/ui/app-icon";
import { IconRenderer } from "@/shared/ui/icon-renderer";

import styles from "./TaskExamplesBlock.module.scss";

type TaskExamplesBlockProps = {
  block: PageTaskExamplesBlock;
};

const FALLBACK_ICON: NavigationIcon = {
  title: "Контент",
  code: "FaFileAlt",
  library: "fa",
};

export function TaskExamplesBlock({ block }: TaskExamplesBlockProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.title}>{block.title}</h2>
          {block.description && (
            <p className={styles.description}>{block.description}</p>
          )}
        </div>

        {block.cards.length > 0 && (
          <div className={styles.cards}>
            {block.cards.map((card, index) => (
              <TaskExamplesCard
                card={card}
                key={`task-example-${card.id}-${index}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TaskExamplesCard({ card }: { card: PageTaskExamplesCard }) {
  const className = `${styles.card} ${card.isSelected ? styles.cardSelected : ""}`;
  const content = (
    <>
      <div className={styles.cardTop}>
        <span className={styles.iconBox}>
          <AppIcon className={styles.icon} icon={card.icon || FALLBACK_ICON} />
        </span>
        {card.href ? (
          <IconRenderer className={styles.arrow} code="FaArrowRight" library="fa" />
        ) : null}
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{card.title}</h3>
        {card.description && (
          <p className={styles.cardDescription}>{card.description}</p>
        )}
      </div>
    </>
  );

  if (card.href) {
    return (
      <Link className={className} href={card.href}>
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}

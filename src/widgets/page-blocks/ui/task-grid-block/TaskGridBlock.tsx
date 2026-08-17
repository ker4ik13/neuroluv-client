import type { CSSProperties } from "react";

import type { NavigationIcon } from "@/entities/navigation";
import type { PageTaskGridBlock, PageTaskGridItem } from "@/entities/page";
import { AppIcon } from "@/shared/ui/app-icon";

import styles from "./TaskGridBlock.module.scss";

type TaskGridBlockProps = {
  block: PageTaskGridBlock;
};

const FALLBACK_ICON: NavigationIcon = {
  title: "Задача",
  code: "FaRobot",
  library: "fa",
};

export function TaskGridBlock({ block }: TaskGridBlockProps) {
  if (block.tasks.length === 0) {
    return null;
  }

  const columnCount = block.tasks.length === 4 ? 4 : Math.min(block.tasks.length, 3);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.title}>{block.title}</h2>
          {block.description && (
            <p className={styles.description}>{block.description}</p>
          )}
        </div>

        <div
          className={styles.cards}
          style={{ "--task-grid-columns": columnCount } as CSSProperties}
        >
          {block.tasks.map((task, index) => (
            <TaskCard key={`task-grid-${task.id}-${index}`} task={task} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TaskCard({ task }: { task: PageTaskGridItem }) {
  return (
    <article className={styles.card}>
      <span className={styles.iconBox}>
        <AppIcon className={styles.icon} icon={task.icon || FALLBACK_ICON} />
      </span>
      <h3 className={styles.cardTitle}>{task.title}</h3>
      {task.description && (
        <p className={styles.cardDescription}>{task.description}</p>
      )}
    </article>
  );
}

import type { PageStepItem, PageStepsBlock } from "@/entities/page";

import styles from "./StepsBlock.module.scss";

type StepsBlockProps = {
  block: PageStepsBlock;
};

export function StepsBlock({ block }: StepsBlockProps) {
  if (block.steps.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.title}>{block.title}</h2>
          {block.description && (
            <p className={styles.description}>{block.description}</p>
          )}
        </div>

        <div className={styles.steps}>
          {block.steps.map((step, index) => (
            <StepCard index={index} key={`step-${step.id}-${index}`} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ index, step }: { index: number; step: PageStepItem }) {
  return (
    <article className={styles.step}>
      <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
      <div className={styles.stepContent}>
        <h3 className={styles.stepTitle}>{step.title}</h3>
        {step.description && (
          <p className={styles.stepDescription}>{step.description}</p>
        )}
      </div>
    </article>
  );
}

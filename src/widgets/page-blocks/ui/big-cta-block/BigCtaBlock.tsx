import Image from "next/image";
import Link from "next/link";

import type { PageBigCtaBlock, PageCtaItem, PageHeroButton } from "@/entities/page";
import { AppIcon } from "@/shared/ui/app-icon";

import styles from "./BigCtaBlock.module.scss";

type BigCtaBlockProps = {
  block: PageBigCtaBlock;
};

export function BigCtaBlock({ block }: BigCtaBlockProps) {
  return (
    <section className={styles.section}>
      <div className={styles.panel}>
        <div className={styles.content}>
          <h2 className={styles.title}>{block.title}</h2>
          {block.description && (
            <p className={styles.description}>{block.description}</p>
          )}

          {block.advantages.length > 0 && (
            <div className={styles.advantages}>
              {block.advantages.map((advantage) => (
                <AdvantageCard advantage={advantage} key={advantage.id} />
              ))}
            </div>
          )}

          {block.buttons.length > 0 && (
            <div className={styles.actions}>
              {block.buttons.map((button) => (
                <CtaButton button={button} key={button.id} />
              ))}
            </div>
          )}
        </div>

        {block.image && (
          <div className={styles.imageWrap}>
            <Image
              alt={block.image.title}
              className={styles.image}
              fill
              sizes="(max-width: 1024px) 100vw, 58vw"
              src={block.image.url}
            />
          </div>
        )}

        {block.steps.length > 0 && (
          <div className={styles.steps}>
            {block.steps.map((step, index) => (
              <div className={styles.step} key={step.id}>
                <span className={styles.stepNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={styles.stepText}>
                  <span className={styles.stepTitle}>{step.title}</span>
                  {step.description && (
                    <span className={styles.stepDescription}>
                      {step.description}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CtaButton({ button }: { button: PageHeroButton }) {
  const className = `${styles.button} ${
    button.variant === "primary" ? styles.buttonPrimary : styles.buttonSecondary
  }`;

  return (
    <Link className={className} href={button.href} target={button.target}>
      <span>{button.label}</span>
      <AppIcon className={styles.buttonIcon} icon={button.icon} />
    </Link>
  );
}

function AdvantageCard({ advantage }: { advantage: PageCtaItem }) {
  return (
    <article className={styles.advantage}>
      <span className={styles.advantageIcon}>
        <AppIcon className={styles.icon} icon={advantage.icon} />
      </span>
      <span className={styles.advantageText}>
        <span className={styles.advantageTitle}>{advantage.title}</span>
        {advantage.description && (
          <span className={styles.advantageDescription}>
            {advantage.description}
          </span>
        )}
      </span>
    </article>
  );
}

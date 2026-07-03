import type {
  PageHeroButton,
  PageUseCaseCard,
  PageUseCasesBlock,
} from "@/entities/page";
import { AppIcon } from "@/shared/ui/app-icon";
import Link from "next/link";
import { AiOutlineCheckCircle } from "react-icons/ai";

import styles from "./UseCasesBlock.module.scss";

type UseCasesBlockProps = {
  block: PageUseCasesBlock;
};

export function UseCasesBlock({ block }: UseCasesBlockProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <div className={styles.introText}>
            <h2 className={styles.title}>{block.cardTitle}</h2>
            {block.cardDescription && (
              <p className={styles.description}>{block.cardDescription}</p>
            )}
            {block.buttons.length > 0 && (
              <div className={styles.actions}>
                {block.buttons.map((button, index) => (
                  <UseCaseButton
                    button={button}
                    key={`use-case-button-${button.id}-${index}`}
                  />
                ))}
              </div>
            )}
          </div>

          {block.cardImage && (
            <div className={styles.imageWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={block.cardImage.title}
                className={styles.image}
                src={block.cardImage.url}
              />
            </div>
          )}
        </div>

        {block.useCases.length > 0 && (
          <div className={styles.cards}>
            {block.useCases.map((card, index) => (
              <UseCaseCard card={card} key={`use-case-${card.id}-${index}`} />
            ))}
          </div>
        )}

        {(block.adviceTitle || block.adviceDescription) && (
          <div className={styles.advice}>
            <span className={styles.adviceIconBox}>
              {block.adviceIcon ? (
                <AppIcon className={styles.adviceIcon} icon={block.adviceIcon} />
              ) : (
                <span className={styles.adviceEmoji}>⚡</span>
              )}
            </span>
            {block.adviceTitle && (
              <strong className={styles.adviceTitle}>{block.adviceTitle}</strong>
            )}
            {block.adviceDescription && (
              <p className={styles.adviceDescription}>{block.adviceDescription}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function UseCaseCard({ card }: { card: PageUseCaseCard }) {
  return (
    <article className={styles.card}>
      <h3 className={styles.cardTitle}>{card.title}</h3>
      {card.tasks.length > 0 && (
        <ul className={styles.tasks}>
          {card.tasks.map((task, index) => (
            <li className={styles.task} key={`task-${task}-${index}`}>
              <AiOutlineCheckCircle aria-hidden="true" className={styles.taskIcon} />
              <span>{task}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function UseCaseButton({ button }: { button: PageHeroButton }) {
  const className = `${styles.button} ${
    button.variant === "secondary" ? styles.buttonSecondary : styles.buttonPrimary
  }`;

  return (
    <Link
      className={className}
      href={button.href}
      rel={button.target === "_blank" ? "noreferrer" : undefined}
      target={button.target}
    >
      <span>{button.label}</span>
      <AppIcon className={styles.buttonIcon} icon={button.icon} />
    </Link>
  );
}

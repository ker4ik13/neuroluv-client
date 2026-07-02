import Link from "next/link";
import { FaTelegram } from "react-icons/fa6";

import type { PageHeroBlock, PageHeroButton } from "@/entities/page";
import { AppIcon } from "@/shared/ui/app-icon";

import styles from "./HeroBlock.module.scss";

type HeroBlockProps = {
  block: PageHeroBlock;
};

export function HeroBlock({ block }: HeroBlockProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.content}>
          {block.eyebrow && <p className={styles.eyebrow}>{block.eyebrow}</p>}
          <h1 className={styles.title}>{block.title}</h1>

          <div className={styles.bottom}>
            <p className={styles.description}>{block.description}</p>

            {block.link && (
              <a
                className={styles.telegram}
                href={normalizeExternalLink(block.link)}
                rel="noreferrer"
                target="_blank"
              >
                <FaTelegram aria-hidden="true" className={styles.telegramIcon} />
                <span>{block.link}</span>
              </a>
            )}

            {block.buttons.length > 0 && (
              <div className={styles.actions}>
                {block.buttons.map((button) => (
                  <HeroButton button={button} key={button.id} />
                ))}
              </div>
            )}
          </div>
        </div>

        {block.image && (
          <div className={styles.imageWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={block.image.title}
              className={styles.image}
              src={block.image.url}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function HeroButton({ button }: { button: PageHeroButton }) {
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

function normalizeExternalLink(link: string): string {
  if (/^https?:\/\//.test(link)) {
    return link;
  }

  return `https://${link}`;
}

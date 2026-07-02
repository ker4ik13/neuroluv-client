import Image from "next/image";
import Link from "next/link";

import type { PageHeroButton, PageMiniCtaBlock } from "@/entities/page";
import { AppIcon } from "@/shared/ui/app-icon";

import styles from "./MiniCtaBlock.module.scss";

type MiniCtaBlockProps = {
  block: PageMiniCtaBlock;
};

export function MiniCtaBlock({ block }: MiniCtaBlockProps) {
  return (
    <section className={styles.section}>
      <div className={styles.panel}>
        <div className={styles.content}>
          <h2 className={styles.title}>{block.title}</h2>
          {block.description && (
            <p className={styles.description}>{block.description}</p>
          )}

          {block.buttons.length > 0 && (
            <div className={styles.actions}>
              {block.buttons.map((button) => (
                <MiniButton button={button} key={button.id} />
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
              sizes="(max-width: 1024px) 100vw, 38vw"
              src={block.image.url}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function MiniButton({ button }: { button: PageHeroButton }) {
  const className = `${styles.button} ${
    button.variant === "secondary" ? styles.buttonSecondary : styles.buttonPrimary
  }`;

  return (
    <Link className={className} href={button.href} target={button.target}>
      <span>{button.label}</span>
      <AppIcon className={styles.buttonIcon} icon={button.icon} />
    </Link>
  );
}

import Link from "next/link";

import type { NavigationIcon } from "@/entities/navigation";
import type { PageServiceCard, PageServicesBlock } from "@/entities/page";
import { AppIcon } from "@/shared/ui/app-icon";

import styles from "./ServicesBlock.module.scss";

type ServicesBlockProps = {
  block: PageServicesBlock;
};

const FALLBACK_ICON: NavigationIcon = {
  title: "Услуга",
  code: "briefcase",
  library: "react-icons",
};

export function ServicesBlock({ block }: ServicesBlockProps) {
  if (block.services.length === 0) {
    return null;
  }

  const cardsClassName = `${styles.cards} ${getCardsCountClass(
    block.services.length,
  )}`;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.title}>{block.title}</h2>
          {block.description && (
            <p className={styles.description}>{block.description}</p>
          )}
        </div>

        <div className={cardsClassName}>
          {block.services.map((service, index) => (
            <ServiceCard key={`service-${service.id}-${index}`} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}

function getCardsCountClass(count: number): string {
  if (count === 2) {
    return styles.cardsTwo;
  }

  if (count === 3) {
    return styles.cardsThree;
  }

  return "";
}

function ServiceCard({ service }: { service: PageServiceCard }) {
  const className = `${styles.card} ${
    service.isPopular ? styles.cardPopular : ""
  }`;

  return (
    <article className={className}>
      <div className={styles.cardContent}>
        <div className={styles.cardTop}>
          <span className={styles.iconBox}>
            <AppIcon className={styles.icon} icon={service.icon || FALLBACK_ICON} />
          </span>
          <h3 className={styles.cardTitle}>{service.title}</h3>
        </div>

        {service.description && (
          <p className={styles.cardDescription}>{service.description}</p>
        )}

        {service.advantages.length > 0 && (
          <>
            <ul className={styles.features}>
              {service.advantages.map((advantage, index) => (
                <li className={styles.feature} key={`advantage-${advantage}-${index}`}>
                  <span className={styles.featureDot}>•</span>
                  <span className={styles.featureText}>{advantage}</span>
                </li>
              ))}
            </ul>
            <span className={styles.divider} />
          </>
        )}
      </div>

      <Link className={styles.button} href={`/services/${service.href}`}>
        Подробнее
      </Link>
    </article>
  );
}

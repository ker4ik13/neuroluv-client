import Image from "next/image";
import Link from "next/link";
import { FaMagic } from "react-icons/fa";
import { FiSmartphone } from "react-icons/fi";
import { GiBiceps } from "react-icons/gi";

import { PromptCardMedia } from "@/shared/ui/prompt-card-media";

import type { PromptItem, PromptTaxonomy } from "../model";
import styles from "./PromptCard.module.scss";

export function PromptCard({ prompt }: { prompt: PromptItem }) {
  const type = prompt.contentKind || prompt.types[0];

  return (
    <article className={styles.card}>
      <PromptCardMedia
        alt={
          prompt.image
            ? getPromptImageAlt(prompt.image.title, prompt.title)
            : prompt.title
        }
        autoPlay={prompt.autoplay}
        className={styles.cardImage}
        href={prompt.href}
        image={prompt.image}
        images={prompt.images}
        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 45vw, 290px"
      >
        <span className={styles.cardPlaceholder}>
          {type?.title || prompt.neuralNetwork?.title || "AI"}
        </span>
      </PromptCardMedia>

      <Link className={styles.cardBody} href={prompt.href}>
        <span className={styles.badges}>
          {type && <span className={styles.badgePrimary}>{type.title}</span>}
          {prompt.neuralNetwork && (
            <span className={styles.badge}>
              <PromptNetworkLogo network={prompt.neuralNetwork} />
              {prompt.neuralNetwork.title}
            </span>
          )}
          {prompt.format && (
            <span className={styles.badge}>
              <FiSmartphone aria-hidden="true" />
              {prompt.format}
            </span>
          )}
          {prompt.difficultyLabel && (
            <span className={styles.badge}>
              <GiBiceps aria-hidden="true" />
              {prompt.difficultyLabel}
            </span>
          )}
        </span>
        <span className={styles.cardTitle}>{prompt.title}</span>
      </Link>
    </article>
  );
}

function PromptNetworkLogo({ network }: { network: PromptTaxonomy }) {
  return (
    <span aria-hidden="true" className={styles.networkLogo}>
      {network.logo ? (
        <Image alt="" height={14} src={network.logo.url} width={14} />
      ) : (
        <FaMagic />
      )}
    </span>
  );
}

function getPromptImageAlt(imageTitle: string, fallback: string): string {
  return imageTitle.trim() || fallback;
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";

import type {
  PromptCollectionItem,
  PromptCollectionsPageData,
} from "@/entities/prompt";

import styles from "./PromptsMenuPage.module.scss";

type PromptCollectionsGridProps = {
  initialHasMore: boolean;
  initialItems: PromptCollectionItem[];
};

export function PromptCollectionsGrid({
  initialHasMore,
  initialItems,
}: PromptCollectionsGridProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  async function loadMore() {
    if (isLoading || !hasMore) {
      return;
    }

    setIsLoading(true);

    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/prompt-collections?page=${nextPage}`);

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as PromptCollectionsPageData;
      const existingIds = new Set(items.map((item) => item.id));
      const nextItems = data.items.filter((item) => !existingIds.has(item.id));

      setItems((currentItems) => [...currentItems, ...nextItems]);
      setHasMore(data.hasMore);
      setPage(nextPage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.collectionsBlock}>
      <div className={styles.collectionGrid}>
        {items.map((collection) => (
          <CollectionCard collection={collection} key={collection.id} />
        ))}
      </div>

      {hasMore && (
        <button
          className={styles.showMore}
          disabled={isLoading}
          onClick={loadMore}
          type="button"
        >
          <span>{isLoading ? "Загружаем" : "Показать еще"}</span>
          <FaChevronDown aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function CollectionCard({
  collection,
}: {
  collection: PromptCollectionItem;
}) {
  return (
    <Link className={styles.collectionCard} href={collection.href}>
      {collection.cover ? (
        <Image
          alt={collection.cover.title || collection.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 45vw, 290px"
          src={collection.cover.url}
        />
      ) : (
        <span className={styles.collectionPlaceholder} aria-hidden="true" />
      )}
      <span className={styles.collectionOverlay} />
      <span className={styles.collectionContent}>
        <strong>{collection.title}</strong>
        <span>{collection.count} {getPromptsCountWord(collection.count)}</span>
      </span>
    </Link>
  );
}

function getPromptsCountWord(count: number): string {
  const absoluteCount = Math.abs(count);
  const lastTwoDigits = absoluteCount % 100;
  const lastDigit = absoluteCount % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "промптов";
  }

  if (lastDigit === 1) {
    return "промпт";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "промпта";
  }

  return "промптов";
}

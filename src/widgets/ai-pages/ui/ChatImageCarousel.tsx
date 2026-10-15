"use client";

import { type CSSProperties, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import { useAiLocale } from "@/features/ai-locale";
import { getImageAlt } from "@/shared/lib/media/image-alt";

import { formatMediaCharacteristics } from "../model/mediaCharacteristics";
import {
  ChatImageOutput,
  ImageGalleryRegistration,
  type ImageGalleryItem,
} from "./ChatImageOutput";
import styles from "./ChatImageCarousel.module.scss";

export type ChatImageCarouselItem = {
  id: string;
  url: string;
  previewUrl?: string | null;
  downloadUrl?: string | null;
  copyUrl?: string | null;
  width?: number | null;
  height?: number | null;
  aspectRatio?: string | null;
  alt?: string;
  fileName?: string;
};

export function ChatImageCarousel({
  chargedCredits,
  compact = false,
  createdAt,
  galleryScope,
  items,
  modelName,
  showDetails = true,
}: {
  chargedCredits?: number | null;
  compact?: boolean;
  createdAt?: {
    dateTime: string;
    label: string;
  } | null;
  galleryScope: string;
  items: ChatImageCarouselItem[];
  modelName?: string | null;
  showDetails?: boolean;
}) {
  const { t } = useAiLocale();
  const [activeIndex, setActiveIndex] = useState(0);
  const resolvedIndex = Math.min(activeIndex, Math.max(0, items.length - 1));
  const activeItem = items[resolvedIndex];
  const canNavigate = items.length > 1;
  const galleryItems = useMemo<ImageGalleryItem[]>(
    () =>
      items.map((item, index) => ({
        id: `${galleryScope}:${item.id}`,
        alt: getImageAlt(item.alt, `${t("Результат генерации", "Generated result")} ${index + 1}`),
        chargedCredits,
        characteristics: formatMediaCharacteristics(
          item.width && item.height
            ? { width: item.width, height: item.height }
            : null,
          item.aspectRatio,
        ),
        downloadUrl: item.downloadUrl || item.url,
        fileName: item.fileName,
        fullUrl: item.url,
        modelName,
        previewUrl: item.previewUrl || item.url,
      })),
    [chargedCredits, galleryScope, items, modelName, t],
  );

  if (!activeItem) return null;

  const ratio = getImageRatio(activeItem);
  const desktopMainWidth = Math.min(680, 460 * ratio);
  const mobileMainWidth = Math.min(680, 380 * ratio);
  const carouselStyle = {
    "--chat-carousel-desktop-width": `${desktopMainWidth + (canNavigate ? 90 : 0)}px`,
    "--chat-carousel-mobile-width": `${mobileMainWidth}px`,
  } as CSSProperties;

  const selectRelative = (offset: -1 | 1) => {
    setActiveIndex((current) => (current + offset + items.length) % items.length);
  };

  return (
    <section
      aria-label={t("Карусель изображений", "Image carousel")}
      className={`${styles.root}${compact ? ` ${styles.compact}` : ""}`}
      style={carouselStyle}
    >
      <ImageGalleryRegistration items={galleryItems} />
      <div className={styles.main}>
        <ChatImageOutput
          alt={galleryItems[resolvedIndex].alt}
          aspectRatio={activeItem.aspectRatio}
          chargedCredits={chargedCredits}
          copyUrl={activeItem.copyUrl}
          createdAt={createdAt}
          downloadUrl={activeItem.downloadUrl}
          fileName={activeItem.fileName}
          galleryId={`${galleryScope}:${activeItem.id}`}
          height={activeItem.height}
          modelName={modelName}
          previewUrl={activeItem.previewUrl}
          showDetails={showDetails}
          url={activeItem.url}
          width={activeItem.width}
        />
        {canNavigate ? (
          <>
            <button
              aria-label={t("Предыдущее изображение", "Previous image")}
              className={`${styles.arrow} ${styles.arrowPrevious}`}
              onClick={() => selectRelative(-1)}
              type="button"
            >
              <FiChevronLeft aria-hidden="true" />
            </button>
            <button
              aria-label={t("Следующее изображение", "Next image")}
              className={`${styles.arrow} ${styles.arrowNext}`}
              onClick={() => selectRelative(1)}
              type="button"
            >
              <FiChevronRight aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
      {canNavigate ? (
        <div
          aria-label={t("Выбор изображения", "Choose image")}
          className={styles.rail}
          role="tablist"
        >
          {items.map((item, index) => (
            <button
              aria-label={`${t("Изображение", "Image")} ${index + 1}`}
              aria-selected={index === resolvedIndex}
              className={styles.thumbnail}
              key={item.id}
              onClick={() => setActiveIndex(index)}
              role="tab"
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed AI/Directus media URL. */}
              <img alt="" src={item.previewUrl || item.url} />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function getImageRatio(item: ChatImageCarouselItem): number {
  if (
    typeof item.width === "number" &&
    Number.isFinite(item.width) &&
    item.width > 0 &&
    typeof item.height === "number" &&
    Number.isFinite(item.height) &&
    item.height > 0
  ) {
    return item.width / item.height;
  }

  const match = item.aspectRatio?.match(/^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/);
  const width = Number(match?.[1]);
  const height = Number(match?.[2]);
  if (width > 0 && height > 0) return width / height;
  return 1;
}

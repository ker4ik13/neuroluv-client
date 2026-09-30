"use client";

import { createPortal } from "react-dom";
import {
  createContext,
  type ReactNode,
  type UIEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiCopy,
  FiDownload,
  FiX,
  FiZap,
} from "react-icons/fi";

import { useFocusTrap } from "@/shared/lib/dom/useFocusTrap";
import {
  ClipboardImageError,
  writeClipboardImage,
} from "@/shared/lib/dom/writeClipboardImage";
import { AI_API_URL } from "@/shared/config/ai";
import { useAiLocale } from "@/features/ai-locale";
import { formatCredits } from "@/shared/lib/formatCredits";

import {
  formatMediaCharacteristics,
  type MediaSize,
  normalizeMediaDimension,
} from "../model/mediaCharacteristics";

import styles from "./ChatImageOutput.module.scss";
import { MediaDownloadLink } from "./MediaDownloadLink";

export type ChatImageOutputProps = {
  galleryId?: string;
  url: string;
  previewUrl?: string | null;
  downloadUrl?: string | null;
  copyUrl?: string | null;
  width?: number | null;
  height?: number | null;
  aspectRatio?: string | null;
  alt?: string;
  fileName?: string;
  modelName?: string | null;
  chargedCredits?: number | null;
  showDetails?: boolean;
  createdAt?: {
    dateTime: string;
    label: string;
  } | null;
};

type CopyState = "idle" | "copying" | "copied" | "error";

type ImageLightboxProps = {
  alt: string;
  children: ReactNode;
  chargedCredits?: number | null;
  characteristics?: string | null;
  downloadUrl?: string | null;
  fileName?: string;
  fullUrl: string;
  galleryId?: string;
  kind?: "document" | "image";
  modelName?: string | null;
  previewUrl?: string | null;
  triggerClassName: string;
};

export type ImageGalleryItem = {
  id: string;
  alt: string;
  chargedCredits?: number | null;
  characteristics?: string | null;
  downloadUrl?: string | null;
  fileName?: string;
  fullUrl: string;
  modelName?: string | null;
  previewUrl: string;
};

type ImageGalleryContextValue = {
  open: (id: string) => void;
  register: (item: ImageGalleryItem) => void;
  update: (item: ImageGalleryItem) => void;
  unregister: (id: string) => void;
};

const ImageGalleryContext = createContext<ImageGalleryContextValue | null>(null);
const THUMBNAIL_PAGE_SIZE = 20;
const THUMBNAIL_LOAD_TIMEOUT_MS = 5_000;
function getCopyErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ClipboardImageError) return error.message;
  return fallback;
}

function hasChargedCredits(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function ImageGalleryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ImageGalleryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const registrationCounts = useRef(new Map<string, number>());

  const register = useCallback((item: ImageGalleryItem) => {
    registrationCounts.current.set(
      item.id,
      (registrationCounts.current.get(item.id) || 0) + 1,
    );
    setItems((current) => {
      const index = current.findIndex((candidate) => candidate.id === item.id);
      if (index < 0) return [...current, item];
      if (isSameGalleryItem(current[index], item)) return current;
      const next = [...current];
      next[index] = item;
      return next;
    });
  }, []);
  const unregister = useCallback((id: string) => {
    const nextCount = (registrationCounts.current.get(id) || 0) - 1;
    if (nextCount > 0) {
      registrationCounts.current.set(id, nextCount);
      return;
    }
    registrationCounts.current.delete(id);
    setItems((current) => current.filter((candidate) => candidate.id !== id));
  }, []);
  const update = useCallback((item: ImageGalleryItem) => {
    setItems((current) => {
      const index = current.findIndex((candidate) => candidate.id === item.id);
      if (index < 0 || isSameGalleryItem(current[index], item)) return current;
      const next = [...current];
      next[index] = item;
      return next;
    });
  }, []);
  const open = useCallback((id: string) => setActiveId(id), []);
  const close = useCallback(() => setActiveId(null), []);
  const context = useMemo(
    () => ({ open, register, unregister, update }),
    [open, register, unregister, update],
  );
  const activeIndex = activeId
    ? items.findIndex((item) => item.id === activeId)
    : -1;

  return (
    <ImageGalleryContext.Provider value={context}>
      {children}
      {activeIndex >= 0 && typeof document !== "undefined"
        ? createPortal(
            <ImageGalleryDialog
              activeIndex={activeIndex}
              items={items}
              onClose={close}
              onSelect={(index) => setActiveId(items[index]?.id || null)}
            />,
            document.body,
          )
        : null}
    </ImageGalleryContext.Provider>
  );
}

export function ImageGalleryRegistration({
  items,
}: {
  items: readonly ImageGalleryItem[];
}) {
  const gallery = useContext(ImageGalleryContext);
  const registeredIds = useRef(new Set<string>());

  useEffect(() => {
    if (!gallery) return;
    const nextIds = new Set(items.map((item) => item.id));
    items.forEach((item) => {
      if (registeredIds.current.has(item.id)) gallery.update(item);
      else gallery.register(item);
    });
    registeredIds.current.forEach((id) => {
      if (!nextIds.has(id)) gallery.unregister(id);
    });
    registeredIds.current = nextIds;
  }, [gallery, items]);

  useEffect(() => {
    if (!gallery) return;
    return () => {
      registeredIds.current.forEach((id) => gallery.unregister(id));
      registeredIds.current.clear();
    };
  }, [gallery]);

  return null;
}

function ImageGalleryDialog({
  activeIndex,
  items,
  onClose,
  onSelect,
}: {
  activeIndex: number;
  items: readonly ImageGalleryItem[];
  onClose: () => void;
  onSelect: (index: number) => void;
}) {
  const { locale, t } = useAiLocale();
  const activeItem = items[activeIndex]!;
  const initialPageStart = Math.floor(activeIndex / THUMBNAIL_PAGE_SIZE) * THUMBNAIL_PAGE_SIZE;
  const [visibleRange, setVisibleRange] = useState(() => ({
    start: initialPageStart,
    end: Math.min(items.length, initialPageStart + THUMBNAIL_PAGE_SIZE),
  }));
  const [loadingDirection, setLoadingDirection] = useState<"next" | "previous" | null>(null);
  const [loadedMainImageUrl, setLoadedMainImageUrl] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingThumbnailIds = useRef(new Set<string>());
  const loadingDirectionRef = useRef<"next" | "previous" | null>(null);
  const reachedPaginationEdgeRef = useRef<"next" | "previous" | null>(null);
  const thumbnailLoadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusTrap(true, dialogRef);

  const finishThumbnailLoading = useCallback(() => {
    pendingThumbnailIds.current.clear();
    loadingDirectionRef.current = null;
    setLoadingDirection(null);
    if (thumbnailLoadTimer.current) clearTimeout(thumbnailLoadTimer.current);
    thumbnailLoadTimer.current = null;
  }, []);

  const loadThumbnailPage = useCallback(
    (direction: "next" | "previous") => {
      if (loadingDirectionRef.current) return;
      const nextRange =
        direction === "previous"
          ? {
              start: Math.max(0, visibleRange.start - THUMBNAIL_PAGE_SIZE),
              end: visibleRange.end,
            }
          : {
              start: visibleRange.start,
              end: Math.min(items.length, visibleRange.end + THUMBNAIL_PAGE_SIZE),
            };
      if (
        nextRange.start === visibleRange.start &&
        nextRange.end === visibleRange.end
      ) {
        return;
      }

      const batch =
        direction === "previous"
          ? items.slice(nextRange.start, visibleRange.start)
          : items.slice(visibleRange.end, nextRange.end);
      const viewport = thumbnailsRef.current;
      const previousScrollWidth = viewport?.scrollWidth || 0;
      pendingThumbnailIds.current = new Set(batch.map((item) => item.id));
      loadingDirectionRef.current = direction;
      setLoadingDirection(direction);
      setVisibleRange(nextRange);

      if (direction === "previous" && viewport) {
        window.requestAnimationFrame(() => {
          viewport.scrollLeft += viewport.scrollWidth - previousScrollWidth;
        });
      }
      thumbnailLoadTimer.current = setTimeout(
        finishThumbnailLoading,
        THUMBNAIL_LOAD_TIMEOUT_MS,
      );
    }, [finishThumbnailLoading, items, visibleRange],
  );

  const selectImage = useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length) return;
      if (index < visibleRange.start) loadThumbnailPage("previous");
      if (index >= visibleRange.end) loadThumbnailPage("next");
      onSelect(index);
    }, [items.length, loadThumbnailPage, onSelect, visibleRange],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") selectImage(activeIndex - 1);
      if (event.key === "ArrowRight") selectImage(activeIndex + 1);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex, onClose, selectImage]);

  useEffect(() => {
    const viewport = thumbnailsRef.current;
    const thumbnail = thumbnailRefs.current.get(activeItem.id);
    if (!viewport || !thumbnail) return;

    const centeredLeft =
      thumbnail.offsetLeft - (viewport.clientWidth - thumbnail.offsetWidth) / 2;
    viewport.scrollTo({
      behavior: "smooth",
      left: Math.max(0, centeredLeft),
    });
  }, [activeItem.id]);

  useEffect(
    () => () => {
      if (thumbnailLoadTimer.current) clearTimeout(thumbnailLoadTimer.current);
    },
    [],
  );

  const markThumbnailLoaded = (id: string) => {
    if (!pendingThumbnailIds.current.delete(id)) return;
    if (pendingThumbnailIds.current.size === 0) finishThumbnailLoading();
  };
  const handleThumbnailScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (loadingDirectionRef.current) return;
      const viewport = event.currentTarget;
      const distanceToEnd =
        viewport.scrollWidth - viewport.clientWidth - viewport.scrollLeft;
      const reachedPreviousEdge = visibleRange.start > 0 && viewport.scrollLeft <= 120;
      const reachedNextEdge = visibleRange.end < items.length && distanceToEnd <= 120;

      if (
        reachedPreviousEdge &&
        reachedPaginationEdgeRef.current !== "previous"
      ) {
        reachedPaginationEdgeRef.current = "previous";
        loadThumbnailPage("previous");
      } else if (
        reachedNextEdge &&
        reachedPaginationEdgeRef.current !== "next"
      ) {
        reachedPaginationEdgeRef.current = "next";
        loadThumbnailPage("next");
      } else if (!reachedPreviousEdge && !reachedNextEdge) {
        reachedPaginationEdgeRef.current = null;
      }
    },
    [items.length, loadThumbnailPage, visibleRange],
  );
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const isMainImageLoading = loadedMainImageUrl !== activeItem.fullUrl;

  return (
    <div
      className={styles.galleryBackdrop}
      onMouseDown={(event) => {
        const target = event.target;
        if (target instanceof Element && target.closest("[data-gallery-control]")) return;
        onClose();
      }}
      role="presentation"
    >
      <div aria-hidden="true" className={styles.galleryBackdropImage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={activeItem.previewUrl} />
      </div>
      <div
        aria-label={t("Галерея изображений чата", "Chat image gallery")}
        aria-modal="true"
        className={styles.galleryDialog}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label={t("Закрыть полноэкранный просмотр", "Close fullscreen preview")}
          className={styles.galleryCloseButton}
          data-gallery-control
          title={t("Закрыть", "Close")}
          type="button"
          onClick={onClose}
        >
          <FiX aria-hidden="true" />
        </button>

        <div className={styles.galleryStage}>
          <button
            aria-label={t("Предыдущее изображение", "Previous image")}
            className={styles.galleryArrow}
            data-gallery-control
            disabled={activeIndex === 0}
            type="button"
            onClick={() => selectImage(activeIndex - 1)}
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
          <div className={styles.galleryMainImageFrame} data-gallery-control>
            {isMainImageLoading ? (
              <span aria-label={t("Загрузка изображения", "Loading image")} className={styles.gallerySpinner} role="status" />
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={activeItem.alt}
              className={`${styles.galleryMainImage} ${isMainImageLoading ? styles.galleryMainImageLoading : ""}`}
              src={activeItem.fullUrl}
              onError={() => setLoadedMainImageUrl(activeItem.fullUrl)}
              onLoad={() => setLoadedMainImageUrl(activeItem.fullUrl)}
            />
          </div>
          <button
            aria-label={t("Следующее изображение", "Next image")}
            className={styles.galleryArrow}
            data-gallery-control
            disabled={activeIndex === items.length - 1}
            type="button"
            onClick={() => selectImage(activeIndex + 1)}
          >
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>

        <div className={styles.galleryInfo}>
          <div className={styles.galleryDetails}>
            {activeItem.modelName ? <strong>{activeItem.modelName}</strong> : null}
            <span className={styles.mediaDetails}>
              <span>
                {activeItem.characteristics || `${activeIndex + 1} / ${items.length}`}
              </span>
              {hasChargedCredits(activeItem.chargedCredits) ? (
                <span className={styles.creditUsage}>
                  <FiZap aria-hidden="true" />
                  {formatCredits(activeItem.chargedCredits, locale)}
                </span>
              ) : null}
            </span>
          </div>
          <MediaDownloadLink
            aria-label={t("Скачать изображение", "Download image")}
            fileName={activeItem.fileName}
            data-gallery-control
            href={activeItem.downloadUrl || activeItem.fullUrl}
            title={t("Скачать изображение", "Download image")}
          >
            <FiDownload aria-hidden="true" />
          </MediaDownloadLink>
        </div>

        <div
          aria-label={t("Все изображения чата", "All chat images")}
          className={styles.galleryThumbnailsViewport}
          ref={thumbnailsRef}
          onScroll={handleThumbnailScroll}
        >
          <div className={styles.galleryThumbnails}>
            {visibleRange.start > 0 ? (
              <span className={styles.gallerySentinel}>
                {loadingDirection === "previous" ? <span aria-label={t("Загрузка изображений", "Loading images")} className={styles.galleryThumbnailSpinner} role="status" /> : null}
              </span>
            ) : null}
            {visibleItems.map((item, offset) => {
              const index = visibleRange.start + offset;
              return (
                <button
                  aria-current={index === activeIndex ? "true" : undefined}
                  aria-label={`${t("Открыть изображение", "Open image")} ${index + 1}`}
                  className={`${styles.galleryThumbnail} ${index === activeIndex ? styles.galleryThumbnailActive : ""}`}
                  data-gallery-control
                  key={item.id}
                  ref={(node) => {
                    if (node) thumbnailRefs.current.set(item.id, node);
                    else thumbnailRefs.current.delete(item.id);
                  }}
                  type="button"
                  onClick={() => selectImage(index)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    loading="lazy"
                    src={item.previewUrl}
                    onError={() => markThumbnailLoaded(item.id)}
                    onLoad={() => markThumbnailLoaded(item.id)}
                  />
                </button>
              );
            })}
            {visibleRange.end < items.length ? (
              <span className={styles.gallerySentinel}>
                {loadingDirection === "next" ? <span aria-label={t("Загрузка изображений", "Loading images")} className={styles.galleryThumbnailSpinner} role="status" /> : null}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function isSameGalleryItem(left: ImageGalleryItem, right: ImageGalleryItem): boolean {
  return (
    left.alt === right.alt &&
    left.chargedCredits === right.chargedCredits &&
    left.characteristics === right.characteristics &&
    left.downloadUrl === right.downloadUrl &&
    left.fileName === right.fileName &&
    left.fullUrl === right.fullUrl &&
    left.modelName === right.modelName &&
    left.previewUrl === right.previewUrl
  );
}

function useGalleryImage(item: ImageGalleryItem | null): (() => void) | null {
  const gallery = useContext(ImageGalleryContext);
  const itemId = item?.id;

  useEffect(() => {
    if (!gallery || !item) return;
    gallery.register(item);
  }, [gallery, item]);

  useEffect(() => {
    if (!gallery || !itemId) return;
    return () => gallery.unregister(itemId);
  }, [gallery, itemId]);

  return gallery && item ? () => gallery.open(item.id) : null;
}

export function ImageLightbox({
  alt,
  children,
  chargedCredits,
  characteristics,
  downloadUrl,
  fileName,
  fullUrl,
  galleryId,
  kind = "image",
  modelName,
  previewUrl,
  triggerClassName,
}: ImageLightboxProps) {
  const { locale, t } = useAiLocale();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const galleryItem = useMemo<ImageGalleryItem | null>(
    () =>
      kind === "image" && galleryId
        ? {
            id: galleryId,
            alt,
            chargedCredits,
            characteristics,
            downloadUrl,
            fileName,
            fullUrl,
            modelName,
            previewUrl: previewUrl || fullUrl,
          }
        : null,
    [
      alt,
      chargedCredits,
      characteristics,
      downloadUrl,
      fileName,
      fullUrl,
      galleryId,
      kind,
      modelName,
      previewUrl,
    ],
  );
  const openGallery = useGalleryImage(galleryItem);

  useFocusTrap(isFullscreen, dialogRef);

  useEffect(() => {
    if (!isFullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  return (
    <>
      <button
        aria-label={
          kind === "image"
            ? t("Открыть изображение на весь экран", "Open image fullscreen")
            : t("Открыть файл на весь экран", "Open file fullscreen")
        }
        className={triggerClassName}
        onClick={() => {
          if (openGallery) openGallery();
          else setIsFullscreen(true);
        }}
        type="button"
      >
        {children}
      </button>

      {isFullscreen && !openGallery && typeof document !== "undefined"
        ? createPortal(
            <div
              className={styles.backdrop}
              onMouseDown={() => setIsFullscreen(false)}
              role="presentation"
            >
              <div
                aria-label={
                  kind === "image"
                    ? t("Просмотр изображения", "Image preview")
                    : t("Просмотр файла", "File preview")
                }
                aria-modal="true"
                className={styles.dialog}
                ref={dialogRef}
                role="dialog"
                tabIndex={-1}
              >
                <button
                  aria-label={t("Закрыть полноэкранный просмотр", "Close fullscreen preview")}
                  className={styles.closeButton}
                  onClick={() => setIsFullscreen(false)}
                  title={t("Закрыть", "Close")}
                  type="button"
                >
                  <FiX aria-hidden="true" />
                </button>
                {kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={alt}
                    className={styles.fullscreenImage}
                    onMouseDown={(event) => event.stopPropagation()}
                    src={fullUrl}
                  />
                ) : (
                  <iframe
                    className={styles.fullscreenDocument}
                    onMouseDown={(event) => event.stopPropagation()}
                    src={fullUrl}
                    title={alt}
                  />
                )}
                {characteristics || hasChargedCredits(chargedCredits) ? (
                  <p
                    className={styles.fullscreenCharacteristics}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    {characteristics ? <span>{characteristics}</span> : null}
                    {hasChargedCredits(chargedCredits) ? (
                      <span className={styles.creditUsage}>
                        <FiZap aria-hidden="true" />
                        {formatCredits(chargedCredits, locale)}
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function ChatImageOutput({
  galleryId,
  url,
  previewUrl,
  downloadUrl,
  copyUrl,
  width,
  height,
  aspectRatio,
  alt,
  fileName = "neuroluv-image.webp",
  modelName,
  chargedCredits,
  showDetails = true,
  createdAt,
}: ChatImageOutputProps) {
  const { locale, t } = useAiLocale();
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [copyMessage, setCopyMessage] = useState("");
  const [measuredSize, setMeasuredSize] = useState<MediaSize | null>(null);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const imageSource = previewUrl || url;
  const resolvedAlt = alt || t("Результат генерации", "Generated result");
  const downloadSource = downloadUrl || url;
  const copySource = copyUrl ? resolveApiUrl(copyUrl) : url;
  const metadataSize = useMemo<MediaSize | null>(() => {
    const normalizedWidth = normalizeMediaDimension(width);
    const normalizedHeight = normalizeMediaDimension(height);

    return normalizedWidth && normalizedHeight
      ? { width: normalizedWidth, height: normalizedHeight }
      : null;
  }, [height, width]);
  const characteristics = formatMediaCharacteristics(
    metadataSize || measuredSize,
    aspectRatio,
  );

  useEffect(() => {
    if (metadataSize) return;
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (!active || image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
      setMeasuredSize({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.src = url;
    return () => {
      active = false;
      image.onload = null;
    };
  }, [metadataSize, url]);

  useEffect(
    () => () => {
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    },
    [],
  );

  const handleCopy = () => {
    if (copyState === "copying") return;

    if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    setCopyState("copying");
    setCopyMessage(t("Копируем изображение…", "Copying image…"));

    // Do not await anything before this call: Safari requires clipboard.write
    // to begin synchronously within the user's click/keyboard activation.
    void writeClipboardImage(copySource, {
      credentials: copyUrl ? "include" : "omit",
    })
      .then(() => {
        setCopyState("copied");
        setCopyMessage(t("Изображение скопировано", "Image copied"));
        copyResetTimerRef.current = setTimeout(() => {
          setCopyState("idle");
          setCopyMessage("");
        }, 2_000);
      })
      .catch((error: unknown) => {
        setCopyState("error");
        setCopyMessage(getCopyErrorMessage(error, t("Не удалось скопировать изображение. Скачайте файл и попробуйте снова.", "Unable to copy the image. Download it and try again.")));
      });
  };

  return (
    <figure className={styles.root}>
      <ImageLightbox
        alt={resolvedAlt}
        chargedCredits={chargedCredits}
        characteristics={characteristics}
        downloadUrl={downloadSource}
        fileName={fileName}
        fullUrl={url}
        galleryId={galleryId || url}
        modelName={modelName}
        previewUrl={imageSource}
        triggerClassName={styles.imageButton}
      >
        {/* Signed and blob URLs cannot be safely handled by next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={resolvedAlt}
          className={styles.image}
          loading="lazy"
          src={imageSource}
        />
      </ImageLightbox>

      {showDetails ? (
        <figcaption className={styles.caption}>
          <span className={styles.actions}>
            <button
              aria-label={copyState === "copied" ? t("Изображение скопировано", "Image copied") : t("Скопировать изображение", "Copy image")}
              aria-busy={copyState === "copying"}
              className={styles.iconButton}
              disabled={copyState === "copying"}
              onClick={handleCopy}
              title={copyState === "copied" ? t("Изображение скопировано", "Image copied") : t("Скопировать изображение", "Copy image")}
              type="button"
            >
              {copyState === "copied" ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
            </button>
            <MediaDownloadLink
              aria-label={t("Скачать изображение", "Download image")}
              className={styles.iconButton}
              fileName={fileName}
              href={downloadSource}
              title={t("Скачать изображение", "Download image")}
            >
              <FiDownload aria-hidden="true" />
            </MediaDownloadLink>
          </span>

          {createdAt ? (
            <time className={styles.createdAt} dateTime={createdAt.dateTime}>
              {createdAt.label}
            </time>
          ) : null}

          {characteristics || hasChargedCredits(chargedCredits) ? (
            <span className={styles.mediaDetails}>
              {characteristics ? (
                <span className={styles.characteristics}>{characteristics}</span>
              ) : null}
              {hasChargedCredits(chargedCredits) ? (
                <span className={styles.creditUsage}>
                  <FiZap aria-hidden="true" />
                  {formatCredits(chargedCredits, locale)}
                </span>
              ) : null}
            </span>
          ) : null}
        </figcaption>
      ) : null}

      <span
        aria-live="polite"
        className={copyState === "error" ? styles.copyError : styles.visuallyHidden}
        role={copyState === "error" ? "alert" : "status"}
      >
        {copyMessage}
      </span>

    </figure>
  );
}

function resolveApiUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/v1/")) {
    return `${new URL(AI_API_URL).origin}${value}`;
  }
  return `${AI_API_URL}/${value.replace(/^\/+/, "")}`;
}

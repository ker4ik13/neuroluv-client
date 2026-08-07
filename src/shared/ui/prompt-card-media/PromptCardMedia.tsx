"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaExpand, FaPlay, FaXmark } from "react-icons/fa6";

import styles from "./PromptCardMedia.module.scss";

export type PromptCardMediaItem = {
  id?: number | string;
  title?: string | null;
  type?: string | null;
  url: string;
  width?: number | null;
  height?: number | null;
};

type PromptCardMediaProps = {
  alt: string;
  autoPlay?: boolean;
  children?: ReactNode;
  className: string;
  enableFullscreen?: boolean;
  href?: string;
  image?: PromptCardMediaItem | null;
  images?: PromptCardMediaItem[];
  mode?: "card" | "detail";
  poster?: string;
  priority?: boolean;
  sizes: string;
  style?: CSSProperties;
};

const EMPTY_MEDIA: PromptCardMediaItem[] = [];

function isVideo(item: PromptCardMediaItem | null | undefined): boolean {
  return Boolean(item?.type?.startsWith("video/"));
}

function modulo(value: number, length: number): number {
  return ((value % length) + length) % length;
}

export function PromptCardMedia({
  alt,
  autoPlay = false,
  children,
  className,
  enableFullscreen = false,
  href,
  image = null,
  images = EMPTY_MEDIA,
  mode = "card",
  poster: posterOverride,
  priority = false,
  sizes,
  style,
}: PromptCardMediaProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ id: number; x: number } | null>(null);
  const dragged = useRef(false);
  const normalizedItems = useMemo(() => {
    const source = images.length > 0 ? images : image ? [image] : [];
    const unique = new Map<string, PromptCardMediaItem>();

    source.forEach((item, index) => {
      if (!item?.url) return;
      unique.set(String(item.id ?? `${item.url}:${index}`), item);
    });

    const items = [...unique.values()];
    return mode === "card" && isVideo(items[0]) ? items.slice(0, 1) : items;
  }, [image, images, mode]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [peek, setPeek] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const canNavigate = normalizedItems.length > 1;
  const currentIndex = Math.min(activeIndex, Math.max(0, normalizedItems.length - 1));
  const poster = isVideo(normalizedItems[0])
    ? posterOverride || images.find((item) => !isVideo(item))?.url
    : undefined;

  useEffect(() => {
    if (!canNavigate || mode !== "card" || isVideo(normalizedItems[0])) return;
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let startTimer: number | undefined;
    let finishTimer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        startTimer = window.setTimeout(() => setPeek(true), 420);
        observer.disconnect();
        finishTimer = window.setTimeout(() => setPeek(false), 1900);
      },
      { threshold: 0.7 },
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      if (startTimer) window.clearTimeout(startTimer);
      if (finishTimer) window.clearTimeout(finishTimer);
    };
  }, [canNavigate, mode, normalizedItems]);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
      if (event.key === "ArrowLeft") setActiveIndex((current) => modulo(current - 1, normalizedItems.length));
      if (event.key === "ArrowRight") setActiveIndex((current) => modulo(current + 1, normalizedItems.length));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen, normalizedItems.length]);

  const navigate = useCallback((direction: -1 | 1) => {
    setPeek(false);
    setActiveIndex((current) => modulo(current + direction, normalizedItems.length));
  }, [normalizedItems.length]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canNavigate || event.pointerType === "mouse") return;
    pointerStart.current = { id: event.pointerId, x: event.clientX };
    dragged.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerStart.current || pointerStart.current.id !== event.pointerId) return;
    const distance = event.clientX - pointerStart.current.x;
    pointerStart.current = null;
    if (Math.abs(distance) < 38) return;
    dragged.current = true;
    navigate(distance > 0 ? -1 : 1);
  };

  const playVideo = () => {
    if (mode === "detail" || autoPlay) return;
    const video = rootRef.current?.querySelector("video");
    void video?.play().catch(() => undefined);
  };

  const resetVideo = () => {
    if (mode === "detail" || autoPlay) return;
    const video = rootRef.current?.querySelector("video");
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  const mediaContent = normalizedItems.length > 0 ? (
    <div
      className={`${styles.track}${peek ? ` ${styles.trackPeek}` : ""}`}
      style={{ transform: `translate3d(-${currentIndex * 100}%, 0, 0)` }}
    >
      {normalizedItems.map((item, index) => {
        const content = (
          <span className={styles.slideContent}>
            {isVideo(item) ? (
              <>
                <video
                  aria-label={alt}
                  autoPlay={mode === "detail" || autoPlay}
                  className={styles.media}
                  controls={mode === "detail"}
                  loop
                  muted
                  playsInline
                  poster={poster}
                  preload="metadata"
                  src={item.url}
                />
                {mode === "card" ? (
                  <span className={styles.playBadge} aria-hidden="true"><FaPlay /></span>
                ) : null}
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- Directus/CDN URL is already transformed where needed.
              <img
                alt={index === currentIndex ? (item.title || alt) : ""}
                className={styles.media}
                decoding="async"
                fetchPriority={priority && index === 0 ? "high" : "auto"}
                loading={priority && index === 0 ? "eager" : "lazy"}
                sizes={sizes}
                src={item.url}
              />
            )}
          </span>
        );

        return (
          <span aria-hidden={index !== currentIndex} className={styles.slide} key={String(item.id ?? item.url)}>
            {href ? (
              <Link
                aria-label={alt}
                className={styles.slideLink}
                href={href}
                onClick={(event) => {
                  if (!dragged.current) return;
                  event.preventDefault();
                  dragged.current = false;
                }}
                tabIndex={index === currentIndex ? 0 : -1}
              >
                {content}
              </Link>
            ) : content}
          </span>
        );
      })}
    </div>
  ) : children;

  return (
    <div
      className={`${className} ${styles.root}`}
      onMouseEnter={isVideo(normalizedItems[0]) ? playVideo : undefined}
      onMouseLeave={isVideo(normalizedItems[0]) ? resetVideo : undefined}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      ref={rootRef}
      style={style}
    >
      {mediaContent}
      {canNavigate ? (
        <>
          <button aria-label="Предыдущее изображение" className={`${styles.arrow} ${styles.arrowPrevious}`} onClick={() => navigate(-1)} type="button"><FaChevronLeft /></button>
          <button aria-label="Следующее изображение" className={`${styles.arrow} ${styles.arrowNext}`} onClick={() => navigate(1)} type="button"><FaChevronRight /></button>
          <div aria-label="Выбор изображения" className={styles.dots} role="group">
            {normalizedItems.map((item, index) => (
              <button
                aria-label={`Изображение ${index + 1}`}
                aria-pressed={index === currentIndex}
                className={index === currentIndex ? styles.dotActive : styles.dot}
                key={String(item.id ?? item.url)}
                onClick={() => { setPeek(false); setActiveIndex(index); }}
                type="button"
              />
            ))}
          </div>
        </>
      ) : null}
      {enableFullscreen && normalizedItems[currentIndex] ? (
        <button aria-label="Открыть на весь экран" className={styles.fullscreenButton} onClick={() => setFullscreen(true)} type="button"><FaExpand /></button>
      ) : null}
      {fullscreen && normalizedItems[currentIndex] && typeof document !== "undefined"
        ? createPortal(
            <div aria-label="Просмотр медиа на весь экран" aria-modal="true" className={styles.fullscreen} role="dialog" onClick={() => setFullscreen(false)}>
              <button aria-label="Закрыть" className={styles.fullscreenClose} onClick={() => setFullscreen(false)} type="button"><FaXmark /></button>
              {isVideo(normalizedItems[currentIndex]) ? (
                <video autoPlay controls playsInline src={normalizedItems[currentIndex].url} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- original Directus asset in fullscreen.
                <img alt={normalizedItems[currentIndex].title || alt} onClick={(event) => event.stopPropagation()} src={normalizedItems[currentIndex].url} />
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

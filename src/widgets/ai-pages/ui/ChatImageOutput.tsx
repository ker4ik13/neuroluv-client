"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheck,
  FiCopy,
  FiDownload,
  FiMaximize2,
  FiX,
} from "react-icons/fi";

import { useFocusTrap } from "@/shared/lib/dom/useFocusTrap";
import {
  ClipboardImageError,
  writeClipboardImage,
} from "@/shared/lib/dom/writeClipboardImage";
import { AI_API_URL } from "@/shared/config/ai";

import styles from "./ChatImageOutput.module.scss";

export type ChatImageOutputProps = {
  url: string;
  previewUrl?: string | null;
  downloadUrl?: string | null;
  copyUrl?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string;
  fileName?: string;
};

type CopyState = "idle" | "copying" | "copied" | "error";

type ImageSize = {
  width: number;
  height: number;
};

function normalizeDimension(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value);
}

function greatestCommonDivisor(left: number, right: number): number {
  let first = Math.abs(left);
  let second = Math.abs(right);

  while (second !== 0) {
    const remainder = first % second;
    first = second;
    second = remainder;
  }

  return first || 1;
}

function formatCharacteristics(size: ImageSize | null): string | null {
  if (!size) return null;

  const divisor = greatestCommonDivisor(size.width, size.height);
  return `${size.width} × ${size.height} px · ${size.width / divisor}:${size.height / divisor}`;
}

function getCopyErrorMessage(error: unknown): string {
  if (error instanceof ClipboardImageError) return error.message;
  return "Не удалось скопировать изображение. Скачайте файл и попробуйте снова.";
}

export function ChatImageOutput({
  url,
  previewUrl,
  downloadUrl,
  copyUrl,
  width,
  height,
  alt = "Результат генерации",
  fileName = "neuroluv-image.webp",
}: ChatImageOutputProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [copyMessage, setCopyMessage] = useState("");
  const [measuredSize, setMeasuredSize] = useState<ImageSize | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const imageSource = previewUrl || url;
  const downloadSource = downloadUrl || url;
  const copySource = copyUrl ? resolveApiUrl(copyUrl) : url;
  const metadataSize = useMemo<ImageSize | null>(() => {
    const normalizedWidth = normalizeDimension(width);
    const normalizedHeight = normalizeDimension(height);

    return normalizedWidth && normalizedHeight
      ? { width: normalizedWidth, height: normalizedHeight }
      : null;
  }, [height, width]);
  const characteristics = formatCharacteristics(metadataSize || measuredSize);

  useFocusTrap(isFullscreen, dialogRef);

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
    setCopyMessage("Копируем изображение…");

    // Do not await anything before this call: Safari requires clipboard.write
    // to begin synchronously within the user's click/keyboard activation.
    void writeClipboardImage(copySource, {
      credentials: copyUrl ? "include" : "omit",
    })
      .then(() => {
        setCopyState("copied");
        setCopyMessage("Изображение скопировано");
        copyResetTimerRef.current = setTimeout(() => {
          setCopyState("idle");
          setCopyMessage("");
        }, 2_000);
      })
      .catch((error: unknown) => {
        setCopyState("error");
        setCopyMessage(getCopyErrorMessage(error));
      });
  };

  return (
    <figure className={styles.root}>
      <button
        aria-label="Открыть изображение на весь экран"
        className={styles.imageButton}
        onClick={() => setIsFullscreen(true)}
        type="button"
      >
        {/* Signed and blob URLs cannot be safely handled by next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={alt}
          className={styles.image}
          src={imageSource}
        />
      </button>

      <figcaption className={styles.caption}>
        <span className={styles.actions}>
          <button
            aria-label={copyState === "copied" ? "Изображение скопировано" : "Скопировать изображение"}
            aria-busy={copyState === "copying"}
            className={styles.iconButton}
            disabled={copyState === "copying"}
            onClick={handleCopy}
            title={copyState === "copied" ? "Изображение скопировано" : "Скопировать изображение"}
            type="button"
          >
            {copyState === "copied" ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
          </button>
          <a
            aria-label="Скачать изображение"
            className={styles.iconButton}
            download={fileName}
            href={downloadSource}
            title="Скачать изображение"
          >
            <FiDownload aria-hidden="true" />
          </a>
          <button
            aria-label="Открыть изображение на весь экран"
            className={styles.iconButton}
            onClick={() => setIsFullscreen(true)}
            title="Открыть на весь экран"
            type="button"
          >
            <FiMaximize2 aria-hidden="true" />
          </button>
        </span>

        {characteristics ? (
          <span className={styles.characteristics}>{characteristics}</span>
        ) : null}
      </figcaption>

      <span
        aria-live="polite"
        className={copyState === "error" ? styles.copyError : styles.visuallyHidden}
        role={copyState === "error" ? "alert" : "status"}
      >
        {copyMessage}
      </span>

      {isFullscreen && typeof document !== "undefined"
        ? createPortal(
            <div
              className={styles.backdrop}
              onMouseDown={() => setIsFullscreen(false)}
              role="presentation"
            >
              <div
                aria-label="Просмотр изображения"
                aria-modal="true"
                className={styles.dialog}
                onMouseDown={(event) => event.stopPropagation()}
                ref={dialogRef}
                role="dialog"
                tabIndex={-1}
              >
                <button
                  aria-label="Закрыть полноэкранный просмотр"
                  className={styles.closeButton}
                  onClick={() => setIsFullscreen(false)}
                  title="Закрыть"
                  type="button"
                >
                  <FiX aria-hidden="true" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={alt} className={styles.fullscreenImage} src={url} />
                {characteristics ? (
                  <p className={styles.fullscreenCharacteristics}>{characteristics}</p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
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

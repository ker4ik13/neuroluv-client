"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { FaPlay } from "react-icons/fa";

import styles from "./PromptCardMedia.module.scss";

type PromptCardMediaImage = {
  title: string;
  type: string | null;
  url: string;
};

type PromptCardMediaProps = {
  alt: string;
  autoPlay?: boolean;
  children?: ReactNode;
  className: string;
  image: PromptCardMediaImage | null;
  sizes: string;
};

export function PromptCardMedia({
  alt,
  autoPlay = false,
  children,
  className,
  image,
  sizes,
}: PromptCardMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = Boolean(image?.type?.startsWith("video/"));
  const shouldAutoPlay = isVideo && autoPlay;

  const playVideo = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    void video.play().catch(() => undefined);
  }, []);

  const resetVideo = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.pause();
    video.currentTime = 0;
  }, []);

  useEffect(() => {
    if (!shouldAutoPlay) {
      resetVideo();
      return;
    }

    playVideo();
  }, [image?.url, playVideo, resetVideo, shouldAutoPlay]);

  return (
    <span
      className={className}
      onMouseEnter={isVideo && !shouldAutoPlay ? playVideo : undefined}
      onMouseLeave={isVideo && !shouldAutoPlay ? resetVideo : undefined}
      onTouchEnd={isVideo && !shouldAutoPlay ? resetVideo : undefined}
    >
      {image ? (
        isVideo ? (
          <>
            <video
              aria-label={alt}
              autoPlay={shouldAutoPlay}
              className={styles.media}
              loop
              muted
              playsInline
              preload="metadata"
              ref={videoRef}
              src={image.url}
            />
            <span className={styles.playBadge} aria-hidden="true">
              <FaPlay />
            </span>
          </>
        ) : (
          <Image
            alt={alt}
            className={styles.media}
            fill
            sizes={sizes}
            src={image.url}
          />
        )
      ) : (
        children
      )}
    </span>
  );
}

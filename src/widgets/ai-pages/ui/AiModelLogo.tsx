"use client";

import { useState } from "react";
import { RiSparkling2Fill } from "react-icons/ri";

import styles from "./AiModelLogo.module.scss";

export function AiModelLogo({
  label,
  logoUrl,
  size = "small",
}: {
  label: string;
  logoUrl?: string | null;
  size?: "small" | "medium";
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(logoUrl && failedUrl !== logoUrl);

  return (
    <span
      aria-hidden="true"
      className={`${styles.logo} ${size === "medium" ? styles.logoMedium : ""}`}
      title={label}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL is a transformed Directus asset.
        <img alt="" src={logoUrl!} onError={() => setFailedUrl(logoUrl || null)} />
      ) : (
        <RiSparkling2Fill />
      )}
    </span>
  );
}

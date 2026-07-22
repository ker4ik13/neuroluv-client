"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import type { NavigationLogo } from "@/entities/navigation";

import styles from "./SiteHeaderLogo.module.scss";

type SiteHeaderLogoProps = {
  logo: NavigationLogo | null;
  fallback?: ReactNode;
};

export function SiteHeaderLogo({ logo, fallback = null }: SiteHeaderLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);

  if (!logo || hasImageError) {
    return fallback;
  }

  return (
    <span className={styles.box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        aria-hidden="true"
        className={styles.image}
        src={logo.url}
        title={logo.title}
        onError={() => setHasImageError(true)}
      />
    </span>
  );
}

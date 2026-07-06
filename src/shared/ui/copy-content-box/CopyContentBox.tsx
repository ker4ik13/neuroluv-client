"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AiOutlineCopy } from "react-icons/ai";

import styles from "./CopyContentBox.module.scss";

type CopyContentBoxProps = {
  children: ReactNode;
  className?: string;
  copiedLabel?: string;
  copyLabel?: string;
  copyText: string;
  title: string;
};

export function CopyContentBox({
  children,
  className,
  copiedLabel = "Скопировано",
  copyLabel = "Скопировать",
  copyText,
  title,
}: CopyContentBoxProps) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    const plainText = copyText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    try {
      await navigator.clipboard.writeText(plainText);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <div className={`${styles.box} ${className || ""}`}>
      <div className={styles.head}>
        <h3>{title}</h3>
        <button className={styles.button} onClick={handleCopy} type="button">
          {isCopied ? copiedLabel : copyLabel}
          <AiOutlineCopy aria-hidden="true" />
        </button>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

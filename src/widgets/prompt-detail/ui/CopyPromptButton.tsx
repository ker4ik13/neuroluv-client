"use client";

import { useState } from "react";
import { AiOutlineCopy } from "react-icons/ai";

import styles from "./PromptDetailPage.module.scss";

type CopyPromptButtonProps = {
  label?: string;
  text: string;
};

export function CopyPromptButton({
  label = "Скопировать промпт",
  text,
}: CopyPromptButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    const plainText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    try {
      await navigator.clipboard.writeText(plainText);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <button className={styles.heroActionButton} onClick={handleCopy} type="button">
      {isCopied ? "Скопировано" : label}
      <AiOutlineCopy aria-hidden="true" />
    </button>
  );
}

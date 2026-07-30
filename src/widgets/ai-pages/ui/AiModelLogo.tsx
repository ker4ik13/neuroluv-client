"use client";

import { useState } from "react";
import { RiImageAiLine, RiOpenaiLine, RiSparkling2Fill } from "react-icons/ri";

import styles from "./AiModelLogo.module.scss";

const DARK_MONOCHROME_LOGO_PATTERN =
  /^(?:(?:ChatGPT|OpenAI|Claude|Anthropic|Grok|xAI|Kling|Krea|Recraft)(?:\s|$)|GPT(?:[-\s]|$))/iu;
const GPT_IMAGE_LOGO_PATTERN =
  /^(?:OpenAI[\s/_-]+)?GPT[\s_-]*Image(?:[\s_-]|$)/iu;
const CHATGPT_LOGO_PATTERN =
  /^(?:(?:OpenAI[\s/_-]+)?(?:Chat[\s_-]*)?GPT)(?:[\s_-]|\d|$)/iu;

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
  const normalizedLabel = label.trim();
  const brand = GPT_IMAGE_LOGO_PATTERN.test(normalizedLabel)
    ? "gpt-image"
    : CHATGPT_LOGO_PATTERN.test(normalizedLabel)
      ? "chatgpt"
      : null;
  const showImage = Boolean(!brand && logoUrl && failedUrl !== logoUrl);
  const usesAdaptiveMonochromeLogo =
    DARK_MONOCHROME_LOGO_PATTERN.test(normalizedLabel);

  return (
    <span
      aria-hidden="true"
      className={[
        styles.logo,
        size === "medium" ? styles.logoMedium : "",
        brand ? styles.logoBrand : "",
        brand === "chatgpt" ? styles.logoChatGpt : "",
        brand === "gpt-image" ? styles.logoGptImage : "",
        usesAdaptiveMonochromeLogo ? styles.logoMonochrome : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={label}
    >
      {brand === "chatgpt" ? (
        <RiOpenaiLine />
      ) : brand === "gpt-image" ? (
        <RiImageAiLine />
      ) : showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL is a transformed Directus asset.
        <img alt="" src={logoUrl!} onError={() => setFailedUrl(logoUrl || null)} />
      ) : (
        <RiSparkling2Fill />
      )}
    </span>
  );
}

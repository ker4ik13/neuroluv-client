"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCopy,
  FiImage,
  FiRefreshCw,
  FiZap,
} from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import { useAiLocale } from "@/features/ai-locale";
import { type AiPublicShare } from "@/shared/api/ai";

import { useAiResource } from "../model/api";
import { formatDate } from "../model/format";
import { writeLocalJson } from "../model/storage";
import { AiButton, AiCard, AiPage, FieldMessage } from "./AiUi";
import styles from "./AiPages.module.scss";

export function SharePage({
  slug,
  initialShare = null,
}: {
  slug: string;
  initialShare?: AiPublicShare | null;
}) {
  const router = useRouter();
  const { session } = useAiSession();
  const { locale, t } = useAiLocale();
  const share = useAiResource<AiPublicShare>(
    `/public/shares/${encodeURIComponent(slug)}`,
    initialShare,
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function usePrompt() {
    const prompt = share.data?.prompt?.trim();
    if (!prompt) {
      setError(t("Промпт этой работы недоступен", "This work's prompt is unavailable"));
      return;
    }
    if (!session.authenticated) {
      router.push(`/ai/auth?returnTo=${encodeURIComponent(`/ai/share/${slug}`)}`);
      return;
    }

    setError(null);
    writeLocalJson("neuroluv-ai:create-preset", {
      prompt,
      ...(share.data?.negativePrompt ? { negativePrompt: share.data.negativePrompt } : {}),
      ...(share.data?.modelId ? { modelId: share.data.modelId } : {}),
    });
    router.push(
      share.data?.modality === "video"
        ? "/ai/create/video"
        : share.data?.modality === "text"
          ? "/ai/create/text"
          : "/ai/create/photo",
    );
  }

  async function copyPage() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("Не удалось скопировать ссылку", "Unable to copy the link"));
    }
  }

  if (share.isLoading) {
    return (
      <AiPage>
        <div aria-busy="true" className={styles.shareLoading}><span /><span /></div>
      </AiPage>
    );
  }

  if (share.error || !share.data) {
    const revoked = share.errorStatus === 404 || share.errorStatus === 410;
    return (
      <AiPage>
        <AiCard className={styles.shareMissing}>
          <FiAlertCircle aria-hidden="true" />
          <h1>{revoked ? t("Ссылка недоступна", "Link unavailable") : t("Не удалось открыть работу", "Unable to open the work")}</h1>
          <p>
            {revoked
              ? t("Владелец мог отозвать ссылку, либо работа больше не существует.", "The owner may have revoked the link, or the work no longer exists.")
              : share.error}
          </p>
          {!revoked ? <AiButton variant="secondary" onClick={share.reload}><FiRefreshCw aria-hidden="true" /> {t("Повторить", "Retry")}</AiButton> : null}
        </AiCard>
      </AiPage>
    );
  }

  return (
    <AiPage>
      <header className={`${styles.detailToolbar} ${styles.shareToolbar}`}>
        <strong className={styles.detailTitle}>{share.data.title}</strong>
        <AiButton variant="secondary" onClick={() => void copyPage()}>
          <FiCopy aria-hidden="true" />
          {copied ? t("Скопировано", "Copied") : t("Поделиться", "Share")}
        </AiButton>
      </header>

      <div className={styles.shareGrid}>
        <AiCard className={styles.shareResult}>
          <PublicResult share={share.data} />
          <div className={styles.resultMeta}>
            <span>
              <FiCalendar aria-hidden="true" />
              {formatDate(share.data.createdAt, true, locale)}
            </span>
            {share.data.modelName ? <strong>{share.data.modelName}</strong> : null}
          </div>
        </AiCard>
        <aside className={styles.shareAside}>
          <AiCard className={styles.usePromptCard}>
            <h2>{t("Использовать промпт", "Use prompt")}</h2>
            <p>
              {share.data.prompt
                ? t(
                    "Промпт и модель будут перенесены в новый приватный чат.",
                    "The prompt and model will be copied into a new private chat.",
                  )
                : t(
                    "Промпт этой работы недоступен.",
                    "This work's prompt is unavailable.",
                  )}
            </p>
            <AiButton disabled={!share.data.prompt} onClick={usePrompt}>
              <FiZap aria-hidden="true" />
              {t("Использовать промпт", "Use prompt")}
            </AiButton>
            {error ? <FieldMessage>{error}</FieldMessage> : null}
          </AiCard>
        </aside>
      </div>
    </AiPage>
  );
}

function PublicResult({ share }: { share: AiPublicShare }) {
  const { t } = useAiLocale();
  if (share.expired) {
    return <div className={styles.deletedResult}><FiImage aria-hidden="true" /><h2>{t("Файл недоступен", "File unavailable")}</h2></div>;
  }
  if (share.modality === "video" && share.outputUrl) {
    return <video controls playsInline preload="metadata" src={share.outputUrl} />;
  }
  if (share.modality === "text" && share.textContent) {
    return <div className={styles.textResult}><p>{share.textContent}</p></div>;
  }
  if (share.outputUrl || share.previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- signed/CDN URL
      <img alt={share.title} src={share.outputUrl || share.previewUrl || ""} />
    );
  }
  return <div className={styles.deletedResult}><FiImage aria-hidden="true" /><h2>{t("Файл недоступен", "File unavailable")}</h2></div>;
}

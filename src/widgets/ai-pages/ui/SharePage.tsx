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
import {
  aiApiFetch,
  type AiPublicPromptUse,
  type AiPublicShare,
} from "@/shared/api/ai";

import { useAiResource } from "../model/api";
import { formatDate } from "../model/format";
import { writeLocalJson } from "../model/storage";
import { AiButton, AiCard, AiPage, FieldMessage } from "./AiUi";
import { ImageGalleryProvider, ImageLightbox } from "./ChatImageOutput";
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
  const [isUsingPrompt, setIsUsingPrompt] = useState(false);

  async function handleUsePrompt() {
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
    setIsUsingPrompt(true);
    try {
      const preset = await aiApiFetch<AiPublicPromptUse>(
        `/public/shares/${encodeURIComponent(slug)}/use-prompt`,
        { method: "POST" },
      );
      writeLocalJson("neuroluv-ai:create-preset", {
        prompt: preset.prompt,
        publicPromptUseToken: preset.draftToken,
        promptMinimumReferenceFiles: preset.minimumReferenceFiles,
        promptMaximumReferenceFiles: preset.maximumReferenceFiles,
        ...(preset.negativePrompt ? { negativePrompt: preset.negativePrompt } : {}),
        ...(preset.modelId ? { modelId: preset.modelId } : {}),
        ...(preset.aspectRatio ? { aspectRatio: preset.aspectRatio } : {}),
        ...(preset.operation ? { operation: preset.operation } : {}),
      });
      router.push(
        preset.modality === "video"
          ? "/ai/create/video"
          : preset.modality === "text"
            ? "/ai/create/text"
            : "/ai/create/photo",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("Не удалось подготовить промпт", "Unable to prepare the prompt"),
      );
    } finally {
      setIsUsingPrompt(false);
    }
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
          </div>
        </AiCard>
        <aside className={styles.shareAside}>
          <AiCard className={styles.usePromptCard}>
            <h2>{t("Использовать промпт", "Use prompt")}</h2>
            <div className={styles.publicPromptDetails}>
              {share.data.author?.name ? (
                <div>
                  <span>{t("Автор", "Author")}</span>
                  <strong>{share.data.author.name}</strong>
                </div>
              ) : null}
              {share.data.modelName ? (
                <div>
                  <span>{t("Модель", "Model")}</span>
                  <strong>{share.data.modelName}</strong>
                </div>
              ) : null}
              {share.data.sourceReferenceCount ? (
                <div>
                  <span>{t("Референсы", "References")}</span>
                  <strong>{share.data.sourceReferenceCount}</strong>
                </div>
              ) : null}
            </div>
            {share.data.sourceReferences?.length ? (
              <ImageGalleryProvider>
                <div className={styles.publicPromptReferences}>
                  {share.data.sourceReferences.map((reference, index) => (
                    <ImageLightbox
                      alt={t(`Референс ${index + 1}`, `Reference ${index + 1}`)}
                      fullUrl={reference.previewUrl}
                      downloadUrl={reference.downloadUrl}
                      galleryId={`share-reference-${index}`}
                      key={`${reference.previewUrl}-${index}`}
                      previewUrl={reference.previewUrl}
                      triggerClassName={styles.publicPromptReferenceButton}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed private asset URL */}
                      <img alt="" src={reference.previewUrl} />
                    </ImageLightbox>
                  ))}
                </div>
              </ImageGalleryProvider>
            ) : null}
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
            <AiButton
              disabled={!share.data.prompt || isUsingPrompt}
              onClick={() => void handleUsePrompt()}
            >
              <FiZap aria-hidden="true" />
              {isUsingPrompt
                ? t("Подготавливаем…", "Preparing…")
                : t("Использовать промпт", "Use prompt")}
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
    return <video controls muted playsInline preload="metadata" src={share.outputUrl} />;
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

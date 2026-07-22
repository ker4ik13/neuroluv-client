"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FiAlertCircle,
  FiCopy,
  FiDownload,
  FiImage,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import {
  aiApiFetch,
  type AiApiEnvelope,
  type AiPublicShare,
} from "@/shared/api/ai";

import { getAiErrorMessage, unwrapAiData, useAiResource } from "../model/api";
import { formatDate } from "../model/format";
import { writeLocalJson } from "../model/storage";
import { AiButton, AiCard, AiPage, AiPageHeader, FieldMessage } from "./AiUi";
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
  const share = useAiResource<AiPublicShare>(
    `/public/shares/${encodeURIComponent(slug)}`,
    initialShare,
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function remix() {
    if (!share.data?.remixSupported) {
      return;
    }

    if (!session.authenticated) {
      router.push(`/ai/auth?returnTo=${encodeURIComponent(`/ai/share/${slug}`)}`);
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      const payload = await aiApiFetch<
        { draftToken: string; modality: string; modelId: string; suggestedOperation: string } |
        AiApiEnvelope<{ draftToken: string; modality: string; modelId: string; suggestedOperation: string }>
      >(`/public/shares/${encodeURIComponent(slug)}/remix`, { method: "POST" });
      const draft = unwrapAiData(payload);
      writeLocalJson(
        "neuroluv-ai:create-preset",
        {
          publicShareDraftToken: draft.draftToken,
          modelId: draft.modelId,
          operation: draft.suggestedOperation,
        },
      );
      router.push(
        draft.modality === "video"
          ? "/ai/create/video"
          : draft.modality === "text"
            ? "/ai/create/text"
            : "/ai/create/photo",
      );
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  async function copyPage() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать ссылку");
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
          <h1>{revoked ? "Ссылка недоступна" : "Не удалось открыть работу"}</h1>
          <p>
            {revoked
              ? "Владелец мог отозвать ссылку, либо работа больше не существует."
              : share.error}
          </p>
          {!revoked ? <AiButton variant="secondary" onClick={share.reload}><FiRefreshCw aria-hidden="true" /> Повторить</AiButton> : null}
        </AiCard>
      </AiPage>
    );
  }

  const disclosure = publicDisclosure(share.data);

  return (
    <AiPage>
      <AiPageHeader
        eyebrow="Публичная работа"
        title={share.data.title}
        description={`Создано ${formatDate(share.data.createdAt)} · ${disclosure.summary}`}
        actions={
          <AiButton variant="secondary" onClick={() => void copyPage()}>
            <FiCopy aria-hidden="true" /> {copied ? "Скопировано" : "Поделиться"}
          </AiButton>
        }
      />

      <div className={styles.shareGrid}>
        <AiCard className={styles.shareResult}>
          <PublicResult share={share.data} />
        </AiCard>
        <aside className={styles.shareAside}>
          <AiCard>
            <span className={styles.shareShield}><FiShield aria-hidden="true" /></span>
            <h2>Что опубликовано</h2>
            <p>{disclosure.details}</p>
            {share.data.disclosure?.promptIncluded ? (
              <SharedPrompt label="Промпт" value={share.data.prompt} />
            ) : null}
            {share.data.disclosure?.negativePromptIncluded ? (
              <SharedPrompt label="Negative prompt" value={share.data.negativePrompt} />
            ) : null}
          </AiCard>
          <AiCard>
            <h2>Создать свою версию</h2>
            <p>
              {share.data.remixSupported
                ? "Результат будет добавлен как референс в новый приватный черновик."
                : share.data.remixUnavailableReason || "Эту работу пока нельзя использовать как референс."}
            </p>
            <AiButton
              disabled={isPending || !share.data.remixSupported}
              onClick={() => void remix()}
            >
              {isPending ? "Готовим черновик…" : "Использовать как референс"}
            </AiButton>
            {share.data.downloadUrl ? (
              <a className={`${styles.button} ${styles.button_secondary}`} href={share.data.downloadUrl}>
                <FiDownload aria-hidden="true" /> Скачать
              </a>
            ) : null}
            {error ? <FieldMessage>{error}</FieldMessage> : null}
          </AiCard>
        </aside>
      </div>
    </AiPage>
  );
}

function SharedPrompt({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className={styles.sharedPrompt}>
      <strong>{label}</strong>
      <p>{value || "Не указан"}</p>
    </div>
  );
}

function publicDisclosure(share: AiPublicShare): { summary: string; details: string } {
  const published: string[] = [];
  const hidden: string[] = ["автор"];
  const disclosure = share.disclosure;

  if (disclosure?.promptIncluded) published.push("промпт");
  else hidden.push("промпт");

  if (disclosure?.negativePromptIncluded) published.push("negative prompt");
  else hidden.push("negative prompt");

  if (disclosure?.sourceReferenceIncluded) published.push("исходный референс");
  else hidden.push("исходный референс");

  return {
    summary: published.length ? `открыто: ${published.join(", ")}` : "детали генерации скрыты",
    details: `${published.length ? `Опубликовано: ${published.join(", ")}. ` : ""}Скрыто: ${hidden.join(", ")}.`,
  };
}

function PublicResult({ share }: { share: AiPublicShare }) {
  if (share.expired) {
    return <div className={styles.deletedResult}><FiImage aria-hidden="true" /><h2>Файл недоступен</h2></div>;
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
  return <div className={styles.deletedResult}><FiImage aria-hidden="true" /><h2>Файл недоступен</h2></div>;
}

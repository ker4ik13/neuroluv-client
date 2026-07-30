"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FiArchive,
  FiArrowLeft,
  FiBookmark,
  FiCalendar,
  FiCopy,
  FiDownload,
  FiImage,
  FiMaximize2,
  FiRefreshCw,
  FiShare2,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import { useAiLocale } from "@/features/ai-locale";
import {
  aiApiFetch,
  type AiApiEnvelope,
  type AiRunSummary,
  type AiWorkDetail,
  type AiWorkOutput,
} from "@/shared/api/ai";
import { useFocusTrap } from "@/shared/lib/dom/useFocusTrap";
import { writeClipboardText } from "@/shared/lib/dom/writeClipboardText";
import { formatCredits } from "@/shared/lib/formatCredits";

import { getAiErrorMessage, unwrapAiData, useAiResource } from "../model/api";
import { formatDate } from "../model/format";
import { writeLocalJson } from "../model/storage";
import { readStructuredPrompt } from "../model/structured-prompt";
import {
  AccountGate,
  AiButton,
  AiCard,
  AiPage,
  AiPageHeader,
  AsyncState,
  FieldMessage,
  StatusBadge,
} from "./AiUi";
import { ImageLightbox } from "./ChatImageOutput";
import styles from "./AiPages.module.scss";

export function WorkDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useAiSession();
  const { locale, t } = useAiLocale();
  const work = useAiResource<AiWorkDetail>(
    session.authenticated ? `/works/${encodeURIComponent(id)}` : null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showRepeatWarning, setShowRepeatWarning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const retryIntentKey = useRef<string | null>(null);
  const shareIntentKey = useRef<string | null>(null);
  const repeatDialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(showRepeatWarning, repeatDialogRef);

  const outputs = work.data?.outputs ?? [];
  const selectedOutput =
    outputs.find((output) => output.id === selectedOutputId) ?? outputs[0] ?? null;

  useEffect(() => {
    if (!showRepeatWarning) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowRepeatWarning(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showRepeatWarning]);

  if (!isSessionLoading && !session.authenticated) {
    return (
      <AiPage>
        <AiPageHeader title={t("Работа", "Work")} />
        <AccountGate returnTo={`/ai/works/${id}`} />
      </AiPage>
    );
  }

  async function mutate(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setIsPending(true);
    setActionError(null);
    setNotice(null);
    try {
      const result = await aiApiFetch<unknown>(path, { method, body });
      return result;
    } catch (error) {
      setActionError(getAiErrorMessage(error));
      return null;
    } finally {
      setIsPending(false);
    }
  }

  async function handleShare() {
    if (!work.data) return;
    if (work.data.shared) {
      const result = await mutate(`/works/${work.data.id}/share`, "DELETE");
      if (result === null) return;
      work.update((current) =>
        current ? { ...current, shared: false, shareSlug: null } : current,
      );
      shareIntentKey.current = null;
      setNotice(t("Публичная ссылка отозвана", "Public link revoked"));
      return;
    }

    shareIntentKey.current ||= crypto.randomUUID();
    const payload = await mutate(`/works/${work.data.id}/share`, "POST", {
      idempotencyKey: shareIntentKey.current,
      includePrompt: true,
    });
    const share = payload
      ? unwrapAiData(
          payload as
            | { slug?: string; shareSlug?: string }
            | AiApiEnvelope<{ slug?: string; shareSlug?: string }>,
        )
      : null;
    const shareSlug = share?.shareSlug || share?.slug;
    if (shareSlug) {
      shareIntentKey.current = null;
      work.update((current) =>
        current ? { ...current, shared: true, shareSlug } : current,
      );
      await copyPublicLink(shareSlug, t("Ссылка создана и скопирована", "Link created and copied"));
    }
  }

  async function copyPublicLink(
    shareSlug = work.data?.shareSlug,
    successMessage = t("Ссылка скопирована", "Link copied"),
  ) {
    if (!shareSlug) return;
    setActionError(null);
    try {
      await writeClipboardText(`${window.location.origin}/ai/share/${shareSlug}`);
      setNotice(successMessage);
    } catch {
      setActionError(t("Не удалось скопировать ссылку", "Unable to copy the link"));
    }
  }

  async function handleFavorite() {
    if (!work.data) return;
    const favorite = !work.data.favorite;
    const result = await mutate(`/works/${work.data.id}/favorite`, "PATCH", {
      isFavorite: favorite,
    });
    if (result === null) return;
    work.update((current) => (current ? { ...current, favorite } : current));
  }

  async function handleArchive() {
    if (!work.data) return;
    const result = await mutate(`/works/${work.data.id}`, "PATCH", {
      isArchived: true,
    });
    if (result !== null) router.replace("/ai/works");
  }

  async function repeatWithOldReference() {
    const runId = work.data?.runId;
    if (!runId) {
      setActionError(t("Исходный запуск недоступен для повторения", "The original run cannot be repeated"));
      return;
    }
    setShowRepeatWarning(false);
    retryIntentKey.current ||= crypto.randomUUID();
    const payload = await mutate(`/runs/${runId}/retry`, "POST", {
      idempotencyKey: retryIntentKey.current,
      reuseInputFiles: true,
    });
    if (payload) {
      retryIntentKey.current = null;
      const run = unwrapAiData(payload as AiRunSummary | AiApiEnvelope<AiRunSummary>);
      router.push(`/ai/history?run=${encodeURIComponent(run.id)}`);
    }
  }

  function repeat() {
    if (!work.data?.runId) {
      setActionError(t("Исходный запуск недоступен для повторения", "The original run cannot be repeated"));
      return;
    }

    if (work.data.hasInputReference) {
      setShowRepeatWarning(true);
      return;
    }

    void repeatWithOldReference();
  }

  function replaceReference() {
    if (!work.data?.runId) return;
    writeLocalJson(
      "neuroluv-ai:create-preset",
      { repeatRunId: work.data.runId, replaceReference: true },
    );
    router.push(work.data.modality === "video" ? "/ai/create/video" : "/ai/create/photo");
  }

  function useGeneratedPrompt() {
    const structured = readStructuredPrompt(selectedOutput?.data);
    const prompt = (structured?.mainPrompt || selectedOutput?.text || work.data?.textContent)?.trim();
    if (!prompt) {
      setActionError(t("Готовый промпт недоступен", "The generated prompt is unavailable"));
      return;
    }

    writeLocalJson("neuroluv-ai:create-preset", {
      prompt,
      ...(structured?.negativePrompt ? { negativePrompt: structured.negativePrompt } : {}),
    });
    router.push(
      work.data?.photoToPromptMode === "video"
        ? "/ai/create/video"
        : "/ai/create/photo",
    );
  }

  async function handleDelete() {
    if (!work.data || !window.confirm(t("Удалить эту работу? Действие нельзя отменить.", "Delete this work? This action cannot be undone."))) return;
    const result = await mutate(`/works/${work.data.id}`, "DELETE");
    if (result !== null) router.replace("/ai/works");
  }

  return (
    <AiPage>
      <AsyncState
        error={work.error}
        isEmpty={!work.data}
        isLoading={isSessionLoading || work.isLoading}
        emptyTitle={t("Работа не найдена", "Work not found")}
        onRetry={work.reload}
      >
        {work.data ? (
          <>
            <header className={styles.detailToolbar}>
              <Link className={styles.detailBackLink} href="/ai/works">
                <FiArrowLeft aria-hidden="true" />
                {t("Назад", "Back")}
              </Link>
              <strong className={styles.detailTitle}>{work.data.title}</strong>
              <StatusBadge status={work.data.status} />
            </header>

            <div className={styles.workDetailGrid}>
              <AiCard className={styles.resultCard}>
                <WorkResult output={selectedOutput} work={work.data} />
                <div className={styles.resultMeta}>
                  <span>
                    <FiCalendar aria-hidden="true" />
                    {formatDate(work.data.createdAt, true, locale)}
                  </span>
                  {work.data.modelName ? <strong>{work.data.modelName}</strong> : null}
                </div>
                {work.data.prompt?.trim() ? (
                  <section className={styles.workPrompt}>
                    <h2>{t("Использованный промпт", "Used prompt")}</h2>
                    <p>{work.data.prompt}</p>
                  </section>
                ) : null}
                {outputs.length > 1 ? (
                  <OutputPicker
                    outputs={outputs}
                    selectedId={selectedOutput?.id ?? null}
                    title={work.data.title}
                    onSelect={setSelectedOutputId}
                  />
                ) : null}
              </AiCard>

              <aside className={styles.workAside}>
                <AiCard className={styles.workInfoCard}>
                  <h2>{t("Действия", "Actions")}</h2>
                  {work.data.chargedCredits !== null && work.data.chargedCredits !== undefined ? (
                    <p className={styles.infoLine}>
                      <span>{t("Списано", "Charged")}</span>
                      <strong>{formatCredits(work.data.chargedCredits, locale)}</strong>
                    </p>
                  ) : null}
                  <div className={styles.actionStack}>
                    {work.data.operation === "photo_to_prompt" &&
                    (selectedOutput?.text || work.data.textContent) ? (
                      <AiButton disabled={isPending} onClick={useGeneratedPrompt}>
                        <FiImage aria-hidden="true" /> {t("Сгенерировать по промпту", "Generate from prompt")}
                      </AiButton>
                    ) : null}
                    {(selectedOutput?.downloadUrl || work.data.downloadUrl) &&
                    work.data.status !== "expired" ? (
                      <a
                        className={`${styles.button} ${styles.button_primary}`}
                        download
                        href={selectedOutput?.downloadUrl || work.data.downloadUrl || undefined}
                      >
                        <FiDownload aria-hidden="true" /> {t("Скачать", "Download")}
                      </a>
                    ) : null}
                    <AiButton disabled={isPending} variant="secondary" onClick={repeat}>
                      <FiRefreshCw aria-hidden="true" /> {t("Повторить", "Repeat")}
                    </AiButton>
                    <AiButton
                      disabled={isPending}
                      variant="secondary"
                      onClick={() => void handleFavorite()}
                    >
                      <FiBookmark aria-hidden="true" fill={work.data.favorite ? "currentColor" : "none"} />
                      {work.data.favorite ? t("Убрать из избранного", "Remove from favorites") : t("В избранное", "Add to favorites")}
                    </AiButton>
                    <AiButton disabled={isPending} variant="secondary" onClick={() => void handleShare()}>
                      {work.data.shared ? <FiX aria-hidden="true" /> : <FiShare2 aria-hidden="true" />}
                      {work.data.shared ? t("Отозвать ссылку", "Revoke link") : t("Создать публичную ссылку", "Create public link")}
                    </AiButton>
                    {work.data.shared && work.data.shareSlug ? (
                      <AiButton
                        disabled={isPending}
                        variant="ghost"
                        onClick={() => void copyPublicLink()}
                      >
                        <FiCopy aria-hidden="true" /> {t("Скопировать ссылку", "Copy link")}
                      </AiButton>
                    ) : null}
                    <AiButton
                      disabled={isPending}
                      variant="ghost"
                      onClick={() => void handleArchive()}
                    >
                      <FiArchive aria-hidden="true" /> {t("В архив", "Archive")}
                    </AiButton>
                    <AiButton disabled={isPending} variant="danger" onClick={() => void handleDelete()}>
                      <FiTrash2 aria-hidden="true" /> {t("Удалить", "Delete")}
                    </AiButton>
                  </div>
                  {notice ? <FieldMessage tone="success">{notice}</FieldMessage> : null}
                  {actionError ? <FieldMessage>{actionError}</FieldMessage> : null}
                </AiCard>
              </aside>
            </div>

            {showRepeatWarning ? (
              <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setShowRepeatWarning(false)}>
                <div
                  aria-labelledby="repeat-title"
                  aria-modal="true"
                  className={styles.modal}
                  ref={repeatDialogRef}
                  role="alertdialog"
                  tabIndex={-1}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <h2 id="repeat-title">{t("Проверить исходное фото", "Check the source image")}</h2>
                  <p>
                    {t("Этот запуск использовал референс. Скорее всего, перед повтором его стоит заменить.", "This run used a reference image. You may want to replace it before repeating the run.")}
                  </p>
                  <div className={styles.modalActions}>
                    <AiButton autoFocus onClick={replaceReference}>{t("Заменить фото", "Replace image")}</AiButton>
                    <AiButton variant="secondary" onClick={() => void repeatWithOldReference()}>
                      {t("Продолжить с прежним", "Keep current image")}
                    </AiButton>
                    <AiButton variant="ghost" onClick={() => setShowRepeatWarning(false)}>{t("Отмена", "Cancel")}</AiButton>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </AsyncState>
    </AiPage>
  );
}

function WorkResult({ work, output }: { work: AiWorkDetail; output: AiWorkOutput | null }) {
  const { t } = useAiLocale();
  const deleted = output ? output.deletedByRetention : Boolean(work.fileDeletedAt);
  const outputUrl = output?.outputUrl || output?.previewUrl || work.outputUrl || work.previewUrl;
  const text = output?.text || work.textContent;
  const outputType = output?.type || work.modality;

  if (work.status === "expired" || deleted) {
    return (
      <div className={styles.deletedResult}>
        <FiTrash2 aria-hidden="true" />
        <h2>{t("Файл удалён по сроку хранения", "File removed after retention period")}</h2>
        <p>{t("Метаданные запуска и финансовая история сохранены.", "Run metadata and financial history have been preserved.")}</p>
      </div>
    );
  }

  if (output?.heldForReview) {
    return (
      <div className={styles.deletedResult}>
        <h2>{t("Результат ожидает проверки", "Result is awaiting review")}</h2>
        <p>{t("Он станет доступен только после успешной модерации.", "It will become available after moderation is complete.")}</p>
      </div>
    );
  }

  if (outputType === "video" && outputUrl) {
    return <video controls playsInline preload="metadata" src={outputUrl} />;
  }

  if (outputType === "text" && text) {
    const structured = readStructuredPrompt(output?.data);
    return (
      <div className={styles.textResult}>
        <div className={styles.textResultHeader}>
          <h2>{t("Результат", "Result")}</h2>
          <AiButton
            type="button"
            variant="ghost"
            onClick={() => void navigator.clipboard.writeText(structured?.mainPrompt || text)}
          >
            <FiCopy aria-hidden="true" /> {t("Копировать", "Copy")}
          </AiButton>
        </div>
        {structured ? (
          <div className={styles.structuredPrompt}>
            <PromptSection label={t("Основной промпт", "Main prompt")} value={structured.mainPrompt} />
            <PromptSection label={t("Короткий промпт", "Short prompt")} value={structured.shortPrompt} />
            <PromptSection label="Negative prompt" value={structured.negativePrompt} />
          </div>
        ) : (
          <p>{text}</p>
        )}
      </div>
    );
  }

  if (outputUrl) {
    return (
      <ImageLightbox
        alt={work.title}
        downloadUrl={output?.downloadUrl || work.downloadUrl}
        fullUrl={outputUrl}
        previewUrl={output?.previewUrl || outputUrl}
        triggerClassName={styles.mediaLightboxButton}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed/CDN URL */}
        <img alt={work.title} src={outputUrl} />
        <span aria-hidden="true" className={styles.mediaFullscreenHint}>
          <FiMaximize2 />
        </span>
      </ImageLightbox>
    );
  }

  return (
    <div className={styles.deletedResult}>
      <h2>{t("Результат пока недоступен", "Result is not available yet")}</h2>
      <p>{t("Обновите страницу позднее или откройте историю запуска.", "Try again later or open the run history.")}</p>
    </div>
  );
}

function OutputPicker({
  outputs,
  selectedId,
  title,
  onSelect,
}: {
  outputs: AiWorkOutput[];
  selectedId: string | null;
  title: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useAiLocale();
  return (
    <div aria-label={t("Варианты результата", "Result variants")} className={styles.outputPicker} role="group">
      {outputs.map((output) => (
        <button
          aria-label={`${t("Показать вариант", "Show variant")} ${output.index + 1}`}
          aria-pressed={output.id === selectedId}
          className={styles.outputOption}
          key={output.id}
          onClick={() => onSelect(output.id)}
          type="button"
        >
          {output.previewUrl && !output.heldForReview ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed/CDN URL
            <img alt="" src={output.previewUrl} />
          ) : (
            <span aria-hidden="true">{output.index + 1}</span>
          )}
          <small>
            {title} · {output.heldForReview ? t("на проверке", "under review") : `${t("вариант", "variant")} ${output.index + 1}`}
          </small>
        </button>
      ))}
    </div>
  );
}

function PromptSection({ label, value }: { label: string; value: string }) {
  return (
    <section>
      <h3>{label}</h3>
      <p>{value}</p>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FiArchive,
  FiBookmark,
  FiCopy,
  FiDownload,
  FiImage,
  FiRefreshCw,
  FiShare2,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
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
import styles from "./AiPages.module.scss";

export function WorkDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useAiSession();
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
        <AiPageHeader title="Работа" description="Просмотр результата и управление приватностью." />
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
      setNotice("Публичная ссылка отозвана");
      return;
    }

    shareIntentKey.current ||= crypto.randomUUID();
    const payload = await mutate(`/works/${work.data.id}/share`, "POST", {
      idempotencyKey: shareIntentKey.current,
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
      await copyPublicLink(shareSlug, "Ссылка создана и скопирована");
    }
  }

  async function copyPublicLink(
    shareSlug = work.data?.shareSlug,
    successMessage = "Ссылка скопирована",
  ) {
    if (!shareSlug) return;
    setActionError(null);
    try {
      await writeClipboardText(`${window.location.origin}/ai/share/${shareSlug}`);
      setNotice(successMessage);
    } catch {
      setActionError("Не удалось скопировать ссылку");
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
      setActionError("Исходный запуск недоступен для повторения");
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
      setActionError("Исходный запуск недоступен для повторения");
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
      setActionError("Готовый промпт недоступен");
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
    if (!work.data || !window.confirm("Удалить эту работу? Действие нельзя отменить.")) return;
    const result = await mutate(`/works/${work.data.id}`, "DELETE");
    if (result !== null) router.replace("/ai/works");
  }

  return (
    <AiPage>
      <AsyncState
        error={work.error}
        isEmpty={!work.data}
        isLoading={isSessionLoading || work.isLoading}
        emptyTitle="Работа не найдена"
        onRetry={work.reload}
      >
        {work.data ? (
          <>
            <AiPageHeader
              backHref="/ai/works"
              eyebrow={work.data.operationLabel || "Моя работа"}
              title={work.data.title}
              description={`Создано ${formatDate(work.data.createdAt, true)}${work.data.modelName ? ` · ${work.data.modelName}` : ""}`}
              actions={<StatusBadge status={work.data.status} />}
            />

            <div className={styles.workDetailGrid}>
              <AiCard className={styles.resultCard}>
                <WorkResult output={selectedOutput} work={work.data} />
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
                  <h2>Действия</h2>
                  {work.data.chargedCredits !== null && work.data.chargedCredits !== undefined ? (
                    <p className={styles.infoLine}>
                      <span>Списано</span>
                      <strong>{formatCredits(work.data.chargedCredits)}</strong>
                    </p>
                  ) : null}
                  <div className={styles.actionStack}>
                    {work.data.operation === "photo_to_prompt" &&
                    (selectedOutput?.text || work.data.textContent) ? (
                      <AiButton disabled={isPending} onClick={useGeneratedPrompt}>
                        <FiImage aria-hidden="true" /> Сгенерировать по промпту
                      </AiButton>
                    ) : null}
                    {(selectedOutput?.downloadUrl || work.data.downloadUrl) &&
                    work.data.status !== "expired" ? (
                      <a
                        className={`${styles.button} ${styles.button_primary}`}
                        download
                        href={selectedOutput?.downloadUrl || work.data.downloadUrl || undefined}
                      >
                        <FiDownload aria-hidden="true" /> Скачать
                      </a>
                    ) : null}
                    <AiButton disabled={isPending} variant="secondary" onClick={repeat}>
                      <FiRefreshCw aria-hidden="true" /> Повторить
                    </AiButton>
                    <AiButton
                      disabled={isPending}
                      variant="secondary"
                      onClick={() => void handleFavorite()}
                    >
                      <FiBookmark aria-hidden="true" fill={work.data.favorite ? "currentColor" : "none"} />
                      {work.data.favorite ? "Убрать из избранного" : "В избранное"}
                    </AiButton>
                    <AiButton disabled={isPending} variant="secondary" onClick={() => void handleShare()}>
                      {work.data.shared ? <FiX aria-hidden="true" /> : <FiShare2 aria-hidden="true" />}
                      {work.data.shared ? "Отозвать ссылку" : "Создать публичную ссылку"}
                    </AiButton>
                    {work.data.shared && work.data.shareSlug ? (
                      <AiButton
                        disabled={isPending}
                        variant="ghost"
                        onClick={() => void copyPublicLink()}
                      >
                        <FiCopy aria-hidden="true" /> Скопировать ссылку
                      </AiButton>
                    ) : null}
                    <AiButton
                      disabled={isPending}
                      variant="ghost"
                      onClick={() => void handleArchive()}
                    >
                      <FiArchive aria-hidden="true" /> В архив
                    </AiButton>
                    <AiButton disabled={isPending} variant="danger" onClick={() => void handleDelete()}>
                      <FiTrash2 aria-hidden="true" /> Удалить
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
                  <h2 id="repeat-title">Проверить исходное фото</h2>
                  <p>
                    Этот запуск использовал референс. Скорее всего, перед повтором
                    его стоит заменить.
                  </p>
                  <div className={styles.modalActions}>
                    <AiButton autoFocus onClick={replaceReference}>Заменить фото</AiButton>
                    <AiButton variant="secondary" onClick={() => void repeatWithOldReference()}>
                      Продолжить с прежним
                    </AiButton>
                    <AiButton variant="ghost" onClick={() => setShowRepeatWarning(false)}>Отмена</AiButton>
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
  const deleted = output ? output.deletedByRetention : Boolean(work.fileDeletedAt);
  const outputUrl = output?.outputUrl || output?.previewUrl || work.outputUrl || work.previewUrl;
  const text = output?.text || work.textContent;
  const outputType = output?.type || work.modality;

  if (work.status === "expired" || deleted) {
    return (
      <div className={styles.deletedResult}>
        <FiTrash2 aria-hidden="true" />
        <h2>Файл удалён по сроку хранения</h2>
        <p>Метаданные запуска и финансовая история сохранены.</p>
      </div>
    );
  }

  if (output?.heldForReview) {
    return (
      <div className={styles.deletedResult}>
        <h2>Результат ожидает проверки</h2>
        <p>Он станет доступен только после успешной модерации.</p>
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
          <h2>Результат</h2>
          <AiButton
            type="button"
            variant="ghost"
            onClick={() => void navigator.clipboard.writeText(structured?.mainPrompt || text)}
          >
            <FiCopy aria-hidden="true" /> Копировать
          </AiButton>
        </div>
        {structured ? (
          <div className={styles.structuredPrompt}>
            <PromptSection label="Основной промпт" value={structured.mainPrompt} />
            <PromptSection label="Короткий промпт" value={structured.shortPrompt} />
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
      // eslint-disable-next-line @next/next/no-img-element -- signed/CDN URL
      <img alt={work.title} src={outputUrl} />
    );
  }

  return (
    <div className={styles.deletedResult}>
      <h2>Результат пока недоступен</h2>
      <p>Обновите страницу позднее или откройте историю запуска.</p>
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
  return (
    <div aria-label="Варианты результата" className={styles.outputPicker} role="group">
      {outputs.map((output) => (
        <button
          aria-label={`Показать вариант ${output.index + 1}`}
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
            {title} · {output.heldForReview ? "на проверке" : `вариант ${output.index + 1}`}
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

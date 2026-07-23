"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiClock,
  FiCreditCard,
  FiExternalLink,
  FiPlayCircle,
  FiRefreshCw,
  FiRotateCcw,
} from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import { useAiLocale } from "@/features/ai-locale";
import {
  type AiHistoryItem,
  type AiPage as AiPageData,
} from "@/shared/api/ai";
import { formatCredits } from "@/shared/lib/formatCredits";

import { toQueryString, useAiResource } from "../model/api";
import { formatDate, formatMoney } from "../model/format";
import { useAdaptivePolling } from "../model/useAdaptivePolling";
import { useAiLiveSync } from "../model/useAiLiveSync";
import {
  AccountGate,
  AiButton,
  AiPage,
  AiPageHeader,
  AsyncState,
  ReceiptState,
  StatusBadge,
} from "./AiUi";
import { AiSelect } from "./AiSelect";
import styles from "./AiPages.module.scss";

export function HistoryPage({ runId = "" }: { runId?: string }) {
  const { locale, t } = useAiLocale();
  const { session, isLoading: isSessionLoading } = useAiSession();
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const query = useMemo(
    () => toQueryString({ kind, status, runId, page, pageSize: 20 }),
    [kind, page, runId, status],
  );
  const history = useAiResource<AiPageData<AiHistoryItem>>(
    session.authenticated ? `/history${query}` : null,
  );
  const hasActiveGeneration = Boolean(
    history.data?.data.some(
      (item) =>
        item.kind === "run" &&
        (item.status === "queued" || item.status === "processing"),
    ),
  );

  useAdaptivePolling({
    enabled: session.authenticated,
    hasActiveWork: hasActiveGeneration,
    onPoll: history.refresh,
  });
  useAiLiveSync({
    enabled: session.authenticated,
    onMessage: () => {
      void history.refresh();
    },
  });

  if (!isSessionLoading && !session.authenticated) {
    return (
      <AiPage>
        <AiPageHeader title={t("История", "History")} />
        <AccountGate returnTo="/ai/history" />
      </AiPage>
    );
  }

  return (
    <AiPage>
      <AiPageHeader title={t("История", "History")} />

      <div className={styles.filterStrip}>
        <AiSelect
          compact
          labelVisuallyHidden
          id="history-kind"
          label={t("Тип события", "Event type")}
          options={[
            { value: "", label: t("Все события", "All events") },
            { value: "run", label: t("Генерации", "Generations") },
            { value: "ledger", label: t("Кредиты", "Credits") },
            { value: "payment", label: t("Платежи", "Payments") },
            { value: "refund", label: t("Возвраты", "Refunds") },
          ]}
          value={kind}
          onChange={(value) => {
            setKind(value);
            setPage(1);
          }}
        />
        <AiSelect
          compact
          labelVisuallyHidden
          id="history-status"
          label={t("Статус события", "Event status")}
          options={[
            { value: "", label: t("Все статусы", "All statuses") },
            { value: "queued", label: t("В очереди", "Queued") },
            { value: "processing", label: t("В процессе", "Processing") },
            { value: "succeeded", label: t("Готово", "Ready") },
            { value: "partially_succeeded", label: t("Частично", "Partial") },
            { value: "failed", label: t("Ошибка", "Failed") },
            { value: "cancelled", label: t("Отменено", "Cancelled") },
            { value: "refunded", label: t("Возвращено", "Refunded") },
          ]}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        {(kind || status) ? (
          <AiButton
            variant="ghost"
            onClick={() => {
              setKind("");
              setStatus("");
              setPage(1);
            }}
          >
            <FiRefreshCw aria-hidden="true" /> {t("Сбросить", "Reset")}
          </AiButton>
        ) : null}
      </div>

      <AsyncState
        error={history.error}
        isEmpty={!history.data?.data.length}
        isLoading={isSessionLoading || history.isLoading}
        emptyTitle={t("История пока пуста", "History is empty")}
        emptyDescription={t("Здесь появятся запуски, операции с кредитами и платежи.", "Runs, credit operations and payments will appear here.")}
        onRetry={history.reload}
      >
        <div className={styles.timeline}>
          {history.data?.data.map((item) => {
            const isGenerating =
              item.kind === "run" &&
              (item.status === "queued" || item.status === "processing");

            return (
              <article
                className={`${styles.timelineItem} ${isGenerating ? styles.timelineItemLive : ""}`}
                key={`${item.kind}-${item.id}`}
              >
                <span
                  className={`${styles.timelineIcon} ${styles[`timelineIcon_${item.kind}`]} ${isGenerating ? styles.timelineIconLive : ""}`}
                >
                  <HistoryIcon kind={item.kind} />
                </span>
                <div className={styles.timelineMain}>
                  <div className={styles.timelineHeading}>
                    <div>
                      <h2>{item.title}</h2>
                      <time dateTime={item.createdAt}>{formatDate(item.createdAt, true, locale)}</time>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.prompt ? (
                    <p className={styles.timelinePrompt}>{item.prompt}</p>
                  ) : null}
                  {item.description ? (
                    <p className={item.status === "failed" ? styles.timelineError : undefined}>
                      {item.description}
                    </p>
                  ) : null}
                  {(item.modelName || item.providerName) ? (
                    <div className={styles.chipRow}>
                      {item.modelName ? <span>{item.modelName}</span> : null}
                      {item.providerName ? <span>{item.providerName}</span> : null}
                    </div>
                  ) : null}
                </div>
                <div className={styles.timelineValue}>
                  {item.creditsDelta !== null && item.creditsDelta !== undefined ? (
                    <strong className={item.creditsDelta >= 0 ? styles.positiveValue : styles.negativeValue}>
                      {item.creditsDelta > 0 ? "+" : ""}{formatCredits(item.creditsDelta, locale)}
                    </strong>
                  ) : null}
                  {item.amountMinor !== null && item.amountMinor !== undefined && item.currency ? (
                    <strong>{formatMoney(item.amountMinor, item.currency, locale)}</strong>
                  ) : null}
                  {item.workId ? (
                    <Link href={`/ai/works/${item.workId}`}>{t("Работа", "Work")} <FiExternalLink aria-hidden="true" /></Link>
                  ) : item.runId ? (
                    <Link href={`/ai/history?run=${encodeURIComponent(item.runId)}`}>{t("Запуск", "Run")} <FiExternalLink aria-hidden="true" /></Link>
                  ) : (
                    <ReceiptState status={item.receiptStatus} url={item.receiptUrl} />
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {history.data && history.data.total > history.data.pageSize ? (
          <nav aria-label={t("Страницы истории", "History pages")} className={styles.pagination}>
            <AiButton disabled={page <= 1} variant="secondary" onClick={() => setPage((value) => value - 1)}>{t("Назад", "Back")}</AiButton>
            <span>{t("Страница", "Page")} {history.data.page}</span>
            <AiButton disabled={!history.data.hasMore} variant="secondary" onClick={() => setPage((value) => value + 1)}>{t("Дальше", "Next")}</AiButton>
          </nav>
        ) : null}
      </AsyncState>
    </AiPage>
  );
}

function HistoryIcon({ kind }: { kind: AiHistoryItem["kind"] }) {
  if (kind === "run") return <FiPlayCircle aria-hidden="true" />;
  if (kind === "payment") return <FiCreditCard aria-hidden="true" />;
  if (kind === "refund") return <FiRotateCcw aria-hidden="true" />;
  return <FiClock aria-hidden="true" />;
}

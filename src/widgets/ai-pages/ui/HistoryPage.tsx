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
import {
  type AiHistoryItem,
  type AiPage as AiPageData,
} from "@/shared/api/ai";
import { formatCredits } from "@/shared/lib/formatCredits";

import { toQueryString, useAiResource } from "../model/api";
import { formatDate, formatMoney } from "../model/format";
import {
  AccountGate,
  AiButton,
  AiPage,
  AiPageHeader,
  AsyncState,
  ReceiptState,
  StatusBadge,
} from "./AiUi";
import styles from "./AiPages.module.scss";

export function HistoryPage({ runId = "" }: { runId?: string }) {
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

  if (!isSessionLoading && !session.authenticated) {
    return (
      <AiPage>
        <AiPageHeader title="История" description="Запуски, списания и платежи в одной временной ленте." />
        <AccountGate returnTo="/ai/history" />
      </AiPage>
    );
  }

  return (
    <AiPage>
      <AiPageHeader
        eyebrow="Полная прозрачность"
        title="История"
        description="Здесь видно каждую генерацию, резерв, списание, возврат и платеж."
      />

      <div className={styles.filterStrip}>
        <select
          aria-label="Тип события"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Все события</option>
          <option value="run">Генерации</option>
          <option value="ledger">Кредиты</option>
          <option value="payment">Платежи</option>
          <option value="refund">Возвраты</option>
        </select>
        <select
          aria-label="Статус события"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Все статусы</option>
          <option value="queued">В очереди</option>
          <option value="processing">В процессе</option>
          <option value="succeeded">Готово</option>
          <option value="partially_succeeded">Частично</option>
          <option value="failed">Ошибка</option>
          <option value="cancelled">Отменено</option>
          <option value="refunded">Возвращено</option>
        </select>
        {(kind || status) ? (
          <AiButton
            variant="ghost"
            onClick={() => {
              setKind("");
              setStatus("");
              setPage(1);
            }}
          >
            <FiRefreshCw aria-hidden="true" /> Сбросить
          </AiButton>
        ) : null}
      </div>

      <AsyncState
        error={history.error}
        isEmpty={!history.data?.data.length}
        isLoading={isSessionLoading || history.isLoading}
        emptyTitle="История пока пуста"
        emptyDescription="Здесь появятся запуски, операции с кредитами и платежи."
        onRetry={history.reload}
      >
        <div className={styles.timeline}>
          {history.data?.data.map((item) => (
            <article className={styles.timelineItem} key={`${item.kind}-${item.id}`}>
              <span className={`${styles.timelineIcon} ${styles[`timelineIcon_${item.kind}`]}`}>
                <HistoryIcon kind={item.kind} />
              </span>
              <div className={styles.timelineMain}>
                <div className={styles.timelineHeading}>
                  <div>
                    <h2>{item.title}</h2>
                    <time dateTime={item.createdAt}>{formatDate(item.createdAt, true)}</time>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                {item.description ? <p>{item.description}</p> : null}
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
                    {item.creditsDelta > 0 ? "+" : ""}{formatCredits(item.creditsDelta)}
                  </strong>
                ) : null}
                {item.amountMinor !== null && item.amountMinor !== undefined && item.currency ? (
                  <strong>{formatMoney(item.amountMinor, item.currency)}</strong>
                ) : null}
                {item.workId ? (
                  <Link href={`/ai/works/${item.workId}`}>Работа <FiExternalLink aria-hidden="true" /></Link>
                ) : item.runId ? (
                  <Link href={`/ai/history?run=${encodeURIComponent(item.runId)}`}>Запуск <FiExternalLink aria-hidden="true" /></Link>
                ) : (
                  <ReceiptState status={item.receiptStatus} url={item.receiptUrl} />
                )}
              </div>
            </article>
          ))}
        </div>

        {history.data && history.data.total > history.data.pageSize ? (
          <nav aria-label="Страницы истории" className={styles.pagination}>
            <AiButton disabled={page <= 1} variant="secondary" onClick={() => setPage((value) => value - 1)}>Назад</AiButton>
            <span>Страница {history.data.page}</span>
            <AiButton disabled={!history.data.hasMore} variant="secondary" onClick={() => setPage((value) => value + 1)}>Дальше</AiButton>
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

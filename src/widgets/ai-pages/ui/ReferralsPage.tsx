"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  FiCheck,
  FiCopy,
  FiDollarSign,
  FiMousePointer,
  FiSend,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import {
  aiApiFetch,
  type AiReferralStats,
} from "@/shared/api/ai";

import { getAiErrorMessage, useAiResource } from "../model/api";
import { formatDate, formatMoney } from "../model/format";
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

export function ReferralsPage() {
  const { session, isLoading: isSessionLoading } = useAiSession();
  const stats = useAiResource<AiReferralStats>(session.authenticated ? "/referrals" : null);
  const [copied, setCopied] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [method, setMethod] = useState<"bank" | "crypto">("bank");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const payoutIntent = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    if (!payoutOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPayoutOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [payoutOpen]);

  if (!isSessionLoading && !session.authenticated) {
    return (
      <AiPage>
        <AiPageHeader title="Партнёрская программа" description="Приглашения, заработок и выплаты." />
        <AccountGate returnTo="/ai/referrals" />
      </AiPage>
    );
  }

  async function copyLink() {
    if (!stats.data) return;
    try {
      await navigator.clipboard.writeText(stats.data.referralUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать ссылку. Выделите её вручную.");
    }
  }

  async function requestPayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payoutDetails = activeMethod === "bank"
      ? {
          method: "bank" as const,
          recipientType: "individual" as const,
          countryCode: "RU",
          recipientName: String(formData.get("recipientName") || "").trim(),
          bankName: String(formData.get("bankName") || "").trim() || undefined,
          account: String(formData.get("account") || "").trim(),
        }
      : {
          method: "crypto" as const,
          recipientType: "individual" as const,
          countryCode: "RU",
          asset: String(formData.get("asset") || "USDT").trim(),
          network: String(formData.get("network") || "").trim(),
          address: String(formData.get("address") || "").trim(),
          memo: String(formData.get("memo") || "").trim() || undefined,
        };

    setIsPending(true);
    setError(null);
    setNotice(null);
    try {
      const signature = JSON.stringify(payoutDetails);
      if (payoutIntent.current?.signature !== signature) {
        payoutIntent.current = { signature, key: crypto.randomUUID() };
      }
      await aiApiFetch("/referrals/payout-details", {
        method: "PUT",
        body: payoutDetails,
      });
      await aiApiFetch("/referrals/payouts", {
        method: "POST",
        body: {
          idempotencyKey: payoutIntent.current.key,
          currency: stats.data?.currency || "RUB",
        },
      });
      setNotice("Заявка на выплату отправлена на проверку.");
      payoutIntent.current = null;
      setPayoutOpen(false);
      form.reset();
      stats.reload();
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  const canPayout = Boolean(
    stats.data && stats.data.availableAmountMinor >= stats.data.minimumPayoutMinor,
  );
  const methods = stats.data?.payoutMethods?.length
    ? stats.data.payoutMethods
    : (["bank", "crypto"] as const);
  const activeMethod = methods.includes(method) ? method : methods[0];

  return (
    <AiPage>
      <AiPageHeader
        eyebrow="Доступно каждому аккаунту"
        title="Партнёрская программа"
        description="Делитесь персональной ссылкой и получайте комиссию после первой успешной покупки приглашённого."
      />

      <AsyncState
        error={stats.error}
        isEmpty={!stats.data}
        isLoading={isSessionLoading || stats.isLoading}
        onRetry={stats.reload}
      >
        {stats.data ? (
          <>
            <AiCard className={styles.referralHero}>
              <div>
                <span className={styles.eyebrow}>Ваша ссылка</span>
                <h2>Пригласить друзей и коллег</h2>
                <p>
                  Атрибуция действует {stats.data.attributionDays} дней. Учитывается
                  последний действительный переход до регистрации.
                </p>
              </div>
              <div className={styles.referralLinkBox}>
                <input aria-label="Реферальная ссылка" readOnly value={stats.data.referralUrl} />
                <AiButton variant="secondary" onClick={() => void copyLink()}>
                  {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
                  {copied ? "Скопировано" : "Копировать"}
                </AiButton>
              </div>
            </AiCard>

            <div className={styles.statsGrid}>
              <StatCard icon={<FiMousePointer />} label="Переходы" value={stats.data.clicks.toLocaleString("ru-RU")} />
              <StatCard icon={<FiUserPlus />} label="Регистрации" value={stats.data.registrations.toLocaleString("ru-RU")} />
              <StatCard icon={<FiUsers />} label="Первые оплаты" value={stats.data.firstPayments.toLocaleString("ru-RU")} />
              <StatCard icon={<FiDollarSign />} label="Выплачено" value={formatMoney(stats.data.paidAmountMinor, stats.data.currency)} />
            </div>

            <div className={styles.referralLowerGrid}>
              <AiCard className={styles.earningsCard}>
                <div className={styles.cardTitleRow}>
                  <div><span className={styles.eyebrow}>Отдельно от AI-кредитов</span><h2>Партнёрский заработок</h2></div>
                  <FiDollarSign aria-hidden="true" />
                </div>
                <div className={styles.earningsRows}>
                  <div><span>Доступно к выплате</span><strong>{formatMoney(stats.data.availableAmountMinor, stats.data.currency)}</strong></div>
                  <div><span>На удержании</span><strong>{formatMoney(stats.data.pendingAmountMinor, stats.data.currency)}</strong></div>
                  <div><span>Минимальная выплата</span><strong>{formatMoney(stats.data.minimumPayoutMinor, stats.data.currency)}</strong></div>
                </div>
                {!canPayout ? (
                  <p className={styles.lockNotice}>
                    До минимальной суммы осталось {formatMoney(
                      Math.max(0, stats.data.minimumPayoutMinor - stats.data.availableAmountMinor),
                      stats.data.currency,
                    )}.
                  </p>
                ) : null}
                <AiButton disabled={!canPayout} onClick={() => setPayoutOpen(true)}>
                  <FiSend aria-hidden="true" /> Запросить выплату
                </AiButton>
              </AiCard>

              <AiCard className={styles.programRules}>
                <h2>Как начисляется вознаграждение</h2>
                <ol>
                  <li><span>1</span><p>Человек переходит по вашей ссылке и регистрируется в течение {stats.data.attributionDays} дней.</p></li>
                  <li><span>2</span><p>После его первой успешной покупки создаётся партнёрская комиссия{stats.data.referrerPercent ? ` ${stats.data.referrerPercent}%` : ""}.</p></li>
                  <li><span>3</span><p>Комиссия проходит период удержания{stats.data.holdDays ? ` ${stats.data.holdDays} дней` : ""}, затем становится доступной.</p></li>
                </ol>
              </AiCard>
            </div>

            <AiCard className={styles.payoutHistory}>
              <h2>Заявки на выплату</h2>
              {!stats.data.payouts.length ? <p>Заявок пока нет.</p> : null}
              <div className={styles.paymentList}>
                {stats.data.payouts.map((payout) => (
                  <div className={styles.paymentRow} key={payout.id}>
                    <div><strong>{payout.method === "bank" ? "Банк" : "Криптовалюта"}</strong><small>{formatDate(payout.createdAt)}</small></div>
                    <strong>{formatMoney(payout.amountMinor, payout.currency)}</strong>
                    <StatusBadge status={payout.status} />
                  </div>
                ))}
              </div>
            </AiCard>

            {notice ? <FieldMessage tone="success">{notice}</FieldMessage> : null}
            {error && !payoutOpen ? <FieldMessage>{error}</FieldMessage> : null}
          </>
        ) : null}
      </AsyncState>

      {payoutOpen && stats.data ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setPayoutOpen(false)}>
          <form aria-labelledby="payout-title" aria-modal="true" className={styles.modal} role="dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={requestPayout}>
            <h2 id="payout-title">Запрос выплаты</h2>
            <p>Доступно: {formatMoney(stats.data.availableAmountMinor, stats.data.currency)}</p>
            <div className={styles.segmented}>
              {methods.includes("bank") ? <button aria-pressed={activeMethod === "bank"} className={activeMethod === "bank" ? styles.segmentActive : ""} type="button" onClick={() => setMethod("bank")}>Банк</button> : null}
              {methods.includes("crypto") ? <button aria-pressed={activeMethod === "crypto"} className={activeMethod === "crypto" ? styles.segmentActive : ""} type="button" onClick={() => setMethod("crypto")}>Криптовалюта</button> : null}
            </div>
            {activeMethod === "bank" ? (
              <>
                <label className={styles.field}>
                  <span>Получатель</span>
                  <input autoComplete="name" autoFocus maxLength={160} name="recipientName" required />
                </label>
                <label className={styles.field}>
                  <span>Номер счёта или карты</span>
                  <input autoComplete="off" inputMode="numeric" name="account" pattern="[0-9 +()\-]{6,40}" required />
                </label>
                <label className={styles.field}>
                  <span>Банк <em>необязательно</em></span>
                  <input autoComplete="off" maxLength={160} name="bankName" />
                </label>
              </>
            ) : (
              <>
                <label className={styles.field}>
                  <span>Актив</span>
                  <select defaultValue="USDT" name="asset">
                    <option value="USDT">USDT</option>
                    <option value="TON">TON</option>
                    <option value="BTC">BTC</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Сеть</span>
                  <input autoFocus maxLength={40} name="network" placeholder="Например, TRC20" required />
                </label>
                <label className={styles.field}>
                  <span>Адрес кошелька</span>
                  <textarea autoComplete="off" maxLength={180} name="address" required rows={2} />
                </label>
                <label className={styles.field}>
                  <span>Memo / Tag <em>необязательно</em></span>
                  <input autoComplete="off" maxLength={120} name="memo" />
                </label>
              </>
            )}
            <small>Реквизиты шифруются backend-ом и не сохраняются в браузере.</small>
            {error ? <FieldMessage>{error}</FieldMessage> : null}
            <div className={styles.modalActions}>
              <AiButton disabled={isPending} type="submit">{isPending ? "Отправляем…" : "Отправить на проверку"}</AiButton>
              <AiButton type="button" variant="ghost" onClick={() => setPayoutOpen(false)}>Отмена</AiButton>
            </div>
          </form>
        </div>
      ) : null}
    </AiPage>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <AiCard className={styles.statCard}>
      <span>{icon}</span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </AiCard>
  );
}

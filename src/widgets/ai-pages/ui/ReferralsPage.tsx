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
  FiZap,
} from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import { useAiLocale } from "@/features/ai-locale";
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
import { AiSelect } from "./AiSelect";
import styles from "./AiPages.module.scss";

export function ReferralsPage() {
  const { session, isLoading: isSessionLoading } = useAiSession();
  const { locale, t } = useAiLocale();
  const stats = useAiResource<AiReferralStats>(session.authenticated ? "/referrals" : null);
  const [copied, setCopied] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [method, setMethod] = useState<"bank" | "crypto">("bank");
  const [asset, setAsset] = useState("USDT");
  const [isPending, setIsPending] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const payoutIntent = useRef<{ signature: string; key: string } | null>(null);
  const conversionIntent = useRef<{ amountMinor: number; key: string } | null>(null);

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
        <AiPageHeader title={t("Партнёрская программа", "Referral program")} />
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
      setError(t("Не удалось скопировать ссылку. Выделите её вручную.", "Unable to copy the link. Select it manually."));
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
      setNotice(t("Заявка на выплату отправлена на проверку.", "Payout request submitted for review."));
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

  async function convertBalance() {
    if (!stats.data) return;
    const amountMinor = Math.floor(stats.data.availableAmountMinor / 100) * 100;
    if (amountMinor < 100) return;
    if (conversionIntent.current?.amountMinor !== amountMinor) {
      conversionIntent.current = { amountMinor, key: crypto.randomUUID() };
    }

    setIsConverting(true);
    setError(null);
    setNotice(null);
    try {
      await aiApiFetch("/referrals/convert", {
        method: "POST",
        body: {
          idempotencyKey: conversionIntent.current.key,
          amountMinor,
          currency: stats.data.currency,
        },
      });
      conversionIntent.current = null;
      setNotice(
        t(
          "Партнёрский баланс конвертирован в кредиты.",
          "The partner balance has been converted into credits.",
        ),
      );
      await stats.reload();
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setIsConverting(false);
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
      <AiPageHeader title={t("Партнёрская программа", "Referral program")} />

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
                <h2>{t("Пригласить друзей и коллег", "Invite friends and colleagues")}</h2>
                <p>
                  {t(
                    `Получайте процент со всех успешных покупок приглашённого в течение первого года.`,
                    `Earn a percentage from every successful purchase made by an invitee during their first year.`,
                  )}
                </p>
              </div>
              <div className={styles.referralLinkBox}>
                <input aria-label={t("Реферальная ссылка", "Referral link")} readOnly value={stats.data.referralUrl} />
                <AiButton variant="secondary" onClick={() => void copyLink()}>
                  {copied ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
                  {copied ? t("Скопировано", "Copied") : t("Копировать", "Copy")}
                </AiButton>
              </div>
            </AiCard>

            <div className={styles.statsGrid}>
              <StatCard icon={<FiMousePointer />} label={t("Переходы", "Visits")} value={stats.data.clicks.toLocaleString(locale)} />
              <StatCard icon={<FiUserPlus />} label={t("Регистрации", "Registrations")} value={stats.data.registrations.toLocaleString(locale)} />
              <StatCard icon={<FiUsers />} label={t("Первые оплаты", "First payments")} value={stats.data.firstPayments.toLocaleString(locale)} />
              <StatCard icon={<FiDollarSign />} label={t("Оплачено", "Paid")} value={formatMoney(stats.data.paidAmountMinor, stats.data.currency, locale)} />
              <StatCard
                icon={<FiZap />}
                label={t("За использование промптов", "Prompt usage rewards")}
                value={formatMoney(
                  stats.data.promptAuthorRewardAmountMinor,
                  stats.data.currency,
                  locale,
                )}
              />
            </div>

            <div className={styles.referralLowerGrid}>
              <AiCard className={styles.earningsCard}>
                <div className={styles.cardTitleRow}>
                  <h2>{t("Партнёрский заработок", "Referral earnings")}</h2>
                  <FiDollarSign aria-hidden="true" />
                </div>
                <div className={styles.earningsRows}>
                  <div><span>{t("Доступно к выплате", "Available for payout")}</span><strong>{formatMoney(stats.data.availableAmountMinor, stats.data.currency, locale)}</strong></div>
                  <div><span>{t("На удержании", "On hold")}</span><strong>{formatMoney(stats.data.pendingAmountMinor, stats.data.currency, locale)}</strong></div>
                  <div><span>{t("Минимальная выплата", "Minimum payout")}</span><strong>{formatMoney(stats.data.minimumPayoutMinor, stats.data.currency, locale)}</strong></div>
                  <div>
                    <span>{t("Генераций по вашим промптам", "Generations using your prompts")}</span>
                    <strong>{stats.data.promptAuthorRewardGenerations.toLocaleString(locale)}</strong>
                  </div>
                </div>
                {!canPayout ? (
                  <p className={styles.lockNotice}>
                    {t("До минимальной суммы осталось", "Remaining to minimum payout")} {formatMoney(
                      Math.max(0, stats.data.minimumPayoutMinor - stats.data.availableAmountMinor),
                      stats.data.currency,
                      locale,
                    )}.
                  </p>
                ) : null}
                <AiButton disabled={!canPayout} onClick={() => setPayoutOpen(true)}>
                  <FiSend aria-hidden="true" /> {t("Запросить выплату", "Request payout")}
                </AiButton>
                <AiButton
                  disabled={stats.data.availableAmountMinor < 100 || isConverting}
                  onClick={() => void convertBalance()}
                  variant="secondary"
                >
                  <FiZap aria-hidden="true" />{" "}
                  {isConverting
                    ? t("Конвертируем…", "Converting…")
                    : t(
                        `Конвертировать в кредиты · ${stats.data.partnerCreditsPerRuble} за 1 ₽`,
                        `Convert to credits · ${stats.data.partnerCreditsPerRuble} per ₽1`,
                      )}
                </AiButton>
              </AiCard>

              <AiCard className={styles.programRules}>
                <h2>{t("Как начисляется вознаграждение", "How rewards are calculated")}</h2>
                <ol>
                  <li><span>1</span><p>{t(`Человек переходит по вашей ссылке и регистрируется в течение ${stats.data.attributionDays} дней.`, `A person follows your link and registers within ${stats.data.attributionDays} days.`)}</p></li>
                  <li><span>2</span><p>{t(`Вы получаете${stats.data.referrerPercent ? ` ${stats.data.referrerPercent}%` : ""} с каждой успешной покупки и подписки реферала в течение ${stats.data.commissionMonths || 12} месяцев после его регистрации.`, `You earn${stats.data.referrerPercent ? ` ${stats.data.referrerPercent}%` : ""} from every successful purchase and subscription made by the referral for ${stats.data.commissionMonths || 12} months after registration.`)}</p></li>
                  <li><span>3</span><p>{t(`Комиссия проходит период удержания${stats.data.holdDays ? ` ${stats.data.holdDays} дней` : ""}, затем становится доступной.`, `The commission is held${stats.data.holdDays ? ` for ${stats.data.holdDays} days` : ""} and then becomes available.`)}</p></li>
                  <li><span>4</span><p>{t(`За успешную генерацию другого пользователя по вашей публичной ссылке на промпт начисляется ${formatMoney(stats.data.promptAuthorRewardMinor, stats.data.currency, locale)}.`, `A successful generation by another user through your public prompt link earns ${formatMoney(stats.data.promptAuthorRewardMinor, stats.data.currency, locale)}.`)}</p></li>
                </ol>
              </AiCard>
            </div>

            <AiCard className={styles.payoutHistory}>
              <h2>{t("Заявки на выплату", "Payout requests")}</h2>
              {!stats.data.payouts.length ? <p>{t("Заявок пока нет.", "No requests yet.")}</p> : null}
              <div className={styles.paymentList}>
                {stats.data.payouts.map((payout) => (
                  <div className={styles.paymentRow} key={payout.id}>
                    <div><strong>{payout.method === "bank" ? t("Банк", "Bank") : t("Криптовалюта", "Crypto")}</strong><small>{formatDate(payout.createdAt, false, locale)}</small></div>
                    <strong>{formatMoney(payout.amountMinor, payout.currency, locale)}</strong>
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
            <h2 id="payout-title">{t("Запрос выплаты", "Payout request")}</h2>
            <p>{t("Доступно", "Available")}: {formatMoney(stats.data.availableAmountMinor, stats.data.currency, locale)}</p>
            <div className={styles.segmented}>
              {methods.includes("bank") ? <button aria-pressed={activeMethod === "bank"} className={activeMethod === "bank" ? styles.segmentActive : ""} type="button" onClick={() => setMethod("bank")}>{t("Банк", "Bank")}</button> : null}
              {methods.includes("crypto") ? <button aria-pressed={activeMethod === "crypto"} className={activeMethod === "crypto" ? styles.segmentActive : ""} type="button" onClick={() => setMethod("crypto")}>{t("Криптовалюта", "Crypto")}</button> : null}
            </div>
            {activeMethod === "bank" ? (
              <>
                <label className={styles.field}>
                  <span>{t("Получатель", "Recipient")}</span>
                  <input autoComplete="name" autoFocus maxLength={160} name="recipientName" required />
                </label>
                <label className={styles.field}>
                  <span>{t("Номер счёта или карты", "Account or card number")}</span>
                  <input autoComplete="off" inputMode="numeric" name="account" pattern="[0-9 +()\-]{6,40}" required />
                </label>
                <label className={styles.field}>
                  <span>{t("Банк", "Bank")} <em>{t("необязательно", "optional")}</em></span>
                  <input autoComplete="off" maxLength={160} name="bankName" />
                </label>
              </>
            ) : (
              <>
                <AiSelect
                  compact
                  id="payout-asset"
                  label={t("Актив", "Asset")}
                  name="asset"
                  options={[
                    { value: "USDT", label: "USDT" },
                    { value: "TON", label: "TON" },
                    { value: "BTC", label: "BTC" },
                  ]}
                  value={asset}
                  onChange={setAsset}
                />
                <label className={styles.field}>
                  <span>{t("Сеть", "Network")}</span>
                  <input autoFocus maxLength={40} name="network" placeholder={t("Например, TRC20", "For example, TRC20")} required />
                </label>
                <label className={styles.field}>
                  <span>{t("Адрес кошелька", "Wallet address")}</span>
                  <textarea autoComplete="off" maxLength={180} name="address" required rows={2} />
                </label>
                <label className={styles.field}>
                  <span>Memo / Tag <em>{t("необязательно", "optional")}</em></span>
                  <input autoComplete="off" maxLength={120} name="memo" />
                </label>
              </>
            )}
            <small>{t("Реквизиты передаются и хранятся в защищённом виде.", "Payment details are transmitted and stored securely.")}</small>
            {error ? <FieldMessage>{error}</FieldMessage> : null}
            <div className={styles.modalActions}>
              <AiButton disabled={isPending} type="submit">{isPending ? t("Отправляем…", "Submitting…") : t("Отправить на проверку", "Submit for review")}</AiButton>
              <AiButton type="button" variant="ghost" onClick={() => setPayoutOpen(false)}>{t("Отмена", "Cancel")}</AiButton>
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

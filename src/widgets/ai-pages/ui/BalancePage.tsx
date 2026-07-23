"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowUpRight,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiExternalLink,
  FiGift,
  FiLock,
  FiShield,
  FiUsers,
  FiZap,
} from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import { useAiLocale } from "@/features/ai-locale";
import {
  aiApiFetch,
  type AiApiEnvelope,
  type AiBillingProducts,
  type AiPage as AiPageData,
  type AiPaymentProvider,
  type AiPaymentSummary,
  type AiPlan,
  type AiPromoQuote,
  type AiReferralStats,
  type AiTopupPackage,
  type AiWalletSummary,
} from "@/shared/api/ai";
import { useFocusTrap } from "@/shared/lib/dom/useFocusTrap";
import { formatCredits } from "@/shared/lib/formatCredits";

import { getAiErrorMessage, unwrapAiData, useAiResource } from "../model/api";
import { formatDate, formatMoney, formatMoneyPerCredit } from "../model/format";
import {
  AccountGate,
  AiButton,
  AiCard,
  AiLinkButton,
  AiPage,
  AiPageHeader,
  AsyncState,
  FieldMessage,
  ReceiptState,
  StatusBadge,
} from "./AiUi";
import styles from "./AiPages.module.scss";

type CheckoutProduct =
  | { type: "subscription"; value: AiPlan }
  | { type: "topup"; value: AiTopupPackage };

type BillingPeriod = Extract<AiPlan["interval"], "month" | "year">;

export function BalancePage() {
  const { locale, t } = useAiLocale();
  const { session, isLoading: isSessionLoading } = useAiSession();
  const wallet = useAiResource<AiWalletSummary>(session.authenticated ? "/wallet/balance" : null);
  const products = useAiResource<AiBillingProducts>(session.authenticated ? "/billing/products" : null);
  const payments = useAiResource<AiPageData<AiPaymentSummary>>(
    session.authenticated ? "/billing/payments?page=1&pageSize=10" : null,
  );
  const referrals = useAiResource<AiReferralStats>(
    session.authenticated ? "/referrals" : null,
  );
  const [checkoutProduct, setCheckoutProduct] = useState<CheckoutProduct | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("month");
  const [paymentProviderId, setPaymentProviderId] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [isPromoPending, setIsPromoPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoQuote, setPromoQuote] = useState<AiPromoQuote | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const checkoutIntent = useRef<{ signature: string; key: string } | null>(null);
  const checkoutDialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(Boolean(checkoutProduct), checkoutDialogRef);

  useEffect(() => {
    if (!checkoutProduct) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCheckoutProduct(null);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [checkoutProduct]);

  const compatibleProviders = useMemo(() => {
    if (!checkoutProduct || !products.data) return [];
    return products.data.paymentProviders.filter(
      (provider) =>
        provider.available && provider.currencies.includes(checkoutProduct.value.currency),
    );
  }, [checkoutProduct, products.data]);
  const activeProviderId = compatibleProviders.some(
    (provider) => provider.id === paymentProviderId,
  )
    ? paymentProviderId
    : compatibleProviders[0]?.id || "";
  const activeProvider = compatibleProviders.find(
    (provider) => provider.id === activeProviderId,
  );
  const recurringAvailable = Boolean(
    checkoutProduct?.type === "subscription" && activeProvider?.recurringAvailable,
  );
  const requestedAutoRenew = recurringAvailable && autoRenew;
  const visiblePlans = useMemo(
    () => products.data?.plans.filter((plan) => plan.interval === billingPeriod) ?? [],
    [billingPeriod, products.data?.plans],
  );

  function closeCheckout() {
    setCheckoutProduct(null);
    setError(null);
    setPromoCode("");
    setPromoQuote(null);
    setPromoError(null);
  }

  function openCheckout(product: CheckoutProduct) {
    checkoutIntent.current = null;
    setPaymentProviderId("");
    setAutoRenew(product.type === "subscription");
    setPromoCode("");
    setPromoQuote(null);
    setPromoError(null);
    setError(null);
    setCheckoutProduct(product);
  }

  if (!isSessionLoading && !session.authenticated) {
    return (
      <AiPage>
        <AiPageHeader title={t("Баланс", "Balance")} />
        <AccountGate returnTo="/ai/balance" />
      </AiPage>
    );
  }

  async function startCheckout() {
    if (!checkoutProduct || !activeProviderId) {
      setError(t("Выберите доступный способ оплаты", "Choose an available payment method"));
      return;
    }

    setIsPending(true);
    setError(null);
    setNotice(null);
    try {
      const signature = [
        checkoutProduct.type,
        checkoutProduct.value.id,
        activeProviderId,
        promoQuote?.code || "",
        requestedAutoRenew ? "auto" : "manual",
      ].join(":");
      if (checkoutIntent.current?.signature !== signature) {
        checkoutIntent.current = { signature, key: crypto.randomUUID() };
      }
      const payload = await aiApiFetch<
        { checkoutUrl: string | null; paymentId: string } |
        AiApiEnvelope<{ checkoutUrl: string | null; paymentId: string }>
      >("/billing/checkout", {
        method: "POST",
        headers: { "idempotency-key": checkoutIntent.current.key },
        body: {
          productType: checkoutProduct.type,
          productId: checkoutProduct.value.id,
          providerId: activeProviderId,
          autoRenew: requestedAutoRenew,
          ...(promoQuote ? { promoCode: promoQuote.code } : {}),
        },
      });
      const checkout = unwrapAiData(payload);
      if (!checkout.checkoutUrl) {
        closeCheckout();
        setNotice(t("Платёж создан. Обновите статус через несколько секунд.", "Payment created. Refresh its status in a few seconds."));
        payments.reload();
        return;
      }
      const url = new URL(checkout.checkoutUrl, window.location.origin);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error(t("Платёжный сервис вернул некорректную ссылку", "The payment service returned an invalid URL"));
      }
      window.location.assign(url.toString());
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  async function applyPromo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkoutProduct) return;
    const code = promoCode.trim();
    if (!code) {
      setPromoError(t("Введите промокод", "Enter a promo code"));
      return;
    }

    setIsPromoPending(true);
    setPromoError(null);
    setPromoQuote(null);
    try {
      const payload = await aiApiFetch<AiPromoQuote | AiApiEnvelope<AiPromoQuote>>(
        "/billing/promo/apply",
        {
          method: "POST",
          body: {
            code,
            productType: checkoutProduct.type,
            productId: checkoutProduct.value.id,
          },
        },
      );
      const quote = unwrapAiData(payload);
      setPromoCode(quote.code);
      setPromoQuote(quote);
      checkoutIntent.current = null;
    } catch (requestError) {
      setPromoError(getAiErrorMessage(requestError));
    } finally {
      setIsPromoPending(false);
    }
  }

  async function cancelRenewal() {
    if (!window.confirm(t("Отключить автопродление в конце оплаченного периода?", "Disable auto-renewal at the end of the paid period?"))) return;
    setIsPending(true);
    setError(null);
    try {
      await aiApiFetch("/billing/subscription/cancel", { method: "POST" });
      products.reload();
      setNotice(t("Автопродление отключено. Доступ сохранится до конца периода.", "Auto-renewal disabled. Access remains until the end of the period."));
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  const loadError = wallet.error || products.error;

  return (
    <AiPage>
      <AiPageHeader title={t("Баланс", "Balance")} />
      {notice ? <FieldMessage tone="success">{notice}</FieldMessage> : null}
      {error && !checkoutProduct ? <FieldMessage>{error}</FieldMessage> : null}

      <AsyncState
        error={loadError}
        isEmpty={!wallet.data || !products.data}
        isLoading={isSessionLoading || wallet.isLoading || products.isLoading}
        onRetry={() => {
          wallet.reload();
          products.reload();
        }}
      >
        {wallet.data && products.data ? (
          <>
            <div className={styles.balanceHeroGrid}>
              <AiCard className={styles.balanceMainCard}>
                <span className={styles.balanceIcon}><FiZap aria-hidden="true" /></span>
                <p>{t("Доступно сейчас", "Available now")}</p>
                <strong>{formatCredits(wallet.data.availableCredits, locale)}</strong>
                <div className={styles.balanceBreakdown}>
                  <span><small>{t("Зарезервировано", "Reserved")}</small>{formatCredits(wallet.data.reservedCredits, locale)}</span>
                  <span><small>{t("Временно заблокировано", "Temporarily locked")}</small>{formatCredits(wallet.data.lockedCredits, locale)}</span>
                </div>
              </AiCard>

              <AiCard className={styles.subscriptionCard}>
                <div className={styles.subscriptionHeading}>
                  <span className={styles.balanceIcon}><FiShield aria-hidden="true" /></span>
                  <StatusBadge status={products.data.subscription.active ? "active" : "inactive"} />
                </div>
                <h2>{products.data.subscription.planName || t("Нет активной подписки", "No active subscription")}</h2>
                {products.data.subscription.active ? (
                  <>
                    <p>
                      {t("Активна до", "Active until")} {products.data.subscription.periodEndsAt
                        ? formatDate(products.data.subscription.periodEndsAt, false, locale)
                        : t("конца оплаченного периода", "the end of the paid period")}
                    </p>
                    <div className={styles.subscriptionFooter}>
                      <span>
                        {products.data.subscription.autoRenew
                          ? t("Автопродление включено", "Auto-renewal enabled")
                          : t("Продление вручную", "Manual renewal")}
                      </span>
                      {products.data.subscription.autoRenew ? (
                        <AiButton disabled={isPending} variant="ghost" onClick={() => void cancelRenewal()}>
                          {t("Отключить", "Disable")}
                        </AiButton>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p>
                    {t("Запуски и использование ранее купленных разовых кредитов станут доступны после подключения подписки.", "Runs and previously purchased top-up credits become available after subscribing.")}
                  </p>
                )}
              </AiCard>
            </div>

            <section className={styles.productSection}>
              <div className={styles.sectionTitleRow}>
                <h2>{t("Подписки", "Subscriptions")}</h2>
                <div
                  aria-label={t("Период подписки", "Subscription period")}
                  className={styles.billingPeriodToggle}
                  role="group"
                >
                  <button
                    aria-pressed={billingPeriod === "month"}
                    className={billingPeriod === "month" ? styles.billingPeriodActive : undefined}
                    type="button"
                    onClick={() => setBillingPeriod("month")}
                  >
                    {t("Месяц", "Month")}
                  </button>
                  <button
                    aria-pressed={billingPeriod === "year"}
                    className={billingPeriod === "year" ? styles.billingPeriodActive : undefined}
                    type="button"
                    onClick={() => setBillingPeriod("year")}
                  >
                    {t("Год", "Year")} <small>−10%</small>
                  </button>
                </div>
              </div>
              {visiblePlans.length ? (
                <div className={styles.planGrid}>
                  {visiblePlans.map((plan) => (
                    <AiCard className={styles.planCard} key={plan.id}>
                      {plan.badge ? <span className={styles.planBadge}>{plan.badge}</span> : null}
                      <h3>{plan.name}</h3>
                      {plan.description ? <p>{plan.description}</p> : null}
                      {plan.interval === "year" ? (
                        <div className={styles.annualPlanPrice}>
                          <s>
                            {formatMoney(
                              Math.round(plan.amountMinor / (12 * 0.9)),
                              plan.currency,
                              locale,
                            )}
                          </s>
                          <strong className={styles.planPrice}>
                            {formatMoney(
                              Math.round(plan.amountMinor / 12),
                              plan.currency,
                              locale,
                            )}
                            <small>{t("/ месяц", "/ month")}</small>
                          </strong>
                          <span>
                            {t("Оплата за год", "Billed yearly")}:{" "}
                            {formatMoney(plan.amountMinor, plan.currency, locale)}
                          </span>
                        </div>
                      ) : (
                        <strong className={styles.planPrice}>
                          {formatMoney(plan.amountMinor, plan.currency, locale)}
                          <small>{plan.priceSuffix}</small>
                        </strong>
                      )}
                      <span className={styles.planCredits}>
                        {formatCredits(plan.credits, locale)}
                        {plan.interval === "year" ? ` ${t("на год", "per year")}` : ""}
                      </span>
                      {plan.features.length ? (
                        <ul>
                          {plan.features.map((feature, index) => (
                            <li key={`${index}:${feature}`}><FiCheck aria-hidden="true" /> {feature}</li>
                          ))}
                        </ul>
                      ) : null}
                      <AiButton
                        variant="secondary"
                        onClick={() => openCheckout({ type: "subscription", value: plan })}
                      >
                        {t("Выбрать", "Choose")} <FiArrowUpRight aria-hidden="true" />
                      </AiButton>
                    </AiCard>
                  ))}
                </div>
              ) : (
                <AiCard className={styles.inlineEmpty}>{t("Подписки пока не опубликованы администратором.", "No subscriptions have been published yet.")}</AiCard>
              )}
            </section>

            <section className={styles.productSection}>
              <div className={styles.sectionTitleRow}>
                <h2>{t("Разовые пакеты", "Credit packs")}</h2>
              </div>
              {products.data.topups.length ? (
                <div className={styles.topupGrid}>
                  {products.data.topups.map((topup) => (
                    <AiCard className={styles.topupCard} key={topup.id}>
                      <FiGift aria-hidden="true" />
                      <div>
                        {!isCreditCountName(topup.name) ? <h3>{topup.name}</h3> : null}
                        <strong>{formatCredits(topup.credits, locale)}</strong>
                        <small className={styles.topupUnitPrice}>
                          {t("1 кредит", "1 credit")} ={" "}
                          {formatMoneyPerCredit(
                            topup.amountMinor,
                            topup.credits,
                            topup.currency,
                            locale,
                          )}
                        </small>
                      </div>
                      <span>{formatMoney(topup.amountMinor, topup.currency, locale)}</span>
                      <AiButton
                        disabled={!topup.eligible || !products.data?.subscription.active}
                        variant="secondary"
                        onClick={() => openCheckout({ type: "topup", value: topup })}
                      >
                        {!topup.eligible ? <FiLock aria-hidden="true" /> : <FiCreditCard aria-hidden="true" />}
                        {t("Купить", "Buy")}
                      </AiButton>
                      {!topup.eligible && topup.ineligibleReason ? <small>{topup.ineligibleReason}</small> : null}
                    </AiCard>
                  ))}
                </div>
              ) : (
                <AiCard className={styles.inlineEmpty}>{t("Пакеты пополнения пока не опубликованы.", "No credit packs have been published yet.")}</AiCard>
              )}
            </section>

            <div className={styles.balanceLowerGrid}>
              <AiCard className={styles.referralPaymentCard}>
                <span><FiUsers aria-hidden="true" /></span>
                <div>
                  <h2>{t("Партнёрская программа", "Referral program")}</h2>
                  <p>
                    {referrals.data?.referrerPercent
                      ? t(
                          `Получайте ${referrals.data.referrerPercent}% с первой успешной покупки приглашённого пользователя.`,
                          `Earn ${referrals.data.referrerPercent}% from an invited user's first successful purchase.`,
                        )
                      : t(
                          "Приглашайте друзей и получайте вознаграждение после их первой успешной покупки.",
                          "Invite friends and earn a reward after their first successful purchase.",
                        )}
                  </p>
                </div>
                <AiLinkButton href="/ai/referrals" variant="secondary">
                  {t("Подробнее", "Learn more")} <FiArrowUpRight aria-hidden="true" />
                </AiLinkButton>
              </AiCard>

              <AiCard className={styles.paymentHistoryCard}>
                <div className={styles.cardTitleRow}>
                  <h2>{t("Последние платежи", "Recent payments")}</h2>
                  <FiClock aria-hidden="true" />
                </div>
                {payments.isLoading ? <div className={styles.miniSkeleton} /> : null}
                {payments.error ? <FieldMessage>{payments.error}</FieldMessage> : null}
                {!payments.isLoading && !payments.data?.data.length ? <p>{t("Платежей пока нет.", "No payments yet.")}</p> : null}
                <div className={styles.paymentList}>
                  {payments.data?.data.map((payment) => (
                    <div className={styles.paymentRow} key={payment.id}>
                      <div><strong>{payment.title}</strong><small>{formatDate(payment.createdAt, false, locale)}</small></div>
                      <div>
                        <strong>{formatMoney(payment.amountMinor, payment.currency, locale)}</strong>
                        <StatusBadge status={payment.status} />
                        <ReceiptState status={payment.receiptStatus} url={payment.receiptUrl} />
                      </div>
                    </div>
                  ))}
                </div>
              </AiCard>
            </div>
          </>
        ) : null}
      </AsyncState>

      {checkoutProduct ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={closeCheckout}>
          <div
            aria-labelledby="checkout-title"
            aria-modal="true"
            className={styles.modal}
            ref={checkoutDialogRef}
            role="dialog"
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="checkout-title">{t("Способ оплаты", "Payment method")}</h2>
            <p>
              {checkoutProduct.value.name} · {formatMoney(
                promoQuote?.finalAmountMinor ?? checkoutProduct.value.amountMinor,
                checkoutProduct.value.currency,
                locale,
              )}
              {checkoutProduct.type === "subscription" ? ` ${checkoutProduct.value.priceSuffix}` : ""}
            </p>
            {compatibleProviders.length ? (
              <div className={styles.providerList}>
                {compatibleProviders.map((provider, index) => (
                  <ProviderChoice
                    autoFocus={index === 0}
                    checked={provider.id === activeProviderId}
                    key={provider.id}
                    provider={provider}
                    onChange={() => {
                      setAutoRenew(
                        checkoutProduct.type === "subscription" &&
                          provider.recurringAvailable,
                      );
                      setPaymentProviderId(provider.id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <FieldMessage>{t("Для этой валюты сейчас нет доступного способа оплаты.", "No payment method is currently available for this currency.")}</FieldMessage>
            )}
            {checkoutProduct.type === "subscription" ? (
              recurringAvailable ? (
                <label className={styles.consentField}>
                  <input
                    checked={autoRenew}
                    type="checkbox"
                    onChange={(event) => setAutoRenew(event.target.checked)}
                  />
                  <span>
                    <strong>{t("Автопродление", "Auto-renewal")}</strong>
                  </span>
                </label>
              ) : null
            ) : null}
            <form className={styles.checkoutPromo} onSubmit={(event) => void applyPromo(event)}>
              <label htmlFor="checkout-promo">{t("Промокод", "Promo code")}</label>
              <div>
                <input
                  id="checkout-promo"
                  maxLength={64}
                  placeholder={t("Введите код", "Enter code")}
                  value={promoCode}
                  onChange={(event) => {
                    setPromoCode(event.target.value);
                    setPromoQuote(null);
                    setPromoError(null);
                    checkoutIntent.current = null;
                  }}
                />
                <AiButton disabled={isPromoPending || !promoCode.trim()} type="submit" variant="secondary">
                  {isPromoPending ? t("Проверяем…", "Checking…") : t("Применить", "Apply")}
                </AiButton>
              </div>
              {promoQuote ? (
                <div className={styles.promoSummary}>
                  {promoQuote.discountMinor > 0 ? (
                    <span>
                      {t("Скидка", "Discount")}
                      <strong>−{formatMoney(promoQuote.discountMinor, promoQuote.currency, locale)}</strong>
                    </span>
                  ) : null}
                  {promoQuote.bonusCredits > 0 ? (
                    <span>
                      {t("Бонус", "Bonus")}
                      <strong>+{formatCredits(promoQuote.bonusCredits, locale)}</strong>
                    </span>
                  ) : null}
                </div>
              ) : null}
              {promoError ? <FieldMessage>{promoError}</FieldMessage> : null}
            </form>
            {error ? <FieldMessage>{error}</FieldMessage> : null}
            <div className={styles.modalActions}>
              <AiButton disabled={isPending || !activeProviderId} onClick={() => void startCheckout()}>
                {isPending ? t("Создаём платёж…", "Creating payment…") : t("Перейти к оплате", "Continue to payment")}
                {!isPending ? <FiExternalLink aria-hidden="true" /> : null}
              </AiButton>
              <AiButton variant="ghost" onClick={closeCheckout}>{t("Отмена", "Cancel")}</AiButton>
            </div>
            <small>{t("После успешной оплаты баланс обновится автоматически.", "Your balance will update automatically after successful payment.")}</small>
          </div>
        </div>
      ) : null}
    </AiPage>
  );
}

function ProviderChoice({
  provider,
  checked,
  autoFocus,
  onChange,
}: {
  provider: AiPaymentProvider;
  checked: boolean;
  autoFocus: boolean;
  onChange: () => void;
}) {
  return (
    <label className={`${styles.providerChoice} ${checked ? styles.providerChoiceActive : ""}`}>
      <input autoFocus={autoFocus} checked={checked} name="payment-provider" type="radio" onChange={onChange} />
      <span><strong>{provider.name}</strong>{provider.description ? <small>{provider.description}</small> : null}</span>
    </label>
  );
}

function isCreditCountName(value: string): boolean {
  return /^[\d\s.,]+(?:кредит(?:а|ов)?|credits?)$/iu.test(value.trim());
}

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
  FiRefreshCw,
  FiShield,
  FiZap,
} from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import {
  aiApiFetch,
  type AiApiEnvelope,
  type AiBillingProducts,
  type AiPage as AiPageData,
  type AiPaymentProvider,
  type AiPaymentSummary,
  type AiPlan,
  type AiTopupPackage,
  type AiWalletSummary,
} from "@/shared/api/ai";
import { useFocusTrap } from "@/shared/lib/dom/useFocusTrap";
import { formatCredits } from "@/shared/lib/formatCredits";

import { getAiErrorMessage, unwrapAiData, useAiResource } from "../model/api";
import { formatDate, formatMoney } from "../model/format";
import {
  AccountGate,
  AiButton,
  AiCard,
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

export function BalancePage() {
  const { session, isLoading: isSessionLoading, refresh: refreshSession } = useAiSession();
  const wallet = useAiResource<AiWalletSummary>(session.authenticated ? "/wallet/balance" : null);
  const products = useAiResource<AiBillingProducts>(session.authenticated ? "/billing/products" : null);
  const payments = useAiResource<AiPageData<AiPaymentSummary>>(
    session.authenticated ? "/billing/payments?page=1&pageSize=10" : null,
  );
  const [checkoutProduct, setCheckoutProduct] = useState<CheckoutProduct | null>(null);
  const [paymentProviderId, setPaymentProviderId] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [promoToken, setPromoToken] = useState<string | null>(null);
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

  if (!isSessionLoading && !session.authenticated) {
    return (
      <AiPage>
        <AiPageHeader title="Баланс" description="Подписка, кредиты и история платежей." />
        <AccountGate returnTo="/ai/balance" />
      </AiPage>
    );
  }

  async function startCheckout() {
    if (!checkoutProduct || !activeProviderId) {
      setError("Выберите доступный способ оплаты");
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
        promoToken || "",
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
          ...(promoToken ? { promoCode: promoToken } : {}),
        },
      });
      const checkout = unwrapAiData(payload);
      if (!checkout.checkoutUrl) {
        setCheckoutProduct(null);
        setNotice("Платёж создан. Обновите статус через несколько секунд.");
        payments.reload();
        return;
      }
      const url = new URL(checkout.checkoutUrl, window.location.origin);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Платёжный сервис вернул некорректную ссылку");
      }
      window.location.assign(url.toString());
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  function applyPromo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("promo") || "").trim();
    if (!code) return;

    setError(null);
    setPromoToken(code);
    setNotice("Промокод сохранён и будет проверен для выбранного тарифа при оплате.");
  }

  async function cancelRenewal() {
    if (!window.confirm("Отключить автопродление в конце оплаченного периода?")) return;
    setIsPending(true);
    setError(null);
    try {
      await aiApiFetch("/billing/subscription/cancel", { method: "POST" });
      products.reload();
      setNotice("Автопродление отключено. Доступ сохранится до конца периода.");
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  const loadError = wallet.error || products.error;

  return (
    <AiPage>
      <AiPageHeader
        eyebrow="Кредиты и подписка"
        title="Баланс"
        description="Сервер рассчитывает доступные кредиты с учётом резерва, срока действия и статуса подписки."
        actions={
          <AiButton
            variant="secondary"
            onClick={() => {
              wallet.reload();
              products.reload();
              payments.reload();
              void refreshSession();
            }}
          >
            <FiRefreshCw aria-hidden="true" /> Обновить
          </AiButton>
        }
      />

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
                <p>Доступно сейчас</p>
                <strong>{formatCredits(wallet.data.availableCredits)}</strong>
                <div className={styles.balanceBreakdown}>
                  <span><small>Зарезервировано</small>{formatCredits(wallet.data.reservedCredits)}</span>
                  <span><small>Временно заблокировано</small>{formatCredits(wallet.data.lockedCredits)}</span>
                </div>
              </AiCard>

              <AiCard className={styles.subscriptionCard}>
                <div className={styles.subscriptionHeading}>
                  <span className={styles.balanceIcon}><FiShield aria-hidden="true" /></span>
                  <StatusBadge status={products.data.subscription.active ? "active" : "inactive"} />
                </div>
                <h2>{products.data.subscription.planName || "Нет активной подписки"}</h2>
                {products.data.subscription.active ? (
                  <>
                    <p>
                      Доступ до {products.data.subscription.periodEndsAt
                        ? formatDate(products.data.subscription.periodEndsAt)
                        : "конца оплаченного периода"}
                    </p>
                    <div className={styles.subscriptionFooter}>
                      <span>
                        {products.data.subscription.autoRenew
                          ? "Автопродление включено"
                          : "Продление вручную"}
                      </span>
                      {products.data.subscription.autoRenew ? (
                        <AiButton disabled={isPending} variant="ghost" onClick={() => void cancelRenewal()}>
                          Отключить
                        </AiButton>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p>
                    Запуски и использование ранее купленных разовых кредитов
                    станут доступны после подключения подписки.
                  </p>
                )}
              </AiCard>
            </div>

            <section className={styles.productSection}>
              <div className={styles.sectionTitleRow}>
                <div><span className={styles.eyebrow}>Тарифы</span><h2>Подписки</h2></div>
                <p>Актуальные условия загружены из настроек сервиса.</p>
              </div>
              {products.data.plans.length ? (
                <div className={styles.planGrid}>
                  {products.data.plans.map((plan) => (
                    <AiCard className={styles.planCard} key={plan.id}>
                      {plan.badge ? <span className={styles.planBadge}>{plan.badge}</span> : null}
                      <span className={styles.planInterval}>{plan.intervalLabel}</span>
                      <h3>{plan.name}</h3>
                      {plan.description ? <p>{plan.description}</p> : null}
                      <strong className={styles.planPrice}>{formatMoney(plan.amountMinor, plan.currency)}<small>{plan.priceSuffix}</small></strong>
                      <span className={styles.planCredits}>{formatCredits(plan.credits)}</span>
                      {plan.features.length ? (
                        <ul>
                          {plan.features.map((feature, index) => (
                            <li key={`${index}:${feature}`}><FiCheck aria-hidden="true" /> {feature}</li>
                          ))}
                        </ul>
                      ) : null}
                      <p className={styles.planRenewal}>
                        {plan.recurringAvailable ? "Автопродление доступно" : "Доступно только ручное продление"}
                      </p>
                      <AiButton
                        variant="secondary"
                        onClick={() => {
                          setAutoRenew(false);
                          setCheckoutProduct({ type: "subscription", value: plan });
                        }}
                      >
                        Выбрать <FiArrowUpRight aria-hidden="true" />
                      </AiButton>
                    </AiCard>
                  ))}
                </div>
              ) : (
                <AiCard className={styles.inlineEmpty}>Подписки пока не опубликованы администратором.</AiCard>
              )}
            </section>

            <section className={styles.productSection}>
              <div className={styles.sectionTitleRow}>
                <div><span className={styles.eyebrow}>Дополнительно</span><h2>Разовые пакеты</h2></div>
                <p>Не сгорают, но доступны для использования только при активной подписке.</p>
              </div>
              {products.data.topups.length ? (
                <div className={styles.topupGrid}>
                  {products.data.topups.map((topup) => (
                    <AiCard className={styles.topupCard} key={topup.id}>
                      <FiGift aria-hidden="true" />
                      <div><h3>{topup.name}</h3><strong>{formatCredits(topup.credits)}</strong></div>
                      <span>{formatMoney(topup.amountMinor, topup.currency)}</span>
                      <AiButton
                        disabled={!topup.eligible || !products.data?.subscription.active}
                        variant="secondary"
                        onClick={() => {
                          setAutoRenew(false);
                          setCheckoutProduct({ type: "topup", value: topup });
                        }}
                      >
                        {!topup.eligible ? <FiLock aria-hidden="true" /> : <FiCreditCard aria-hidden="true" />}
                        Купить
                      </AiButton>
                      {!topup.eligible && topup.ineligibleReason ? <small>{topup.ineligibleReason}</small> : null}
                    </AiCard>
                  ))}
                </div>
              ) : (
                <AiCard className={styles.inlineEmpty}>Пакеты пополнения пока не опубликованы.</AiCard>
              )}
            </section>

            <div className={styles.balanceLowerGrid}>
              <AiCard className={styles.promoCard}>
                <h2>Промокод</h2>
                <p>Код проверяется сервером и применяется только к допустимой покупке.</p>
                <form className={styles.inlineForm} onSubmit={applyPromo}>
                  <label className={styles.visuallyHidden} htmlFor="promo-code">Промокод</label>
                  <input id="promo-code" name="promo" placeholder="Введите код" />
                  <AiButton disabled={isPending} type="submit" variant="secondary">Применить</AiButton>
                </form>
                {notice ? <FieldMessage tone="success">{notice}</FieldMessage> : null}
                {error ? <FieldMessage>{error}</FieldMessage> : null}
              </AiCard>

              <AiCard className={styles.paymentHistoryCard}>
                <div className={styles.cardTitleRow}>
                  <h2>Последние платежи</h2>
                  <FiClock aria-hidden="true" />
                </div>
                {payments.isLoading ? <div className={styles.miniSkeleton} /> : null}
                {payments.error ? <FieldMessage>{payments.error}</FieldMessage> : null}
                {!payments.isLoading && !payments.data?.data.length ? <p>Платежей пока нет.</p> : null}
                <div className={styles.paymentList}>
                  {payments.data?.data.map((payment) => (
                    <div className={styles.paymentRow} key={payment.id}>
                      <div><strong>{payment.title}</strong><small>{formatDate(payment.createdAt)}</small></div>
                      <div>
                        <strong>{formatMoney(payment.amountMinor, payment.currency)}</strong>
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
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setCheckoutProduct(null)}>
          <div
            aria-labelledby="checkout-title"
            aria-modal="true"
            className={styles.modal}
            ref={checkoutDialogRef}
            role="dialog"
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="checkout-title">Способ оплаты</h2>
            <p>
              {checkoutProduct.value.name} · {formatMoney(checkoutProduct.value.amountMinor, checkoutProduct.value.currency)}
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
                      setAutoRenew(false);
                      setPaymentProviderId(provider.id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <FieldMessage>Для этой валюты сейчас нет доступного способа оплаты.</FieldMessage>
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
                    <strong>Включить автопродление</strong>
                    <small>
                      После текущего периода сервис сможет автоматически списать стоимость
                      следующего периода. Опцию можно отключить в любой момент до списания.
                    </small>
                  </span>
                </label>
              ) : (
                <FieldMessage tone="notice">
                  Для выбранного способа оплаты продление выполняется только вручную.
                </FieldMessage>
              )
            ) : null}
            {checkoutProduct.type === "subscription" ? (
              <p className={styles.checkoutRenewalSummary} aria-live="polite">
                Автопродление: <strong>{requestedAutoRenew ? "включено" : "выключено"}</strong>
              </p>
            ) : null}
            {error ? <FieldMessage>{error}</FieldMessage> : null}
            <div className={styles.modalActions}>
              <AiButton disabled={isPending || !activeProviderId} onClick={() => void startCheckout()}>
                {isPending ? "Создаём платёж…" : "Перейти к оплате"}
                {!isPending ? <FiExternalLink aria-hidden="true" /> : null}
              </AiButton>
              <AiButton variant="ghost" onClick={() => setCheckoutProduct(null)}>Отмена</AiButton>
            </div>
            <small>Оплата подтверждается только защищённым уведомлением платёжного сервиса.</small>
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
      {provider.recurringAvailable ? <small>Поддерживает автопродление</small> : null}
    </label>
  );
}

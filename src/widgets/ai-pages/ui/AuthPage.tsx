"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiKey, FiLock, FiMail, FiSend, FiUser } from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import { useAiLocale } from "@/features/ai-locale";
import {
  aiApiFetch,
  clearAiCsrfToken,
  type AiApiEnvelope,
  type AiAuthProvider,
  type AiSession,
  type AiTwoFactorRequired,
} from "@/shared/api/ai";

import { getAiErrorMessage, unwrapAiData, useAiResource } from "../model/api";
import { AiButton, AiCard, AiPage, FieldMessage } from "./AiUi";
import styles from "./AiPages.module.scss";

type AuthMode = "login" | "register";

type AuthPageProps = {
  initialAuthError?: string;
  initialReturnTo?: string;
};

export function AuthPage({
  initialAuthError,
  initialReturnTo = "/ai/create",
}: AuthPageProps = {}) {
  const router = useRouter();
  const { isEnglish, t } = useAiLocale();
  const { session, refresh } = useAiSession();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTelegramRedirecting, setIsTelegramRedirecting] = useState(false);
  const [twoFactor, setTwoFactor] = useState<AiTwoFactorRequired | null>(null);
  const [telegramTermsAccepted, setTelegramTermsAccepted] = useState(false);
  const [telegramPrivacyAccepted, setTelegramPrivacyAccepted] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    initialAuthError ? getTelegramAuthErrorMessage(initialAuthError, isEnglish) : null,
  );
  const returnTo = initialReturnTo;
  const providers = useAiResource<AiAuthProvider[]>(
    `/auth/providers?returnTo=${encodeURIComponent(returnTo)}`,
  );

  useEffect(() => {
    if (session.authenticated) {
      router.replace(returnTo);
    }
  }, [returnTo, router, session.authenticated]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const email = String(values.get("email") || "").trim();
    const password = String(values.get("password") || "");
    const displayName = String(values.get("displayName") || "").trim();
    const termsAccepted = values.get("termsAccepted") === "on";
    const privacyAccepted = values.get("privacyAccepted") === "on";
    const marketingConsent = values.get("marketingConsent") === "on";

    if (!email || !password || (mode === "register" && !displayName)) {
      setError(t("Заполните обязательные поля", "Complete all required fields"));
      return;
    }
    if (mode === "register" && password.length < 12) {
      setError(t("Пароль должен содержать не менее 12 символов", "Password must be at least 12 characters long"));
      return;
    }
    if (mode === "register" && (!termsAccepted || !privacyAccepted)) {
      setError(t("Подтвердите условия сервиса и политику обработки данных", "Accept the terms of service and privacy policy"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = await aiApiFetch<
        | AiSession
        | AiTwoFactorRequired
        | AiApiEnvelope<AiSession | AiTwoFactorRequired>
      >(
        `/auth/${mode}`,
        {
          method: "POST",
          body: {
            email,
            password,
            ...(mode === "register"
              ? { displayName, termsAccepted, privacyAccepted, marketingConsent }
              : {}),
          },
        },
      );

      const result = unwrapAiData(payload);
      if ("requiresTwoFactor" in result && result.requiresTwoFactor) {
        form.reset();
        setTwoFactor(result);
        return;
      }
      clearAiCsrfToken();
      form.reset();
      await refresh();
      router.replace(returnTo);
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!twoFactor) return;
    const code = String(new FormData(event.currentTarget).get("code") || "").trim();
    if (!/^\d{6}$/.test(code)) {
      setError(t("Введите шестизначный код", "Enter the six-digit code"));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await aiApiFetch<AiSession | AiApiEnvelope<AiSession>>(
        "/auth/two-factor/email/verify",
        {
          method: "POST",
          body: { challengeId: twoFactor.challengeId, code },
        },
      );
      clearAiCsrfToken();
      await refresh();
      router.replace(returnTo);
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const telegram = providers.data?.find(
    (provider) => provider.code === "telegram" && provider.available,
  );

  function handleTelegramStart() {
    if (!telegram?.authorizationUrl) {
      return;
    }
    if (!telegramTermsAccepted || !telegramPrivacyAccepted) {
      setError(t("Подтвердите условия сервиса и политику обработки данных", "Accept the terms of service and privacy policy"));
      return;
    }

    setError(null);
    setIsTelegramRedirecting(true);
    try {
      const authorizationUrl = new URL(telegram.authorizationUrl);
      authorizationUrl.searchParams.set("termsAccepted", "true");
      authorizationUrl.searchParams.set("privacyAccepted", "true");
      window.location.assign(authorizationUrl.toString());
    } catch {
      setIsTelegramRedirecting(false);
      setError(t("Некорректная ссылка входа через Telegram. Попробуйте позже.", "Invalid Telegram sign-in link. Please try again later."));
    }
  }

  if (twoFactor) {
    return (
      <AiPage>
        <div className={styles.authLayout}>
          <AuthIntro />
          <AiCard className={styles.authCard}>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => {
                setTwoFactor(null);
                setError(null);
              }}
            >
              <FiArrowLeft aria-hidden="true" /> {t("Назад ко входу", "Back to sign in")}
            </button>
            <div className={styles.authTitle}>
              <h2>{t("Подтвердите вход", "Confirm sign in")}</h2>
              <p>
                {t(
                  `Мы отправили код на ${twoFactor.destinationHint}`,
                  `We sent a code to ${twoFactor.destinationHint}`,
                )}
              </p>
            </div>
            <form className={styles.formStack} onSubmit={handleTwoFactor}>
              <label className={styles.field}>
                <span>{t("Код из письма", "Email code")}</span>
                <span className={styles.inputWrap}>
                  <FiKey aria-hidden="true" />
                  <input
                    autoComplete="one-time-code"
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    name="code"
                    pattern="[0-9]{6}"
                    placeholder="000000"
                    required
                  />
                </span>
              </label>
              {error ? <FieldMessage>{error}</FieldMessage> : null}
              <AiButton disabled={isSubmitting} type="submit">
                {isSubmitting
                  ? t("Проверяем…", "Checking…")
                  : t("Продолжить", "Continue")}
                {!isSubmitting ? <FiArrowRight aria-hidden="true" /> : null}
              </AiButton>
            </form>
          </AiCard>
        </div>
      </AiPage>
    );
  }

  return (
    <AiPage>
      <div className={styles.authLayout}>
        <AuthIntro />

        <AiCard className={styles.authCard}>
          <div className={styles.segmented} role="tablist" aria-label={t("Тип формы", "Form type")}>
            <button
              aria-selected={mode === "login"}
              className={mode === "login" ? styles.segmentActive : ""}
              role="tab"
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              {t("Вход", "Sign in")}
            </button>
            <button
              aria-selected={mode === "register"}
              className={mode === "register" ? styles.segmentActive : ""}
              role="tab"
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
            >
              {t("Регистрация", "Register")}
            </button>
          </div>

          <div className={styles.authTitle}>
            <h2>{mode === "login" ? t("С возвращением", "Welcome back") : t("Создать аккаунт", "Create account")}</h2>
            <p>
              {mode === "login"
                ? t("Войдите по email или через Telegram", "Sign in with email or Telegram")
                : t("Начните работать с Нейролюб Studio", "Start using Neuroluv Studio")}
            </p>
          </div>

          {telegram?.authorizationUrl ? (
            <div className={styles.telegramAuth}>
              <div
                aria-label={t("Согласия для входа через Telegram", "Telegram sign-in consents")}
                className={styles.consentStack}
                role="group"
              >
                <label className={styles.consentField}>
                  <input
                    checked={telegramTermsAccepted}
                    onChange={(event) => setTelegramTermsAccepted(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("Я принимаю условия сервиса", "I accept the terms of service")}</span>
                </label>
                <label className={styles.consentField}>
                  <input
                    checked={telegramPrivacyAccepted}
                    onChange={(event) => setTelegramPrivacyAccepted(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("Я принимаю политику обработки персональных данных", "I accept the privacy policy")}</span>
                </label>
              </div>
              <button
                className={`${styles.button} ${styles.telegramButton}`}
                disabled={isTelegramRedirecting}
                onClick={handleTelegramStart}
                type="button"
              >
                <FiSend aria-hidden="true" />
                {isTelegramRedirecting ? t("Переходим…", "Redirecting…") : t("Продолжить через Telegram", "Continue with Telegram")}
              </button>
              <p className={styles.telegramConsentHint}>
                {t("Для существующего аккаунта повторная запись согласия не создаётся.", "No duplicate consent record is created for an existing account.")}
              </p>
            </div>
          ) : null}

          {telegram?.authorizationUrl ? <div className={styles.divider}>{t("или", "or")}</div> : null}

          <form className={styles.formStack} noValidate onSubmit={handleSubmit}>
            {mode === "register" ? (
              <label className={styles.field}>
                <span>{t("Как к вам обращаться", "Your name")}</span>
                <span className={styles.inputWrap}>
                  <FiUser aria-hidden="true" />
                  <input
                    autoComplete="name"
                    name="displayName"
                    placeholder={t("Имя", "Name")}
                    required
                  />
                </span>
              </label>
            ) : null}

            <label className={styles.field}>
              <span>Email</span>
              <span className={styles.inputWrap}>
                <FiMail aria-hidden="true" />
                <input
                  autoComplete="email"
                  inputMode="email"
                  name="email"
                  placeholder="name@example.ru"
                  required
                  type="email"
                />
              </span>
            </label>

            <label className={styles.field}>
              <span>{t("Пароль", "Password")}</span>
              <span className={styles.inputWrap}>
                <FiLock aria-hidden="true" />
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={mode === "register" ? 12 : undefined}
                  name="password"
                  placeholder={mode === "register" ? t("Не менее 12 символов", "At least 12 characters") : t("Ваш пароль", "Your password")}
                  required
                  type="password"
                />
              </span>
            </label>
            {mode === "login" ? (
              <Link className={styles.formAuxLink} href="/ai/auth/reset-password">
                {t("Забыли пароль?", "Forgot password?")}
              </Link>
            ) : null}

            {mode === "register" ? (
              <div className={styles.consentStack}>
                <label className={styles.consentField}>
                  <input name="termsAccepted" required type="checkbox" />
                  <span>{t("Я принимаю условия сервиса", "I accept the terms of service")}</span>
                </label>
                <label className={styles.consentField}>
                  <input name="privacyAccepted" required type="checkbox" />
                  <span>{t("Я принимаю политику обработки персональных данных", "I accept the privacy policy")}</span>
                </label>
                <label className={styles.consentField}>
                  <input name="marketingConsent" type="checkbox" />
                  <span>{t("Получать новости продукта и полезные материалы", "Receive product news and useful materials")}</span>
                </label>
              </div>
            ) : null}

            {error ? <FieldMessage>{error}</FieldMessage> : null}

            <AiButton disabled={isSubmitting} type="submit">
              {isSubmitting
                ? t("Проверяем…", "Checking…")
                : mode === "login"
                  ? t("Войти", "Sign in")
                  : t("Зарегистрироваться", "Register")}
              {!isSubmitting ? <FiArrowRight aria-hidden="true" /> : null}
            </AiButton>
          </form>

          {providers.error ? (
            <p className={styles.subtleNotice}>
              {t("Вход через внешние сервисы сейчас недоступен. Email-вход продолжает работать.", "External sign-in is currently unavailable. Email sign-in still works.")}
            </p>
          ) : null}

          <p className={styles.legalText}>
            {mode === "register"
              ? t("Обязательные согласия фиксируются при создании аккаунта. Рассылку можно отключить в профиле.", "Required consents are recorded when the account is created. Emails can be disabled in your profile.")
              : t("Входя, вы подтверждаете, что используете свой аккаунт.", "By signing in, you confirm that you are using your own account.")}
          </p>
        </AiCard>
      </div>
    </AiPage>
  );
}

function AuthIntro() {
  const { t } = useAiLocale();

  return (
    <section className={styles.authIntro}>
      <span className={styles.eyebrow}>
        {t("Один аккаунт для всей AI-студии", "One account for the entire AI studio")}
      </span>
      <h1>
        {t(
          "Создавайте, сохраняйте и продолжайте с любого устройства",
          "Create, save and continue on any device",
        )}
      </h1>
      <p>
        {t(
          "Ваши черновики останутся в браузере, а история запусков, работы и кредиты будут доступны после входа.",
          "Your drafts stay in the browser, while runs, works and credits become available after sign-in.",
        )}
      </p>
      <div className={styles.authVisual} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function getTelegramAuthErrorMessage(code: string, isEnglish: boolean): string {
  const messages: Record<string, [string, string]> = {
    telegram_denied: ["Вы отменили вход через Telegram.", "You cancelled Telegram sign-in."],
    telegram_invalid_callback: ["Telegram вернул неполный ответ. Попробуйте ещё раз.", "Telegram returned an incomplete response. Please try again."],
    telegram_login_failed: ["Не удалось войти через Telegram. Попробуйте ещё раз.", "Unable to sign in with Telegram. Please try again."],
    telegram_registration_consent_required: ["Для создания аккаунта через Telegram нужно принять условия сервиса и политику обработки данных.", "Accept the terms of service and privacy policy to create an account with Telegram."],
    telegram_state_invalid: ["Сессия входа через Telegram истекла. Начните вход заново.", "The Telegram sign-in session expired. Start again."],
    telegram_token_invalid: ["Не удалось подтвердить аккаунт Telegram. Начните вход заново.", "Unable to verify the Telegram account. Start again."],
    telegram_unavailable: ["Telegram временно недоступен. Попробуйте позже.", "Telegram is temporarily unavailable. Please try again later."],
  };

  const message = messages[code];
  return message?.[isEnglish ? 1 : 0] || (isEnglish ? "Unable to complete Telegram sign-in. Please try again." : "Не удалось завершить вход через Telegram. Попробуйте ещё раз.");
}

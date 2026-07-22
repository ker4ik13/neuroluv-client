"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { FiArrowRight, FiLock, FiMail, FiSend, FiUser } from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import {
  aiApiFetch,
  clearAiCsrfToken,
  type AiApiEnvelope,
  type AiAuthProvider,
  type AiSession,
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
  const { session, refresh } = useAiSession();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTelegramRedirecting, setIsTelegramRedirecting] = useState(false);
  const [telegramTermsAccepted, setTelegramTermsAccepted] = useState(false);
  const [telegramPrivacyAccepted, setTelegramPrivacyAccepted] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    initialAuthError ? getTelegramAuthErrorMessage(initialAuthError) : null,
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
      setError("Заполните обязательные поля");
      return;
    }
    if (mode === "register" && password.length < 12) {
      setError("Пароль должен содержать не менее 12 символов");
      return;
    }
    if (mode === "register" && (!termsAccepted || !privacyAccepted)) {
      setError("Подтвердите условия сервиса и политику обработки данных");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = await aiApiFetch<AiSession | AiApiEnvelope<AiSession>>(
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

      unwrapAiData(payload);
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

  const telegram = providers.data?.find(
    (provider) => provider.code === "telegram" && provider.available,
  );

  function handleTelegramStart() {
    if (!telegram?.authorizationUrl) {
      return;
    }
    if (!telegramTermsAccepted || !telegramPrivacyAccepted) {
      setError("Подтвердите условия сервиса и политику обработки данных");
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
      setError("Некорректная ссылка входа через Telegram. Попробуйте позже.");
    }
  }

  return (
    <AiPage>
      <div className={styles.authLayout}>
        <section className={styles.authIntro}>
          <span className={styles.eyebrow}>Один аккаунт для всей AI-студии</span>
          <h1>Создавайте, сохраняйте и продолжайте с любого устройства</h1>
          <p>
            Ваши черновики останутся в браузере, а история запусков, работы и
            кредиты будут доступны после входа.
          </p>
          <div className={styles.authVisual} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>

        <AiCard className={styles.authCard}>
          <div className={styles.segmented} role="tablist" aria-label="Тип формы">
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
              Вход
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
              Регистрация
            </button>
          </div>

          <div className={styles.authTitle}>
            <h2>{mode === "login" ? "С возвращением" : "Создать аккаунт"}</h2>
            <p>
              {mode === "login"
                ? "Войдите по email или через Telegram"
                : "Начните работать с Нейролюб AI"}
            </p>
          </div>

          {telegram?.authorizationUrl ? (
            <div className={styles.telegramAuth}>
              <div
                aria-label="Согласия для входа через Telegram"
                className={styles.consentStack}
                role="group"
              >
                <label className={styles.consentField}>
                  <input
                    checked={telegramTermsAccepted}
                    onChange={(event) => setTelegramTermsAccepted(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Я принимаю условия сервиса</span>
                </label>
                <label className={styles.consentField}>
                  <input
                    checked={telegramPrivacyAccepted}
                    onChange={(event) => setTelegramPrivacyAccepted(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Я принимаю политику обработки персональных данных</span>
                </label>
              </div>
              <button
                className={`${styles.button} ${styles.telegramButton}`}
                disabled={isTelegramRedirecting}
                onClick={handleTelegramStart}
                type="button"
              >
                <FiSend aria-hidden="true" />
                {isTelegramRedirecting ? "Переходим…" : "Продолжить через Telegram"}
              </button>
              <p className={styles.telegramConsentHint}>
                Для существующего аккаунта повторная запись согласия не создаётся.
              </p>
            </div>
          ) : null}

          {telegram?.authorizationUrl ? <div className={styles.divider}>или</div> : null}

          <form className={styles.formStack} noValidate onSubmit={handleSubmit}>
            {mode === "register" ? (
              <label className={styles.field}>
                <span>Как к вам обращаться</span>
                <span className={styles.inputWrap}>
                  <FiUser aria-hidden="true" />
                  <input
                    autoComplete="name"
                    name="displayName"
                    placeholder="Имя"
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
              <span>Пароль</span>
              <span className={styles.inputWrap}>
                <FiLock aria-hidden="true" />
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={mode === "register" ? 12 : undefined}
                  name="password"
                  placeholder={mode === "register" ? "Не менее 12 символов" : "Ваш пароль"}
                  required
                  type="password"
                />
              </span>
            </label>

            {mode === "register" ? (
              <div className={styles.consentStack}>
                <label className={styles.consentField}>
                  <input name="termsAccepted" required type="checkbox" />
                  <span>Я принимаю условия сервиса</span>
                </label>
                <label className={styles.consentField}>
                  <input name="privacyAccepted" required type="checkbox" />
                  <span>Я принимаю политику обработки персональных данных</span>
                </label>
                <label className={styles.consentField}>
                  <input name="marketingConsent" type="checkbox" />
                  <span>Получать новости продукта и полезные материалы</span>
                </label>
              </div>
            ) : null}

            {error ? <FieldMessage>{error}</FieldMessage> : null}

            <AiButton disabled={isSubmitting} type="submit">
              {isSubmitting
                ? "Проверяем…"
                : mode === "login"
                  ? "Войти"
                  : "Зарегистрироваться"}
              {!isSubmitting ? <FiArrowRight aria-hidden="true" /> : null}
            </AiButton>
          </form>

          {providers.error ? (
            <p className={styles.subtleNotice}>
              Вход через внешние сервисы сейчас недоступен. Email-вход продолжает
              работать.
            </p>
          ) : null}

          <p className={styles.legalText}>
            {mode === "register"
              ? "Обязательные согласия фиксируются при создании аккаунта. Рассылку можно отключить в профиле."
              : "Входя, вы подтверждаете, что используете свой аккаунт."}
          </p>
        </AiCard>
      </div>
    </AiPage>
  );
}

function getTelegramAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    telegram_denied: "Вы отменили вход через Telegram.",
    telegram_invalid_callback: "Telegram вернул неполный ответ. Попробуйте ещё раз.",
    telegram_login_failed: "Не удалось войти через Telegram. Попробуйте ещё раз.",
    telegram_registration_consent_required:
      "Для создания аккаунта через Telegram нужно принять условия сервиса и политику обработки данных.",
    telegram_state_invalid: "Сессия входа через Telegram истекла. Начните вход заново.",
    telegram_token_invalid: "Не удалось подтвердить аккаунт Telegram. Начните вход заново.",
    telegram_unavailable: "Telegram временно недоступен. Попробуйте позже.",
  };

  return messages[code] || "Не удалось завершить вход через Telegram. Попробуйте ещё раз.";
}

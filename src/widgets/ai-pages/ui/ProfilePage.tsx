"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  FiBell,
  FiLogOut,
  FiMail,
  FiSave,
  FiSend,
  FiShield,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import { useRouter } from "next/navigation";

import { useAiSession } from "@/features/ai-session";
import {
  aiApiFetch,
  clearAiCsrfToken,
  type AiApiEnvelope,
  type AiUserProfile,
} from "@/shared/api/ai";

import { getAiErrorMessage, unwrapAiData, useAiResource } from "../model/api";
import {
  AccountGate,
  AiButton,
  AiCard,
  AiLinkButton,
  AiPage,
  AiPageHeader,
  AsyncState,
  FieldMessage,
} from "./AiUi";
import styles from "./AiPages.module.scss";

export function ProfilePage() {
  const router = useRouter();
  const { session, isLoading: isSessionLoading, refresh } = useAiSession();
  const profile = useAiResource<AiUserProfile>(session.authenticated ? "/profile" : null);
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState("ru-RU");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [productUpdates, setProductUpdates] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.data) return;
    const data = profile.data;
    const timer = window.setTimeout(() => {
      setDisplayName(data.displayName);
      setLanguage(data.language || "ru-RU");
      setMarketingConsent(Boolean(data.marketingConsent));
      setProductUpdates(Boolean(data.productUpdates));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [profile.data]);

  if (!isSessionLoading && !session.authenticated) {
    return (
      <AiPage>
        <AiPageHeader title="Профиль" description="Настройки аккаунта и уведомлений." />
        <AccountGate returnTo="/ai/profile" />
      </AiPage>
    );
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim()) {
      setError("Укажите имя");
      return;
    }

    setIsPending(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await aiApiFetch<AiUserProfile | AiApiEnvelope<AiUserProfile>>(
        "/profile",
        {
          method: "PATCH",
          body: {
            displayName: displayName.trim(),
            locale: language,
            marketingConsent,
            emailProductNews: productUpdates,
          },
        },
      );
      unwrapAiData(payload);
      await refresh();
      profile.reload();
      setNotice("Настройки сохранены");
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  async function logout() {
    setIsPending(true);
    setError(null);
    try {
      await aiApiFetch("/auth/logout", { method: "POST" });
      clearAiCsrfToken();
      await refresh();
      router.replace("/ai");
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AiPage>
      <AiPageHeader
        eyebrow="Личный кабинет"
        title="Профиль"
        description="Контактные данные, язык интерфейса и согласия на уведомления."
        actions={
          <AiButton disabled={isPending} variant="ghost" onClick={() => void logout()}>
            <FiLogOut aria-hidden="true" /> Выйти
          </AiButton>
        }
      />

      <AsyncState
        error={profile.error}
        isEmpty={!profile.data}
        isLoading={isSessionLoading || profile.isLoading}
        onRetry={profile.reload}
      >
        {profile.data ? (
          <div className={styles.profileGrid}>
            <AiCard className={styles.profileSummary}>
              <div className={styles.avatarLarge}>
                {profile.data.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user CDN URL
                  <img alt="" src={profile.data.avatarUrl} />
                ) : (
                  <FiUser aria-hidden="true" />
                )}
              </div>
              <h2>{profile.data.displayName}</h2>
              {profile.data.email ? <p><FiMail aria-hidden="true" /> {profile.data.email}</p> : null}
              {profile.data.telegramUsername ? <p><FiSend aria-hidden="true" /> @{profile.data.telegramUsername}</p> : null}
              <div className={styles.profileQuickLinks}>
                <AiLinkButton href="/ai/referrals" variant="secondary">
                  <FiUsers aria-hidden="true" /> Партнёрская программа
                </AiLinkButton>
                <AiLinkButton href="/ai/faq" variant="ghost">Помощь и FAQ</AiLinkButton>
              </div>
            </AiCard>

            <AiCard className={styles.profileFormCard}>
              <form className={styles.formStack} onSubmit={saveProfile}>
                <div className={styles.cardTitleRow}>
                  <div><h2>Настройки</h2><p>Изменения применятся ко всем устройствам.</p></div>
                  <FiShield aria-hidden="true" />
                </div>
                <label className={styles.field}>
                  <span>Имя</span>
                  <input maxLength={120} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </label>
                <label className={styles.field}>
                  <span>Язык интерфейса</span>
                  <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                    <option value="ru-RU">Русский</option>
                    <option value="en-US">English</option>
                  </select>
                </label>
                <div className={styles.preferenceGroup}>
                  <div className={styles.preferenceTitle}><FiBell aria-hidden="true" /><div><h3>Уведомления</h3><p>Вы можете изменить выбор в любой момент.</p></div></div>
                  <label className={styles.toggleField}>
                    <input checked={productUpdates} type="checkbox" onChange={(event) => setProductUpdates(event.target.checked)} />
                    <span aria-hidden="true" />
                    <strong>Статусы генераций и важные обновления сервиса</strong>
                  </label>
                  <label className={styles.toggleField}>
                    <input checked={marketingConsent} type="checkbox" onChange={(event) => setMarketingConsent(event.target.checked)} />
                    <span aria-hidden="true" />
                    <strong>Полезные подборки и новости Нейролюба</strong>
                  </label>
                </div>
                {notice ? <FieldMessage tone="success">{notice}</FieldMessage> : null}
                {error ? <FieldMessage>{error}</FieldMessage> : null}
                <AiButton disabled={isPending} type="submit">
                  <FiSave aria-hidden="true" /> {isPending ? "Сохраняем…" : "Сохранить"}
                </AiButton>
              </form>
            </AiCard>
          </div>
        ) : null}
      </AsyncState>
    </AiPage>
  );
}

"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { FiAlertCircle, FiArrowLeft, FiExternalLink, FiRefreshCw } from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import { useAiLocale } from "@/features/ai-locale";
import type { AiReceiptRegistrationStatus } from "@/shared/api/ai";

import { getStatusLabel, getStatusTone } from "../model/format";
import styles from "./AiPages.module.scss";

export function AiPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${styles.page} ${className}`}>{children}</div>;
}

export function AiPageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
}) {
  const { t } = useAiLocale();
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeading}>
        {backHref ? (
          <Link className={styles.backLink} href={backHref}>
            <FiArrowLeft aria-hidden="true" />
            {t("Назад", "Back")}
          </Link>
        ) : null}
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className={styles.lead}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.headerActions}>{actions}</div> : null}
    </header>
  );
}

export function AiCard({
  children,
  className = "",
  as: Tag = "section",
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: "article" | "section" | "div";
} & Omit<HTMLAttributes<HTMLElement>, "children" | "className">) {
  return <Tag {...props} className={`${styles.card} ${className}`}>{children}</Tag>;
}

export function AiButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      {...props}
      className={`${styles.button} ${styles[`button_${variant}`]} ${className}`}
    >
      {children}
    </button>
  );
}

export function AiLinkButton({
  children,
  href,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <Link
      className={`${styles.button} ${styles[`button_${variant}`]} ${className}`}
      href={href}
    >
      {children}
    </Link>
  );
}

export function AsyncState({
  isLoading,
  error,
  isEmpty = false,
  emptyTitle = "Пока ничего нет",
  emptyDescription,
  onRetry,
  children,
}: {
  isLoading: boolean;
  error: string | null;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children: ReactNode;
}) {
  const { t } = useAiLocale();
  const resolvedEmptyTitle = emptyTitle === "Пока ничего нет"
    ? t("Пока ничего нет", "Nothing here yet")
    : emptyTitle;
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label={t("Загрузка", "Loading")}
        className={styles.loadingState}
        role="status"
      >
        <span aria-hidden="true" className={styles.loadingSpinner} />
      </div>
    );
  }

  if (error) {
    return (
      <AiCard className={styles.stateCard}>
        <FiAlertCircle aria-hidden="true" className={styles.stateIconError} />
        <h2>{t("Не удалось загрузить данные", "Unable to load data")}</h2>
        <p aria-live="polite">{error}</p>
        {onRetry ? (
          <AiButton variant="secondary" onClick={onRetry}>
            <FiRefreshCw aria-hidden="true" />
            {t("Повторить", "Retry")}
          </AiButton>
        ) : null}
      </AiCard>
    );
  }

  if (isEmpty) {
    return (
      <AiCard className={styles.stateCard}>
        <div aria-hidden="true" className={styles.emptyOrb} />
        <h2>{resolvedEmptyTitle}</h2>
        {emptyDescription ? <p>{emptyDescription}</p> : null}
      </AiCard>
    );
  }

  return <>{children}</>;
}

export function StatusBadge({ status }: { status: string }) {
  const { locale } = useAiLocale();
  const tone = getStatusTone(status);

  return (
    <span className={`${styles.status} ${styles[`status_${tone}`]}`}>
      {getStatusLabel(status, locale)}
    </span>
  );
}

export function ReceiptState({
  status,
  url,
}: {
  status?: AiReceiptRegistrationStatus | null;
  url?: string | null;
}) {
  const { t } = useAiLocale();
  if (url) {
    return (
      <a className={styles.receiptState} href={url} rel="noreferrer" target="_blank">
        {t("Открыть чек", "Open receipt")} <FiExternalLink aria-hidden="true" />
      </a>
    );
  }

  const label =
    status === "succeeded"
      ? t("Чек отправлен", "Receipt sent")
      : status === "pending" || status === "unknown"
        ? t("Чек формируется", "Receipt is being prepared")
        : status === "canceled"
          ? t("Ошибка формирования чека", "Receipt generation failed")
          : status === "unsupported"
            ? t("Чек не поддерживается", "Receipts are not supported")
            : null;

  return label ? <span className={styles.receiptState}>{label}</span> : null;
}

export function FieldMessage({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success" | "notice";
}) {
  return (
    <p aria-live="polite" className={`${styles.fieldMessage} ${styles[`message_${tone}`]}`}>
      {children}
    </p>
  );
}

export function AccountGate({
  title = "Войдите в аккаунт",
  description = "Этот раздел хранит личные данные и доступен только после входа.",
  returnTo,
}: {
  title?: string;
  description?: string;
  returnTo: string;
}) {
  const { error, refresh } = useAiSession();
  const { t } = useAiLocale();
  const resolvedTitle = title === "Войдите в аккаунт" ? t("Войдите в аккаунт", "Sign in") : title;
  const resolvedDescription = description === "Этот раздел хранит личные данные и доступен только после входа."
    ? t("Этот раздел хранит личные данные и доступен только после входа.", "This section contains personal data and is only available after signing in.")
    : description;

  if (error) {
    return (
      <AsyncState
        error={error}
        isLoading={false}
        onRetry={() => void refresh()}
      >
        {null}
      </AsyncState>
    );
  }

  return (
    <AiCard className={styles.accountGate}>
      <div className={styles.emptyOrb} />
      <h2>{resolvedTitle}</h2>
      <p>{resolvedDescription}</p>
      <AiLinkButton href={`/ai/auth?returnTo=${encodeURIComponent(returnTo)}`}>
        {t("Войти или зарегистрироваться", "Sign in or register")}
      </AiLinkButton>
    </AiCard>
  );
}

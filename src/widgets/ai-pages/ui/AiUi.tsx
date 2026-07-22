import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FiAlertCircle, FiArrowLeft, FiExternalLink, FiRefreshCw } from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
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
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeading}>
        {backHref ? (
          <Link className={styles.backLink} href={backHref}>
            <FiArrowLeft aria-hidden="true" />
            Назад
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
}: {
  children: ReactNode;
  className?: string;
  as?: "article" | "section" | "div";
}) {
  return <Tag className={`${styles.card} ${className}`}>{children}</Tag>;
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
  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Загрузка" className={styles.skeletonGrid}>
        <span className={styles.skeleton} />
        <span className={styles.skeleton} />
        <span className={styles.skeleton} />
      </div>
    );
  }

  if (error) {
    return (
      <AiCard className={styles.stateCard}>
        <FiAlertCircle aria-hidden="true" className={styles.stateIconError} />
        <h2>Не удалось загрузить данные</h2>
        <p aria-live="polite">{error}</p>
        {onRetry ? (
          <AiButton variant="secondary" onClick={onRetry}>
            <FiRefreshCw aria-hidden="true" />
            Повторить
          </AiButton>
        ) : null}
      </AiCard>
    );
  }

  if (isEmpty) {
    return (
      <AiCard className={styles.stateCard}>
        <div aria-hidden="true" className={styles.emptyOrb} />
        <h2>{emptyTitle}</h2>
        {emptyDescription ? <p>{emptyDescription}</p> : null}
      </AiCard>
    );
  }

  return <>{children}</>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = getStatusTone(status);

  return (
    <span className={`${styles.status} ${styles[`status_${tone}`]}`}>
      {getStatusLabel(status)}
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
  if (url) {
    return (
      <a className={styles.receiptState} href={url} rel="noreferrer" target="_blank">
        Открыть чек <FiExternalLink aria-hidden="true" />
      </a>
    );
  }

  const label =
    status === "succeeded"
      ? "Чек отправлен"
      : status === "pending" || status === "unknown"
        ? "Чек формируется"
        : status === "canceled"
          ? "Ошибка формирования чека"
          : status === "unsupported"
            ? "Чек не поддерживается"
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
      <h2>{title}</h2>
      <p>{description}</p>
      <AiLinkButton href={`/ai/auth?returnTo=${encodeURIComponent(returnTo)}`}>
        Войти или зарегистрироваться
      </AiLinkButton>
    </AiCard>
  );
}

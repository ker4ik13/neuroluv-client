import Image from "next/image";
import type { ReactNode } from "react";

import styles from "./AuthorCard.module.scss";

type AuthorCardProps = {
  avatarUrl?: string | null;
  children?: ReactNode;
  className?: string;
  name: string;
  role: string;
};

export function AuthorCard({
  avatarUrl,
  children,
  className,
  name,
  role,
}: AuthorCardProps) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "Н";

  return (
    <section className={`${styles.card} ${className || ""}`}>
      <div className={styles.main}>
        <span aria-hidden="true" className={styles.avatar}>
          {avatarUrl ? (
            <Image alt="" fill sizes="64px" src={avatarUrl} />
          ) : (
            initial
          )}
        </span>
        <span className={styles.info}>
          <strong>{name}</strong>
          <span>{role}</span>
        </span>
      </div>

      {children && <div className={styles.extra}>{children}</div>}
    </section>
  );
}

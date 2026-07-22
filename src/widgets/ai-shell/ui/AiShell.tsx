"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiClock,
  FiCreditCard,
  FiHelpCircle,
  FiImage,
  FiPlus,
  FiUser,
  FiZap,
} from "react-icons/fi";
import { RiSparkling2Fill } from "react-icons/ri";

import type { NavigationLogo } from "@/entities/navigation";
import { AiSessionProvider, useAiSession } from "@/features/ai-session";
import {
  aiApiFetch,
  type AiNavigationItem,
  type AiNavigationResponse,
} from "@/shared/api/ai";
import {
  formatCreditNumber,
  formatCredits,
} from "@/shared/lib/formatCredits";
import { Container } from "@/shared/ui/container";
import { SiteHeaderLogo } from "@/shared/ui/site-header-logo";

import styles from "./AiShell.module.scss";

const EMERGENCY_NAVIGATION: AiNavigationItem[] = [
  { id: "create", label: "Создать", href: "/ai/create", icon: "create" },
  { id: "prompts", label: "Промпты", href: "/ai/prompts", icon: "prompts" },
  { id: "works", label: "Мои работы", href: "/ai/works", icon: "works" },
  { id: "history", label: "История", href: "/ai/history", icon: "history" },
  { id: "balance", label: "Баланс", href: "/ai/balance", icon: "balance" },
];

const DEFAULT_PROJECT_NAME = "Нейролюб Studio";

export function AiShell({
  children,
  logo,
}: {
  children: React.ReactNode;
  logo: NavigationLogo | null;
}) {
  return (
    <AiSessionProvider>
      <AiShellContent logo={logo}>{children}</AiShellContent>
    </AiSessionProvider>
  );
}

function AiShellContent({
  children,
  logo,
}: {
  children: React.ReactNode;
  logo: NavigationLogo | null;
}) {
  const pathname = usePathname();
  const { session, isLoading } = useAiSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [navigation, setNavigation] =
    useState<AiNavigationItem[]>(EMERGENCY_NAVIGATION);
  const [projectName, setProjectName] = useState(DEFAULT_PROJECT_NAME);

  useEffect(() => {
    let isMounted = true;

    aiApiFetch<AiNavigationResponse>("/catalog/navigation")
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setProjectName(normalizeProjectName(response.projectName));
        if (response.data.length > 0) {
          setNavigation(response.data);
        }
      })
      .catch(() => {
        // A small emergency navigation keeps the application usable during CMS outages.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsMenuOpen(false), 0);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const sortedNavigation = useMemo(
    () => [...navigation].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    [navigation],
  );
  const brandName = useMemo(() => splitProjectName(projectName), [projectName]);
  const isChatWorkspace = isGenerationChatPath(pathname);

  return (
    <div
      className={`${styles.app} ${isChatWorkspace ? styles.appChatWorkspace : ""}`}
    >
      <header className={styles.header}>
        <Container className={styles.headerContainer}>
          <div className={styles.headerInner}>
            <Link
              aria-label={`${brandName.full} — главная`}
              className={styles.brand}
              href="/ai"
              title={brandName.full}
            >
              <SiteHeaderLogo
                fallback={
                  <span aria-hidden="true" className={styles.brandMark}>
                    <RiSparkling2Fill />
                  </span>
                }
                logo={logo}
              />
              <span className={styles.brandText}>
                <span className={styles.brandPrimary}>{brandName.primary}</span>
                {brandName.secondary ? (
                  <span className={styles.brandAi}>{brandName.secondary}</span>
                ) : null}
              </span>
            </Link>

            <nav aria-label="Навигация AI" className={styles.desktopNav}>
              {sortedNavigation.map((item) => (
                <NavLink item={item} key={item.id} pathname={pathname} />
              ))}
            </nav>

            <div className={styles.account}>
              {session.authenticated && session.wallet ? (
                <Link
                  aria-label={`Баланс: ${formatCredits(session.wallet.availableCredits)}`}
                  className={styles.creditPill}
                  href="/ai/balance"
                >
                  <CreditBalance value={session.wallet.availableCredits} />
                </Link>
              ) : null}

              <Link
                aria-label={session.authenticated ? "Профиль" : "Войти"}
                className={styles.profileLink}
                href={session.authenticated ? "/ai/profile" : "/ai/auth"}
              >
                <FiUser aria-hidden="true" />
                <span>
                  {isLoading
                    ? "…"
                    : session.authenticated
                      ? session.user?.displayName || "Профиль"
                      : "Войти"}
                </span>
              </Link>

              <button
                aria-controls="ai-mobile-navigation"
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
                className={styles.menuButton}
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                <span className={styles.menuLine} />
                <span className={styles.menuLine} />
                <span className={styles.menuLine} />
              </button>
            </div>
          </div>

          <div
            className={`${styles.mobilePanel} ${isMenuOpen ? styles.mobilePanelOpen : ""}`}
            id="ai-mobile-navigation"
          >
            <nav aria-label="Мобильная навигация AI" className={styles.mobileNav}>
              {sortedNavigation.map((item) => (
                <NavLink item={item} key={item.id} pathname={pathname} />
              ))}
              <NavLink
                item={{ id: "faq", label: "FAQ", href: "/ai/faq", icon: "faq" }}
                pathname={pathname}
              />
            </nav>
          </div>
        </Container>
      </header>

      <main
        className={`${styles.main} ${isChatWorkspace ? styles.mainChatWorkspace : ""}`}
      >
        {children}
      </main>
    </div>
  );
}

function isGenerationChatPath(pathname: string): boolean {
  return (
    /^\/ai\/create\/(?:photo|text|video)$/.test(pathname) ||
    pathname === "/ai/tools/photo-to-prompt"
  );
}

function CreditBalance({ value }: { value: number }) {
  return (
    <>
      <FiZap aria-hidden="true" />
      <span className={styles.creditValue}>{formatCreditNumber(value)}</span>
    </>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: AiNavigationItem;
  pathname: string;
}) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/ai" && pathname.startsWith(`${item.href}/`));

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
      href={item.href}
    >
      <span aria-hidden="true" className={styles.navIcon}>
        {getNavigationIcon(item.icon)}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

function getNavigationIcon(icon?: string | null) {
  switch (icon) {
    case "create":
      return <FiPlus />;
    case "prompts":
      return <FiBookOpen />;
    case "works":
      return <FiImage />;
    case "history":
      return <FiClock />;
    case "balance":
      return <FiCreditCard />;
    case "faq":
      return <FiHelpCircle />;
    default:
      return <RiSparkling2Fill />;
  }
}

function normalizeProjectName(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") || DEFAULT_PROJECT_NAME;
}

function splitProjectName(value: string): {
  full: string;
  primary: string;
  secondary: string;
} {
  const full = normalizeProjectName(value);
  const [primary, ...secondary] = full.split(" ");

  return {
    full,
    primary,
    secondary: secondary.join(" "),
  };
}

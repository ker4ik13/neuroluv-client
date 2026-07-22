"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa";

import type {
  HeaderNavigation,
  NavigationItem,
  SocialLink,
} from "@/entities/navigation";
import { AppIcon } from "@/shared/ui/app-icon";
import { BrandIcon } from "@/shared/ui/brand-icon";
import { Container } from "@/shared/ui/container";
import { SiteHeaderLogo } from "@/shared/ui/site-header-logo";

import styles from "./Header.module.scss";

type HeaderViewProps = {
  navigation: HeaderNavigation;
};

export function HeaderView({ navigation }: HeaderViewProps) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setOpenDropdownId(null);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        headerRef.current &&
        !headerRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
        setOpenDropdownId(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMenuOpen]);

  function handleNavigate() {
    setIsMenuOpen(false);
    setOpenDropdownId(null);
  }

  return (
    <header className={styles.header}>
      <Container className={styles.container}>
        <div className={styles.inner} ref={headerRef}>
          <Link
            aria-label="На главную"
            className={styles.logo}
            href="/"
            onClick={handleNavigate}
          >
            <SiteHeaderLogo logo={navigation.logo} />
            <span className={styles.logoText}>{navigation.siteName}</span>
          </Link>

          <button
            aria-controls="site-navigation"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
            className={styles.burger}
            type="button"
            onClick={() => {
              setIsMenuOpen((value) => {
                if (value) {
                  setOpenDropdownId(null);
                }

                return !value;
              });
            }}
          >
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>

          <div
            className={`${styles.content} ${isMenuOpen ? styles.contentOpen : ""}`}
            id="site-navigation"
          >
            <nav aria-label="Основная навигация" className={styles.nav}>
              {navigation.items.map((item, index) => (
                <NavigationEntry
                  item={item}
                  key={`nav-${item.id}-${index}`}
                  pathname={pathname}
                  isMenuOpen={isMenuOpen}
                  isOpen={openDropdownId === item.id}
                  onClose={() =>
                    setOpenDropdownId((currentId) =>
                      currentId === item.id ? null : currentId,
                    )
                  }
                  onNavigate={handleNavigate}
                  onOpen={() => setOpenDropdownId(item.id)}
                  onToggle={() =>
                    setOpenDropdownId((currentId) =>
                      isMenuOpen && currentId === item.id ? null : item.id,
                    )
                  }
                />
              ))}
            </nav>

            {navigation.socialLinks.length > 0 && (
              <div aria-label="Социальные сети" className={styles.socials}>
                {navigation.socialLinks.map((link) => (
                  <SocialLinkEntry key={link.id} link={link} />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}

type NavigationEntryProps = {
  item: NavigationItem;
  pathname: string;
  isMenuOpen: boolean;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: () => void;
  onOpen: () => void;
  onToggle: () => void;
};

function NavigationEntry({
  item,
  pathname,
  isMenuOpen,
  isOpen,
  onClose,
  onNavigate,
  onOpen,
  onToggle,
}: NavigationEntryProps) {
  const isActive = isNavigationItemActive(item, pathname);

  if (item.children.length > 0) {
    return (
      <div
        className={`${styles.navDropdown} ${isOpen ? styles.dropdownOpen : ""}`}
        onBlur={(event) => {
          if (isMenuOpen) {
            return;
          }

          const nextTarget = event.relatedTarget;

          if (
            !(nextTarget instanceof Node) ||
            !event.currentTarget.contains(nextTarget)
          ) {
            onClose();
          }
        }}
        onFocus={(event) => {
          if (isMenuOpen) {
            return;
          }

          if (event.target instanceof HTMLButtonElement) {
            return;
          }

          onOpen();
        }}
        onPointerEnter={(event) => {
          if (isMenuOpen) {
            return;
          }

          if (event.pointerType === "touch") {
            return;
          }

          onOpen();
        }}
        onPointerLeave={(event) => {
          if (isMenuOpen || event.pointerType === "touch") {
            return;
          }

          onClose();
        }}
      >
        <div className={styles.navDropdownTrigger}>
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
            href={item.href}
            rel={item.target === "_blank" ? "noreferrer" : undefined}
            target={item.target}
            onClick={onNavigate}
          >
            <NavLinkContent item={item} />
          </Link>

          <button
            aria-expanded={isOpen}
            aria-label={`${isOpen ? "Закрыть" : "Открыть"} подразделы: ${item.label}`}
            className={styles.dropdownToggle}
            type="button"
            onClick={onToggle}
          >
            <FaChevronDown aria-hidden="true" className={styles.chevron} />
          </button>
        </div>

        <div className={styles.dropdownPanel}>
          {item.children.map((child, index) => {
            const isChildActive = isNavigationItemActive(child, pathname);

            return (
              <Link
                aria-current={isChildActive ? "page" : undefined}
                className={`${styles.dropdownLink} ${isChildActive ? styles.dropdownLinkActive : ""}`}
                href={child.href}
                key={`dropdown-${item.id}-${child.id}-${index}`}
                rel={child.target === "_blank" ? "noreferrer" : undefined}
                target={child.target}
                onClick={onNavigate}
              >
                <NavLinkContent item={child} />
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
      href={item.href}
      rel={item.target === "_blank" ? "noreferrer" : undefined}
      target={item.target}
      onClick={onNavigate}
    >
      <NavLinkContent item={item} />
    </Link>
  );
}

function isNavigationItemActive(
  item: NavigationItem,
  pathname: string,
): boolean {
  return (
    isPathActive(item.href, pathname) ||
    item.children.some((child) => isNavigationItemActive(child, pathname))
  );
}

function isPathActive(href: string, pathname: string) {
  if (!href || href.startsWith("http") || href.startsWith("#")) {
    return false;
  }

  const normalizedHref = normalizePath(href);
  const normalizedPathname = normalizePath(pathname);

  if (normalizedHref === "/") {
    return normalizedPathname === "/";
  }

  return (
    normalizedPathname === normalizedHref ||
    normalizedPathname.startsWith(`${normalizedHref}/`)
  );
}

function normalizePath(path: string) {
  const pathname = path.split(/[?#]/)[0] || "/";
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;

  return normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized;
}

function NavLinkContent({ item }: { item: NavigationItem }) {
  return (
    <>
      <AppIcon className={styles.navIcon} icon={item.icon} />
      <span>{item.label}</span>
    </>
  );
}

function SocialLinkEntry({ link }: { link: SocialLink }) {
  return (
    <a
      aria-label={link.title}
      className={styles.socialLink}
      href={link.url}
      rel="noreferrer"
      target="_blank"
      title={link.title}
    >
      <BrandIcon className={styles.socialIcon} platform={link.platform} />
    </a>
  );
}

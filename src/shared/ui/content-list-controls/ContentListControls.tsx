"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef } from "react";
import { AiOutlineSearch } from "react-icons/ai";
import { FaArrowDown, FaArrowRight, FaChevronDown } from "react-icons/fa";

import { Noindex } from "@/shared/ui/noindex";

import styles from "./ContentListControls.module.scss";

export type ContentListFilter = {
  id: string;
  label: string;
  href: string;
  isActive: boolean;
};

export type ContentListSortOption = {
  label: string;
  href: string;
  isActive: boolean;
  value: "fresh" | "old";
};

type ContentListControlsProps = {
  action: string;
  filters: ContentListFilter[];
  hasActiveExternalFilters?: boolean;
  hiddenInputs?: Record<string, string | null | undefined>;
  leadingLink?: {
    href: string;
    icon?: ReactNode;
    label: string;
  };
  resultLabel?: string;
  resetHref: string;
  searchDefaultValue?: string | null;
  searchLabel: string;
  searchPlaceholder: string;
  sortOptions: ContentListSortOption[];
};

export function ContentListControls({
  action,
  filters,
  hasActiveExternalFilters = false,
  hiddenInputs = {},
  leadingLink,
  resultLabel,
  resetHref,
  searchDefaultValue,
  searchLabel,
  searchPlaceholder,
  sortOptions,
}: ContentListControlsProps) {
  const sortSelectRef = useRef<HTMLDetailsElement>(null);
  const activeSort =
    sortOptions.find((option) => option.isActive) || sortOptions[0];
  const hasFilters = filters.length > 0;
  const hasActiveFilters =
    hasActiveExternalFilters ||
    Boolean(searchDefaultValue) ||
    Object.values(hiddenInputs).some(Boolean) ||
    filters.some((filter) => filter.isActive && filter.id !== "all");

  useEffect(() => {
    const closeSortSelect = () => {
      if (sortSelectRef.current) sortSelectRef.current.open = false;
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (
        sortSelectRef.current?.open &&
        event.target instanceof Node &&
        !sortSelectRef.current.contains(event.target)
      ) {
        closeSortSelect();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSortSelect();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <Noindex>
      <section className={styles.controls} data-nosnippet="true">
        <div className={styles.searchRow}>
          {leadingLink && (
            <Link className={styles.leadingLink} href={leadingLink.href}>
              {leadingLink.icon}
              {leadingLink.label}
            </Link>
          )}

          <form action={action} className={styles.searchForm}>
            <span className={styles.searchField}>
              <AiOutlineSearch aria-hidden="true" className={styles.searchIcon} />
              <input
                aria-label={searchLabel}
                defaultValue={searchDefaultValue || ""}
                name="q"
                placeholder={searchPlaceholder}
                type="search"
              />
            </span>

            {Object.entries(hiddenInputs).map(([name, value]) =>
              value ? (
                <input key={name} name={name} type="hidden" value={value} />
              ) : null,
            )}

            <button type="submit">
              Найти
              <FaArrowRight aria-hidden="true" />
            </button>
          </form>
        </div>

        {hasFilters && (
          <div className={styles.filters} aria-label="Фильтры" role="list">
            {filters.map((filter) => (
              <Link
                className={`${styles.filterButton} ${
                  filter.isActive ? styles.filterButtonActive : ""
                }`}
                href={filter.href}
                key={filter.id}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        )}

        <div className={styles.metaRow}>
          {resultLabel && <p className={styles.resultLabel}>{resultLabel}</p>}

          <div className={styles.actions}>
            <details className={styles.sortSelect} ref={sortSelectRef}>
              <summary>
                <span>
                  Сортировка: {activeSort.label}
                  <FaArrowDown
                    aria-hidden="true"
                    className={`${styles.sortDirection} ${
                      activeSort.value === "old" ? styles.sortDirectionReversed : ""
                    }`}
                  />
                </span>
                <FaChevronDown aria-hidden="true" className={styles.sortChevron} />
              </summary>

              <div className={styles.sortMenu}>
                {sortOptions.map((option) => (
                  <Link
                    aria-current={option.isActive ? "page" : undefined}
                    className={`${styles.sortOption} ${
                      option.isActive ? styles.sortOptionActive : ""
                    }`}
                    href={option.href}
                    key={option.value}
                    onClick={() => {
                      if (sortSelectRef.current) {
                        sortSelectRef.current.open = false;
                      }
                    }}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </details>

            {hasActiveFilters && (
              <Link className={styles.resetButton} href={resetHref}>
                Сбросить фильтры
              </Link>
            )}
          </div>
        </div>
      </section>
    </Noindex>
  );
}

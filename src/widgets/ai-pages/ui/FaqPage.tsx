"use client";

import { useMemo, useState } from "react";
import { FiHelpCircle, FiMessageCircle, FiSearch } from "react-icons/fi";

import { type AiFaqItem } from "@/shared/api/ai";
import { useAiLocale } from "@/features/ai-locale";

import { useAiResource } from "../model/api";
import { AiCard, AiLinkButton, AiPage, AiPageHeader, AsyncState } from "./AiUi";
import styles from "./AiPages.module.scss";

export function FaqPage() {
  const { locale, t } = useAiLocale();
  const faq = useAiResource<AiFaqItem[]>("/catalog/faq");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const categories = useMemo(
    () =>
      Array.from(
        new Set((faq.data || []).map((item) => item.category).filter(Boolean)),
      ) as string[],
    [faq.data],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    return (faq.data || [])
      .filter((item) => !category || item.category === category)
      .filter(
        (item) =>
          !query ||
          item.question.toLocaleLowerCase(locale).includes(query) ||
          item.answer.toLocaleLowerCase(locale).includes(query),
      )
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }, [category, faq.data, locale, search]);

  return (
    <AiPage>
      <AiPageHeader title={t("Частые вопросы", "Frequently asked questions")} />

      <AiCard className={styles.faqSearchCard}>
        <label className={styles.searchField}>
          <FiSearch aria-hidden="true" />
          <span className={styles.visuallyHidden}>{t("Поиск по вопросам", "Search questions")}</span>
          <input
            placeholder={t("Например: когда вернутся кредиты", "For example: when are credits returned")}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {categories.length ? (
          <div className={styles.categoryTabs} aria-label={t("Категории вопросов", "Question categories")}>
            <button
              aria-pressed={!category}
              className={!category ? styles.categoryActive : ""}
              type="button"
              onClick={() => setCategory("")}
            >
              {t("Все", "All")}
            </button>
            {categories.map((item) => (
              <button
                aria-pressed={category === item}
                className={category === item ? styles.categoryActive : ""}
                key={item}
                type="button"
                onClick={() => setCategory(item)}
              >
                {faqCategoryLabel(item, t)}
              </button>
            ))}
          </div>
        ) : null}
      </AiCard>

      <AsyncState
        error={faq.error}
        isEmpty={!filtered.length}
        isLoading={faq.isLoading}
        emptyTitle={faq.data?.length ? t("По вашему запросу ничего нет", "No matches found") : t("Вопросы пока не опубликованы", "No questions have been published yet")}
        emptyDescription={faq.data?.length ? t("Попробуйте сократить запрос или выбрать другую категорию.", "Try shortening your query or choosing another category.") : t("Раздел появится после публикации материалов в админке.", "This section will appear after content is published in the admin panel.")}
        onRetry={faq.reload}
      >
        <div className={styles.faqList}>
          {filtered.map((item) => (
            <details className={styles.faqItem} key={item.id}>
              <summary>
                <span className={styles.faqIcon}><FiHelpCircle aria-hidden="true" /></span>
                <span>{item.question}</span>
                <i aria-hidden="true" />
              </summary>
              <div className={styles.faqAnswer}>
                {item.answer.split("\n").map((paragraph, index) => (
                  <p key={`${item.id}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </AsyncState>

      <AiCard className={styles.supportCard}>
        <span><FiMessageCircle aria-hidden="true" /></span>
        <div><h2>{t("Не нашли ответ?", "Didn't find an answer?")}</h2><p>{t("Напишите команде поддержки и приложите ID запуска или платежа.", "Contact support and include the run or payment ID.")}</p></div>
        <AiLinkButton href="https://t.me/neuroluv" variant="secondary">{t("Написать в Telegram", "Message us on Telegram")}</AiLinkButton>
      </AiCard>
    </AiPage>
  );
}

function faqCategoryLabel(
  category: string,
  t: (russian: string, english: string) => string,
): string {
  const labels: Record<string, [string, string]> = {
    generation: ["Генерации", "Generation"],
    privacy: ["Приватность", "Privacy"],
    storage: ["Хранение", "Storage"],
    billing: ["Оплата", "Billing"],
    support: ["Поддержка", "Support"],
  };
  const copy = labels[category];
  return copy ? t(copy[0], copy[1]) : category;
}

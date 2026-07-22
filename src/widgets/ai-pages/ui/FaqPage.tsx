"use client";

import { useMemo, useState } from "react";
import { FiHelpCircle, FiMessageCircle, FiSearch } from "react-icons/fi";

import { type AiFaqItem } from "@/shared/api/ai";

import { useAiResource } from "../model/api";
import { AiCard, AiLinkButton, AiPage, AiPageHeader, AsyncState } from "./AiUi";
import styles from "./AiPages.module.scss";

export function FaqPage() {
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
    const query = search.trim().toLocaleLowerCase("ru-RU");
    return (faq.data || [])
      .filter((item) => !category || item.category === category)
      .filter(
        (item) =>
          !query ||
          item.question.toLocaleLowerCase("ru-RU").includes(query) ||
          item.answer.toLocaleLowerCase("ru-RU").includes(query),
      )
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }, [category, faq.data, search]);

  return (
    <AiPage>
      <AiPageHeader
        eyebrow="Помощь"
        title="Частые вопросы"
        description="Ответы публикуются командой Нейролюба и обновляются без релиза приложения."
      />

      <AiCard className={styles.faqSearchCard}>
        <label className={styles.searchField}>
          <FiSearch aria-hidden="true" />
          <span className={styles.visuallyHidden}>Поиск по вопросам</span>
          <input
            placeholder="Например: когда вернутся кредиты"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {categories.length ? (
          <div className={styles.categoryTabs} aria-label="Категории вопросов">
            <button
              aria-pressed={!category}
              className={!category ? styles.categoryActive : ""}
              type="button"
              onClick={() => setCategory("")}
            >
              Все
            </button>
            {categories.map((item) => (
              <button
                aria-pressed={category === item}
                className={category === item ? styles.categoryActive : ""}
                key={item}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </AiCard>

      <AsyncState
        error={faq.error}
        isEmpty={!filtered.length}
        isLoading={faq.isLoading}
        emptyTitle={faq.data?.length ? "По вашему запросу ничего нет" : "Вопросы пока не опубликованы"}
        emptyDescription={faq.data?.length ? "Попробуйте сократить запрос или выбрать другую категорию." : "Раздел появится после публикации материалов в админке."}
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
        <div><h2>Не нашли ответ?</h2><p>Напишите команде поддержки и приложите ID запуска или платежа.</p></div>
        <AiLinkButton href="https://t.me/neuroluv" variant="secondary">Написать в Telegram</AiLinkButton>
      </AiCard>
    </AiPage>
  );
}


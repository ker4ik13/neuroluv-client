"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  FiBookmark,
  FiCalendar,
  FiGrid,
  FiImage,
  FiList,
  FiPlus,
  FiSearch,
} from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import {
  type AiPage as AiPageData,
  type AiPublicModel,
  type AiWorkSummary,
} from "@/shared/api/ai";

import { toQueryString, useAiResource } from "../model/api";
import { formatDate } from "../model/format";
import { writeLocalJson } from "../model/storage";
import {
  AccountGate,
  AiButton,
  AiLinkButton,
  AiPage,
  AiPageHeader,
  AsyncState,
  StatusBadge,
} from "./AiUi";
import styles from "./AiPages.module.scss";

type View = "grid" | "list";
type WorkModality = "" | "image" | "video";

export function WorksPage({
  initialSearchParams = {},
}: {
  initialSearchParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useAiSession();
  const [search, setSearch] = useState(initialSearchParams.search || "");
  const [modality, setModality] = useState<WorkModality>(
    normalizeWorkModality(initialSearchParams.modality),
  );
  const [status, setStatus] = useState(initialSearchParams.status || "");
  const [modelId, setModelId] = useState(initialSearchParams.model || "");
  const [favorite, setFavorite] = useState(initialSearchParams.favorite === "true");
  const [page, setPage] = useState(Math.max(1, Number(initialSearchParams.page) || 1));
  const [view, setView] = useState<View>("grid");

  const query = useMemo(
    () =>
      toQueryString({
        search,
        modality,
        status,
        modelId,
        favorite: favorite ? "true" : "",
        page,
        pageSize: 12,
      }),
    [favorite, modality, modelId, page, search, status],
  );
  const works = useAiResource<AiPageData<AiWorkSummary>>(
    session.authenticated ? `/works${query}` : null,
  );
  const models = useAiResource<AiPublicModel[]>("/catalog/models");

  if (!isSessionLoading && !session.authenticated) {
    return (
      <AiPage>
        <AiPageHeader title="Мои работы" description="Личная библиотека результатов генераций." />
        <AccountGate returnTo="/ai/works" />
      </AiPage>
    );
  }

  function syncQuery(next: {
    search?: string;
    modality?: WorkModality;
    status?: string;
    modelId?: string;
    favorite?: boolean;
    page?: number;
  }) {
    const values = {
      search: next.search ?? search,
      modality: next.modality ?? modality,
      status: next.status ?? status,
      modelId: next.modelId ?? modelId,
      favorite: next.favorite ?? favorite,
      page: next.page ?? page,
    };
    setSearch(values.search);
    setModality(normalizeWorkModality(values.modality));
    setStatus(values.status);
    setModelId(values.modelId);
    setFavorite(values.favorite);
    setPage(values.page);
    router.replace(
      `/ai/works${toQueryString({
        search: values.search,
        modality: values.modality,
        status: values.status,
        model: values.modelId,
        favorite: values.favorite ? "true" : "",
        page: values.page > 1 ? values.page : undefined,
      })}`,
      { scroll: false },
    );
  }

  function setViewMode(next: View) {
    setView(next);
    writeLocalJson("neuroluv-ai:works-view", next);
  }

  return (
    <AiPage>
      <AiPageHeader
        eyebrow="Личная библиотека"
        title="Мои работы"
        description="Все сохранённые результаты генераций. По умолчанию они видны только вам."
        actions={
          <AiLinkButton href="/ai/create">
            <FiPlus aria-hidden="true" />
            Создать
          </AiLinkButton>
        }
      />

      <div className={styles.worksToolbar}>
        <label className={styles.searchField}>
          <FiSearch aria-hidden="true" />
          <span className={styles.visuallyHidden}>Поиск по работам</span>
          <input
            placeholder="Найти работу"
            type="search"
            value={search}
            onChange={(event) => syncQuery({ search: event.target.value, page: 1 })}
          />
        </label>
        <div className={styles.viewSwitcher} aria-label="Вид списка">
          <button
            aria-label="Сетка"
            aria-pressed={view === "grid"}
            type="button"
            onClick={() => setViewMode("grid")}
          >
            <FiGrid aria-hidden="true" />
          </button>
          <button
            aria-label="Список"
            aria-pressed={view === "list"}
            type="button"
            onClick={() => setViewMode("list")}
          >
            <FiList aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={styles.filterStrip}>
        <select
          aria-label="Тип работы"
          value={modality}
          onChange={(event) =>
            syncQuery({ modality: normalizeWorkModality(event.target.value), page: 1 })
          }
        >
          <option value="">Все типы</option>
          <option value="image">Изображения</option>
          <option value="video">Видео</option>
        </select>
        <select
          aria-label="Статус работы"
          value={status}
          onChange={(event) => syncQuery({ status: event.target.value, page: 1 })}
        >
          <option value="">Любой статус</option>
          <option value="succeeded">Готово</option>
          <option value="partially_succeeded">Частично</option>
          <option value="expired">Файл удалён</option>
        </select>
        <select
          aria-label="Модель"
          disabled={models.isLoading || Boolean(models.error)}
          value={modelId}
          onChange={(event) => syncQuery({ modelId: event.target.value, page: 1 })}
        >
          <option value="">Все модели</option>
          {models.data
            ?.filter((model) => model.modality === "image" || model.modality === "video")
            .map((model) => (
            <option key={model.id} value={model.id}>{model.name}</option>
            ))}
        </select>
        <label className={styles.filterCheckbox}>
          <input
            checked={favorite}
            type="checkbox"
            onChange={(event) => syncQuery({ favorite: event.target.checked, page: 1 })}
          />
          <FiBookmark aria-hidden="true" />
          Избранные
        </label>
      </div>

      <AsyncState
        error={works.error}
        isEmpty={!works.data?.data.length}
        isLoading={isSessionLoading || works.isLoading}
        emptyTitle="Здесь появятся ваши работы"
        emptyDescription="Запустите первую генерацию и сохраните понравившийся результат."
        onRetry={works.reload}
      >
        <div className={view === "grid" ? styles.worksGrid : styles.worksList}>
          {works.data?.data.map((work) => (
            <Link className={styles.workCard} href={`/ai/works/${work.id}`} key={work.id}>
              <div className={styles.workMedia}>
                {work.previewUrl && work.status !== "expired" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed/CDN URL
                  <img alt="" loading="lazy" src={work.previewUrl} />
                ) : (
                  <span className={styles.mediaPlaceholder}>
                    <FiImage aria-hidden="true" />
                    {work.status === "expired" ? <small>Файл удалён по сроку хранения</small> : null}
                  </span>
                )}
                {work.favorite ? <FiBookmark aria-label="В избранном" className={styles.favoriteMark} fill="currentColor" /> : null}
              </div>
              <div className={styles.workBody}>
                <div>
                  <h2>{work.title}</h2>
                  <span className={styles.workDate}>
                    <FiCalendar aria-hidden="true" />
                    {formatDate(work.createdAt)}
                  </span>
                </div>
                <StatusBadge status={work.status} />
              </div>
            </Link>
          ))}
        </div>

        {works.data && works.data.total > works.data.pageSize ? (
          <nav aria-label="Страницы работ" className={styles.pagination}>
            <AiButton disabled={page <= 1} variant="secondary" onClick={() => syncQuery({ page: page - 1 })}>Назад</AiButton>
            <span>Страница {works.data.page}</span>
            <AiButton disabled={!works.data.hasMore} variant="secondary" onClick={() => syncQuery({ page: page + 1 })}>Дальше</AiButton>
          </nav>
        ) : null}
      </AsyncState>
    </AiPage>
  );
}

function normalizeWorkModality(value: string | undefined): WorkModality {
  return value === "image" || value === "video" ? value : "";
}

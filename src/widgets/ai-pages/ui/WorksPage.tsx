"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiBookmark,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiGrid,
  FiImage,
  FiList,
  FiPlus,
  FiSearch,
} from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import { useAiLocale } from "@/features/ai-locale";
import {
  type AiPage as AiPageData,
  type AiPublicModel,
  type AiRunSummary,
  type AiWorkSummary,
} from "@/shared/api/ai";

import { toQueryString, useAiResource } from "../model/api";
import { formatDate } from "../model/format";
import { writeLocalJson } from "../model/storage";
import { useAdaptivePolling } from "../model/useAdaptivePolling";
import { useAiLiveSync } from "../model/useAiLiveSync";
import {
  AccountGate,
  AiLinkButton,
  AiPage,
  AiPageHeader,
  AsyncState,
  StatusBadge,
} from "./AiUi";
import { AiSelect } from "./AiSelect";
import { AiModelLogo } from "./AiModelLogo";
import styles from "./AiPages.module.scss";

type View = "grid" | "list";
type WorkModality = "" | "image" | "video";

export function WorksPage({
  initialSearchParams = {},
}: {
  initialSearchParams?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const { locale, t } = useAiLocale();
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
    null,
    { merge: mergeWorkPages },
  );
  const activeRuns = useAiResource<AiPageData<AiRunSummary>>(
    session.authenticated ? "/runs?status=active&page=1&pageSize=100" : null,
  );
  const models = useAiResource<AiPublicModel[]>("/catalog/models");
  const modelLogos = useMemo(
    () => new Map((models.data || []).map((model) => [model.id, model.logoUrl])),
    [models.data],
  );
  const visibleActiveRuns = useMemo(() => {
    if (page !== 1 || favorite) return [];

    const normalizedSearch = search.trim().toLocaleLowerCase(locale);
    return (activeRuns.data?.data || []).filter((run) => {
      if (run.modality !== "image" && run.modality !== "video") return false;
      if (modality && run.modality !== modality) return false;
      if (status && run.status !== status) return false;
      if (modelId && run.modelId !== modelId) return false;
      if (
        normalizedSearch &&
        !`${run.prompt || ""} ${run.title} ${run.modelName}`
          .toLocaleLowerCase(locale)
          .includes(normalizedSearch)
      ) {
        return false;
      }
      return true;
    });
  }, [
    activeRuns.data?.data,
    favorite,
    locale,
    modality,
    modelId,
    page,
    search,
    status,
  ]);
  const hasActiveGeneration = Boolean(activeRuns.data?.data.length);

  useAdaptivePolling({
    enabled: session.authenticated,
    hasActiveWork: hasActiveGeneration,
    onPoll: async () => {
      const previousRunIds = new Set(
        (activeRuns.data?.data || []).map((run) => run.id),
      );
      const next = await activeRuns.refresh();
      const generationFinished = Boolean(
        next &&
        [...previousRunIds].some(
          (runId) => !next.data.some((run) => run.id === runId),
        ),
      );
      if (generationFinished) await works.refresh();
    },
  });
  useAiLiveSync({
    enabled: session.authenticated,
    onMessage: (message) => {
      void activeRuns.refresh();
      if (message.reason === "terminal") void works.refresh();
    },
  });

  if (!isSessionLoading && !session.authenticated) {
    return (
      <AiPage>
        <AiPageHeader title={t("Мои работы", "My works")} />
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
        title={t("Мои работы", "My works")}
        actions={
          <AiLinkButton href="/ai">
            <FiPlus aria-hidden="true" />
            {t("Создать", "Create")}
          </AiLinkButton>
        }
      />

      <div className={styles.worksToolbar}>
        <label className={styles.searchField}>
          <FiSearch aria-hidden="true" />
          <span className={styles.visuallyHidden}>{t("Поиск по работам", "Search works")}</span>
          <input
            placeholder={t("Найти работу", "Find a work")}
            type="search"
            value={search}
            onChange={(event) => syncQuery({ search: event.target.value, page: 1 })}
          />
        </label>
        <div className={styles.viewSwitcher} aria-label={t("Вид списка", "List view")}>
          <button
            aria-label={t("Сетка", "Grid")}
            aria-pressed={view === "grid"}
            type="button"
            onClick={() => setViewMode("grid")}
          >
            <FiGrid aria-hidden="true" />
          </button>
          <button
            aria-label={t("Список", "List")}
            aria-pressed={view === "list"}
            type="button"
            onClick={() => setViewMode("list")}
          >
            <FiList aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={styles.filterStrip}>
        <AiSelect
          compact
          labelVisuallyHidden
          id="works-modality"
          label={t("Тип работы", "Work type")}
          options={[
            { value: "", label: t("Все типы", "All types") },
            { value: "image", label: t("Изображения", "Images") },
            { value: "video", label: t("Видео", "Video") },
          ]}
          value={modality}
          onChange={(value) =>
            syncQuery({ modality: normalizeWorkModality(value), page: 1 })
          }
        />
        <AiSelect
          compact
          labelVisuallyHidden
          id="works-status"
          label={t("Статус работы", "Work status")}
          options={[
            { value: "", label: t("Любой статус", "Any status") },
            { value: "queued", label: t("В очереди", "Queued") },
            { value: "processing", label: t("В процессе", "Processing") },
            { value: "succeeded", label: t("Готово", "Ready") },
            { value: "partially_succeeded", label: t("Частично", "Partial") },
            { value: "expired", label: t("Файл удалён", "File deleted") },
          ]}
          value={status}
          onChange={(value) => syncQuery({ status: value, page: 1 })}
        />
        <AiSelect
          compact
          labelVisuallyHidden
          id="works-model"
          label={t("Модель", "Model")}
          disabled={models.isLoading || Boolean(models.error)}
          options={[
            { value: "", label: t("Все модели", "All models") },
            ...(models.data || [])
              .filter((model) => model.modality === "image" || model.modality === "video")
              .map((model) => ({
                value: model.id,
                label: model.name,
                visual: <AiModelLogo label={model.name} logoUrl={model.logoUrl} />,
              })),
          ]}
          value={modelId}
          onChange={(value) => syncQuery({ modelId: value, page: 1 })}
        />
        <label className={styles.filterCheckbox}>
          <input
            checked={favorite}
            type="checkbox"
            onChange={(event) => syncQuery({ favorite: event.target.checked, page: 1 })}
          />
          <FiBookmark aria-hidden="true" />
          {t("Избранные", "Favorites")}
        </label>
      </div>

      <AsyncState
        error={works.error}
        isEmpty={!works.data?.data.length && !visibleActiveRuns.length}
        isLoading={
          isSessionLoading ||
          works.isLoading ||
          (!activeRuns.data && activeRuns.isLoading)
        }
        emptyTitle={t("Здесь появятся ваши работы", "Your works will appear here")}
        emptyDescription={t("Запустите первую генерацию и сохраните понравившийся результат.", "Start your first generation and save the result you like.")}
        onRetry={works.reload}
      >
        <div className={view === "grid" ? styles.worksGrid : styles.worksList}>
          {visibleActiveRuns.map((run) => (
            <article
              aria-label={`${run.modelName}: ${t("идёт генерация", "generation in progress")}`}
              className={`${styles.workCard} ${styles.workCardPending}`}
              key={`run-${run.id}`}
            >
              <div className={styles.workMedia}>
                <div className={styles.workGenerating} role="status">
                  <span aria-hidden="true" className={styles.workGeneratingAura} />
                  <AiModelLogo
                    label={run.modelName}
                    logoUrl={run.modelId ? modelLogos.get(run.modelId) : undefined}
                    size="medium"
                  />
                  <span className={styles.workGeneratingDots} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <small>{t("Создаём результат", "Creating result")}</small>
                </div>
              </div>
              <div className={styles.workBody}>
                <div>
                  <h2>{workInProgressTitle(run, t)}</h2>
                  <span className={styles.workModel}>
                    <AiModelLogo
                      label={run.modelName}
                      logoUrl={run.modelId ? modelLogos.get(run.modelId) : undefined}
                    />
                    <span>{run.modelName}</span>
                  </span>
                  <span className={styles.workDate}>
                    <FiCalendar aria-hidden="true" />
                    {formatDate(run.createdAt, false, locale)}
                  </span>
                </div>
                <StatusBadge status={run.status} />
              </div>
            </article>
          ))}
          {works.data?.data.map((work) => (
            <Link className={styles.workCard} href={`/ai/works/${work.id}`} key={work.id}>
              <div className={styles.workMedia}>
                {work.previewUrl && work.status !== "expired" ? (
                  work.modality === "video" ? (
                    <WorkVideoPreview
                      poster={work.outputUrl && work.previewUrl !== work.outputUrl ? work.previewUrl : null}
                      src={work.outputUrl || work.previewUrl}
                      title={work.title}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- signed/CDN URL
                    <img alt="" loading="lazy" src={work.previewUrl} />
                  )
                ) : (
                  <span className={styles.mediaPlaceholder}>
                    <FiImage aria-hidden="true" />
                    {work.status === "expired" ? <small>{t("Файл удалён по сроку хранения", "File deleted after its retention period")}</small> : null}
                  </span>
                )}
                {work.favorite ? <FiBookmark aria-label={t("В избранном", "Favorite")} className={styles.favoriteMark} fill="currentColor" /> : null}
              </div>
              <div className={styles.workBody}>
                <div>
                  <h2>{work.title}</h2>
                  {work.model ? (
                    <span className={styles.workModel}>
                      <AiModelLogo
                        label={work.model.name}
                        logoUrl={modelLogos.get(work.model.id)}
                      />
                      <span>{work.model.name}</span>
                    </span>
                  ) : null}
                  <span className={styles.workDate}>
                    <FiCalendar aria-hidden="true" />
                    {formatDate(work.createdAt, false, locale)}
                  </span>
                </div>
                <StatusBadge status={work.status} />
              </div>
            </Link>
          ))}
        </div>

        {works.data && works.data.total > works.data.pageSize ? (
          <nav aria-label={t("Страницы работ", "Work pages")} className={styles.pagination}>
            <button
              aria-label={t("Предыдущая страница", "Previous page")}
              className={styles.paginationArrow}
              disabled={page <= 1}
              type="button"
              onClick={() => syncQuery({ page: page - 1 })}
            >
              <FiChevronLeft aria-hidden="true" />
            </button>
            <div className={styles.paginationPages}>
              {createPaginationItems(
                works.data.page,
                Math.ceil(works.data.total / works.data.pageSize),
              ).map((item) =>
                typeof item === "number" ? (
                  <button
                    aria-current={item === works.data?.page ? "page" : undefined}
                    aria-label={`${t("Страница", "Page")} ${item}`}
                    className={styles.paginationPage}
                    key={item}
                    type="button"
                    onClick={() => syncQuery({ page: item })}
                  >
                    {item}
                  </button>
                ) : (
                  <span aria-hidden="true" className={styles.paginationEllipsis} key={item}>
                    …
                  </span>
                ),
              )}
            </div>
            <button
              aria-label={t("Следующая страница", "Next page")}
              className={styles.paginationArrow}
              disabled={!works.data.hasMore}
              type="button"
              onClick={() => syncQuery({ page: page + 1 })}
            >
              <FiChevronRight aria-hidden="true" />
            </button>
          </nav>
        ) : null}
      </AsyncState>
    </AiPage>
  );
}

function workInProgressTitle(
  run: AiRunSummary,
  t: (russian: string, english: string) => string,
): string {
  const prompt = run.prompt?.replace(/\s+/g, " ").trim();
  return prompt || t("Новая генерация", "New generation");
}

function mergeWorkPages(
  current: AiPageData<AiWorkSummary> | null,
  incoming: AiPageData<AiWorkSummary>,
): AiPageData<AiWorkSummary> {
  if (!current) return incoming;
  const currentById = new Map(current.data.map((work) => [work.id, work]));

  return {
    ...incoming,
    data: incoming.data.map((work) => {
      const previous = currentById.get(work.id);
      if (!previous) return work;
      return {
        ...work,
        previewUrl: previous.previewUrl || work.previewUrl,
        outputUrl: previous.outputUrl || work.outputUrl,
      };
    }),
  };
}

function WorkVideoPreview({
  poster,
  src,
  title,
}: {
  poster?: string | null;
  src: string;
  title: string;
}) {
  const { t } = useAiLocale();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.65) {
          video.muted = true;
          void video.play().catch(() => undefined);
        } else {
          video.pause();
          resetVideoPreview(video);
        }
      },
      { threshold: [0, 0.65, 1] },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      aria-label={`${t("Видео", "Video")} «${title}»`}
      loop
      muted
      playsInline
      poster={poster || undefined}
      preload="metadata"
      ref={videoRef}
      src={withFirstFrameFragment(src)}
      onPointerEnter={(event) => {
        if (window.matchMedia("(hover: hover)").matches) {
          event.currentTarget.muted = true;
          void event.currentTarget.play().catch(() => undefined);
        }
      }}
      onPointerLeave={(event) => {
        if (window.matchMedia("(hover: hover)").matches) {
          event.currentTarget.pause();
          resetVideoPreview(event.currentTarget);
        }
      }}
    />
  );
}

function withFirstFrameFragment(url: string): string {
  return `${url.split("#", 1)[0]}#t=0.001`;
}

function resetVideoPreview(video: HTMLVideoElement): void {
  try {
    video.currentTime = 0.001;
  } catch {
    // Metadata can still be loading; the media fragment will render the first frame.
  }
}

function normalizeWorkModality(value: string | undefined): WorkModality {
  return value === "image" || value === "video" ? value : "";
}

type PaginationGap = "start-gap" | "end-gap";

function createPaginationItems(page: number, totalPages: number): Array<number | PaginationGap> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (page <= 4) {
    return [1, 2, 3, 4, 5, "end-gap", totalPages];
  }
  if (page >= totalPages - 3) {
    return [
      1,
      "start-gap",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [1, "start-gap", page - 1, page, page + 1, "end-gap", totalPages];
}

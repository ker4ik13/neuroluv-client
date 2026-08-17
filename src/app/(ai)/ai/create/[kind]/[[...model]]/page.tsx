import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { Page } from "@/entities/page";
import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPageSeoByPath } from "@/shared/api/directus/seo";
import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { buildBreadcrumbJsonLd, buildPageJsonLd } from "@/shared/lib/seo/json-ld";
import { JsonLd } from "@/shared/ui/json-ld";
import { PageBlocks } from "@/widgets/page-blocks";

import styles from "./page.module.scss";

type RouteKind = "photo" | "text" | "video";

type PageProps = {
  params: Promise<{
    kind: string;
    model?: string[];
  }>;
};

const GENERATION_FALLBACKS: Record<
  RouteKind,
  { title: string; description: string; heading: string }
> = {
  photo: {
    title: "Нейросеть для изображений — создать фото онлайн | Нейролюб",
    description:
      "Создавайте и редактируйте изображения по тексту или референсу в популярных нейросетях в одном интерфейсе.",
    heading: "Создать изображение нейросетью онлайн",
  },
  text: {
    title: "Нейросеть для текста онлайн — написать текст с ИИ | Нейролюб",
    description:
      "Создавайте, редактируйте, сокращайте и анализируйте тексты в популярных нейросетях в одном интерфейсе.",
    heading: "Нейросеть для написания и обработки текста онлайн",
  },
  video: {
    title: "Нейросеть для генерации видео — создать видео онлайн | Нейролюб",
    description:
      "Создавайте видео по тексту или изображению в популярных AI-моделях в одном интерфейсе.",
    heading: "Создать видео нейросетью онлайн",
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const route = await resolveRoute(params);
  const fallback = GENERATION_FALLBACKS[route.kind];
  const pageSeo = await getPageSeoByPath(route.path);

  return buildAiPageMetadata(
    route.path,
    {
      title: fallback.title,
      description: fallback.description,
    },
    {
      absoluteTitle: true,
      canonicalPath: route.path,
      indexable: Boolean(pageSeo),
    },
  );
}

export default async function Page({ params }: PageProps) {
  const route = await resolveRoute(params);
  const genericPath = `/ai/create/${route.kind}`;
  const [page, genericPage] = await Promise.all([
    getPageBySlug(route.path),
    route.path === genericPath
      ? Promise.resolve(null)
      : getPageBySlug(genericPath),
  ]);
  const contentPage = page || genericPage;
  const fallback = GENERATION_FALLBACKS[route.kind];
  const heading = page?.title || genericPage?.title || fallback.heading;

  return (
    <>
      <JsonLd
        data={buildStructuredData(contentPage, route.path, heading, route.kind)}
      />
      <div className={styles.content}>
        <h1 className={styles.heading}>{heading}</h1>
        {contentPage?.blocks.length ? (
          <PageBlocks blocks={contentPage.blocks} />
        ) : null}
      </div>
    </>
  );
}

async function resolveRoute(params: PageProps["params"]): Promise<{
  kind: RouteKind;
  path: string;
}> {
  const { kind: rawKind, model = [] } = await params;
  if (!isRouteKind(rawKind) || model.length > 1) notFound();
  const modelSlug = model[0]?.trim().toLocaleLowerCase("en-US");
  if (modelSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(modelSlug)) notFound();

  return {
    kind: rawKind,
    path: `/ai/create/${rawKind}${modelSlug ? `/${modelSlug}` : ""}`,
  };
}

function isRouteKind(value: string): value is RouteKind {
  return value === "photo" || value === "text" || value === "video";
}

function buildStructuredData(
  page: Page | null,
  path: string,
  heading: string,
  kind: RouteKind,
) {
  const typeName =
    kind === "photo"
      ? "Генерация изображений"
      : kind === "video"
        ? "Генерация видео"
        : "Нейросети для текста";

  return [
    ...(page
      ? [buildPageJsonLd(page, { title: heading, url: path })]
      : []),
    buildBreadcrumbJsonLd([
      { name: "Главная", url: "/" },
      { name: "Нейролюб Studio", url: "/ai" },
      { name: typeName, url: `/ai/create/${kind}` },
      ...(path === `/ai/create/${kind}` ? [] : [{ name: heading, url: path }]),
    ]),
  ];
}

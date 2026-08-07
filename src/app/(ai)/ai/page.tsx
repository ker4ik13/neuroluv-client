import type { Metadata } from "next";
import { headers } from "next/headers";

import { SITE_URL } from "@/shared/config/site";
import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { buildBreadcrumbJsonLd } from "@/shared/lib/seo/json-ld";
import { JsonLd } from "@/shared/ui/json-ld";
import { CreateStudioPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata(
    "/ai",
    {
      title: "Нейросети онлайн в одном месте — AI-агрегатор | Нейролюб Studio",
      description:
        "AI-агрегатор: ChatGPT, Nano Banana, Claude, Gemini, DeepSeek и другие нейросети для текста, фото и видео. Один аккаунт для всех ИИ.",
    },
    { absoluteTitle: true, indexable: true },
  );
}

export default async function AiPage() {
  const nonce = (await headers()).get("x-nonce") || undefined;

  return (
    <>
      <JsonLd
        data={[
          AI_LANDING_JSON_LD,
          buildBreadcrumbJsonLd([
            { name: "Главная", url: "/" },
            { name: "Нейролюб Studio", url: "/ai" },
          ]),
        ]}
        nonce={nonce}
      />
      <CreateStudioPage kind="entry" />
    </>
  );
}

const AI_LANDING_DESCRIPTION =
  "AI-агрегатор для работы с нейросетями для текста, фото и видео в одном аккаунте.";

const AI_LANDING_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": `${SITE_URL}/ai#webpage`,
      "@type": "WebPage",
      description: AI_LANDING_DESCRIPTION,
      inLanguage: "ru-RU",
      name: "Все нейросети онлайн в одном месте",
      url: `${SITE_URL}/ai`,
    },
    {
      "@id": `${SITE_URL}/ai#application`,
      "@type": "WebApplication",
      alternateName: "Нейролюб Студия",
      applicationCategory: "MultimediaApplication",
      browserRequirements: "Современный веб-браузер",
      description: AI_LANDING_DESCRIPTION,
      featureList: [
        "Чат с текстовыми нейросетями",
        "Генерация и редактирование изображений",
        "Генерация видео по тексту и фото",
        "Каталог готовых промптов",
        "История чатов и созданных работ",
      ],
      inLanguage: "ru-RU",
      name: "Нейролюб Studio",
      operatingSystem: "Любая операционная система",
      url: `${SITE_URL}/ai`,
    },
  ],
};

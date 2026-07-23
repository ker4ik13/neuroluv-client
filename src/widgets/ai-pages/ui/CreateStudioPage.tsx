"use client";

import Link from "next/link";
import { FiArrowRight, FiFileText, FiImage, FiVideo } from "react-icons/fi";
import { useAiLocale } from "@/features/ai-locale";

import { AiCard, AiLinkButton, AiPage } from "./AiUi";
import { GenerationChatPage, type GenerationChatKind } from "./GenerationChatPage";
import styles from "./AiPages.module.scss";

type CreateKind = "entry" | GenerationChatKind;

const CREATE_TYPES = [
  {
    id: "text",
    title: ["Текст", "Text"],
    description: ["Полноценный диалог с сохраняемым контекстом", "A full conversation with optional saved context"],
    href: "/ai/create/text",
    icon: FiFileText,
  },
  {
    id: "image",
    title: ["Изображение", "Image"],
    description: ["Диалог с генерацией и редактированием изображений", "Generate and edit images in a conversation"],
    href: "/ai/create/photo",
    icon: FiImage,
  },
  {
    id: "video",
    title: ["Видео", "Video"],
    description: ["Генерация видео в чате с нейросетью", "Generate video in a model chat"],
    href: "/ai/create/video",
    icon: FiVideo,
  },
] as const;

export function CreateStudioPage({ kind }: { kind: CreateKind }) {
  const { t } = useAiLocale();
  if (kind !== "entry") {
    return <GenerationChatPage key={kind} kind={kind} />;
  }

  return (
    <AiPage>
      <div className={styles.createHero}>
        <span className={styles.eyebrow}>{t("Нейролюб Studio", "Neuroluv Studio")}</span>
        <h1>{t("Все нейросети — в понятном формате чата", "Every AI model in a familiar chat")}</h1>
        <p>
          {t("Выберите тип результата, общайтесь с моделью сообщениями и управляйте параметрами в одном сайдбаре.", "Choose an output type, chat with the model and manage its parameters in one sidebar.")}
        </p>
      </div>

      <div className={styles.createTypeGrid}>
        {CREATE_TYPES.map((item) => {
          const Icon = item.icon;
          return (
            <Link className={styles.createTypeCard} href={item.href} key={item.id}>
              <span className={styles.typeIcon}>
                <Icon aria-hidden="true" />
              </span>
              <span>
                <strong>{t(item.title[0], item.title[1])}</strong>
                <small>{t(item.description[0], item.description[1])}</small>
              </span>
              <FiArrowRight aria-hidden="true" className={styles.cardArrow} />
            </Link>
          );
        })}
      </div>

      <AiCard className={styles.toolBanner}>
        <div>
          <span className={styles.eyebrow}>{t("AI-инструмент", "AI tool")}</span>
          <h2>{t("Получить точный промпт из фотографии", "Create a precise prompt from a photo")}</h2>
          <p>
            {t("Загрузите референс, выберите нужный формат описания и продолжите работу в чате генератора.", "Upload a reference, choose the description format and continue in the generator chat.")}
          </p>
        </div>
        <AiLinkButton href="/ai/tools/photo-to-prompt" variant="secondary">
          {t("Открыть инструмент", "Open tool")}
          <FiArrowRight aria-hidden="true" />
        </AiLinkButton>
      </AiCard>

      <div className={styles.entryFooterLinks}>
        <Link href="/ai/prompts">{t("Подобрать готовый промпт", "Choose a ready-made prompt")}</Link>
        <Link href="/ai/faq">{t("Как всё устроено", "How it works")}</Link>
      </div>
    </AiPage>
  );
}

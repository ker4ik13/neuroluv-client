"use client";

import Link from "next/link";
import {
  FiArrowRight,
  FiBookOpen,
  FiCamera,
  FiCheck,
  FiFileText,
  FiImage,
  FiMessageCircle,
  FiPlay,
  FiVideo,
  FiZap,
} from "react-icons/fi";
import { useAiLocale } from "@/features/ai-locale";

import { AiLinkButton, AiPage } from "./AiUi";
import { GenerationChatPage, type GenerationChatKind } from "./GenerationChatPage";
import styles from "./CreateStudioPage.module.scss";

type CreateKind = "entry" | GenerationChatKind;

const CREATE_TYPES = [
  {
    id: "text",
    title: ["Нейросеть для текста и AI-чат", "AI chat and writing models"],
    description: [
      "Пишите, редактируйте и анализируйте материалы в диалоге. ИИ для текста сохраняет контекст по вашему выбору и помогает довести ответ до результата.",
      "Write, edit and analyze content in a conversation. Text AI can keep context when you need it and helps you refine the result.",
    ],
    action: ["Написать текст нейросетью", "Create text with AI"],
    features: [
      ["Статьи, посты и сценарии", "Articles, posts and scripts"],
      ["Анализ и работа с файлами", "Analysis and file workflows"],
    ],
    models: ["ChatGPT", "Claude", "DeepSeek", "Perplexity"],
    href: "/ai/create/text",
    icon: FiFileText,
  },
  {
    id: "image",
    title: ["Нейросеть для фото и изображений", "AI for photos and images"],
    description: [
      "Создавайте изображения по тексту или референсу, меняйте детали и продолжайте работу в одном чате. Формат, разрешение и модель выбираются перед запуском.",
      "Create images from text or references, edit details and continue in one chat. Choose the format, resolution and model before generation.",
    ],
    action: ["Сгенерировать фото нейросетью", "Generate an image"],
    features: [
      ["Генерация по описанию", "Text-to-image generation"],
      ["Редактирование по референсу", "Reference-based editing"],
      ["Разные форматы и разрешения", "Multiple formats and resolutions"],
    ],
    models: ["Nano Banana", "GPT Image", "Seedream", "Recraft"],
    href: "/ai/create/photo",
    icon: FiImage,
  },
  {
    id: "video",
    title: ["Нейросеть для генерации видео", "AI video generation"],
    description: [
      "Создавайте видео по тексту, оживляйте фото и управляйте длительностью, форматом кадра и аудио — только теми параметрами, которые поддерживает модель.",
      "Create video from text, animate photos and control duration, aspect ratio and audio using only the options supported by each model.",
    ],
    action: ["Создать видео нейросетью", "Create an AI video"],
    features: [
      ["Текст в видео", "Text to video"],
      ["Фото в видео", "Image to video"],
      ["Длительность и формат кадра", "Duration and aspect ratio"],
    ],
    models: ["Kling", "Seedance", "Grok Imagine"],
    href: "/ai/create/video",
    icon: FiVideo,
  },
] as const;

export function CreateStudioPage({
  kind,
  initialModelSlug,
  pageTitle,
  semanticTitle = true,
  syncModelUrl = false,
}: {
  kind: CreateKind;
  initialModelSlug?: string;
  pageTitle?: string;
  semanticTitle?: boolean;
  syncModelUrl?: boolean;
}) {
  const { t } = useAiLocale();
  if (kind !== "entry") {
    return (
      <GenerationChatPage
        initialModelSlug={initialModelSlug}
        kind={kind}
        pageTitle={pageTitle}
        semanticTitle={semanticTitle}
        syncModelUrl={syncModelUrl}
      />
    );
  }

  return (
    <AiPage className={styles.landing}>
      <header className={styles.hero}>
        <div aria-hidden="true" className={styles.heroAnimation}>
          <div className={styles.heroStage}>
            <span className={`${styles.heroRing} ${styles.heroRingOuter}`} />
            <span className={`${styles.heroRing} ${styles.heroRingInner}`} />

            <span className={`${styles.signalNode} ${styles.signalNodeText}`}>
              <FiFileText />
            </span>
            <span className={`${styles.signalNode} ${styles.signalNodeImage}`}>
              <FiImage />
            </span>
            <span className={`${styles.signalNode} ${styles.signalNodeVideo}`}>
              <FiVideo />
            </span>

            <div className={styles.heroCore}>
              <FiZap />
              <span>
                <strong>{t("Нейролюб", "Neuroluv")}</strong>
                <small>Studio</small>
              </span>
            </div>

            <span className={`${styles.modelChip} ${styles.modelChipChat}`}>
              ChatGPT
            </span>
            <span className={`${styles.modelChip} ${styles.modelChipBanana}`}>
              Nano Banana
            </span>
            <span className={`${styles.modelChip} ${styles.modelChipClaude}`}>
              Claude
            </span>
            <span className={`${styles.modelChip} ${styles.modelChipDeepSeek}`}>
              DeepSeek
            </span>
          </div>
        </div>

        <div className={styles.heroCopy}>
          <h1>
            {t(
              "Все нейросети онлайн в одном месте",
              "All AI models online in one place",
            )}
          </h1>
          <p className={styles.heroLead}>
            {t(
              "ChatGPT, Gemini, Claude, DeepSeek и нейросети для текста, фото и видео в одном русскоязычном сервисе. Один аккаунт, баланс и история работ.",
              "An AI aggregator for ChatGPT, Nano Banana, Claude, Gemini, DeepSeek and other models for text, images and video. One account for every AI.",
            )}
          </p>
          <p className={styles.heroSummary}>
            {t(
              "Выберите задачу и модель, задайте параметры, запустите генерацию и возвращайтесь к результатам в одном рабочем пространстве.",
              "Neuroluv Studio brings model selection, settings, conversation history and billing into one clear interface.",
            )}
          </p>

          <div className={styles.heroActions}>
            <AiLinkButton href="/ai/create/text">
              {t("Начать работу", "Start creating")}
              <FiArrowRight aria-hidden="true" />
            </AiLinkButton>
            <AiLinkButton href="/ai/prompts" variant="ghost">
              {t("Готовые промпты", "Ready-made prompts")}
            </AiLinkButton>
          </div>

          <ul className={styles.heroFacts}>
            <li>
              <FiCheck aria-hidden="true" />
              {t("Интерфейс на вашем языке", "Interface in your language")}
            </li>
            <li>
              <FiCheck aria-hidden="true" />
              {t("Один баланс", "One shared balance")}
            </li>
            <li>
              <FiCheck aria-hidden="true" />
              {t("История чатов и работ", "Chat and work history")}
            </li>
          </ul>
        </div>
      </header>

      <main>
        <section aria-labelledby="ai-capabilities" className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2 id="ai-capabilities">
              {t(
                "Нейросети для текста, фото и видео",
                "AI for text, images and video",
              )}
            </h2>
            <p>
              {t(
                "Выберите нужный результат — агрегатор покажет подходящие модели и только поддерживаемые ими настройки.",
                "Choose the result you need and the aggregator will show suitable models with only the settings they support.",
              )}
            </p>
          </div>

          <div className={styles.capabilityGrid}>
            {CREATE_TYPES.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  className={`${styles.capabilityCard} ${styles[`capabilityCard_${item.id}`]}`}
                  key={item.id}
                >
                  <div className={styles.capabilityCopy}>
                    <span className={styles.capabilityIcon}>
                      <Icon aria-hidden="true" />
                    </span>
                    <h3>{t(item.title[0], item.title[1])}</h3>
                    <p>{t(item.description[0], item.description[1])}</p>

                    <ul className={styles.capabilityFeatures}>
                      {item.features.map((feature) => (
                        <li key={feature[0]}>
                          <FiCheck aria-hidden="true" />
                          {t(feature[0], feature[1])}
                        </li>
                      ))}
                    </ul>

                    <div className={styles.modelList} aria-label={t("Доступные семейства моделей", "Available model families")}>
                      {item.models.map((model) => (
                        <span key={model}>{model}</span>
                      ))}
                    </div>

                    <Link className={styles.inlineLink} href={item.href}>
                      {t(item.action[0], item.action[1])}
                      <FiArrowRight aria-hidden="true" />
                    </Link>
                  </div>

                  <CapabilityPreview type={item.id} />
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="ai-tools" className={styles.section}>
          <div className={styles.sectionHeading}>
            <h2 id="ai-tools">
              {t("Инструменты для работы с нейросетями", "Tools for working with AI")}
            </h2>
            <p>
              {t(
                "Подготовьте точный запрос по референсу или начните с готовой идеи — результат можно сразу продолжить в генераторе.",
                "Build a precise request from a reference or start with a ready-made idea, then continue directly in the generator.",
              )}
            </p>
          </div>

          <div className={styles.toolsGrid}>
            <Link className={styles.toolCard} href="/ai/tools/photo-to-prompt">
              <span className={styles.toolIcon}>
                <FiCamera aria-hidden="true" />
              </span>
              <span>
                <strong>{t("Промпт из фото", "Prompt from photo")}</strong>
                <small>
                  {t(
                    "Загрузите одно или несколько изображений, добавьте пожелания и получите подробный англоязычный промпт для генерации.",
                    "Upload one or more images, add your preferences and get a detailed English prompt for generation.",
                  )}
                </small>
              </span>
              <FiArrowRight aria-hidden="true" />
            </Link>

            <Link className={styles.toolCard} href="/ai/prompts">
              <span className={styles.toolIcon}>
                <FiBookOpen aria-hidden="true" />
              </span>
              <span>
                <strong>{t("Каталог готовых промптов", "Ready-made prompt catalog")}</strong>
                <small>
                  {t(
                    "Выберите задачу, замените выделенные переменные и откройте совместимую модель с уже подготовленным запросом.",
                    "Choose a task, replace the highlighted variables and open a compatible model with a prepared request.",
                  )}
                </small>
              </span>
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section aria-labelledby="about-ai-aggregator" className={styles.seoSection}>
          <div className={styles.seoIntro}>
            <h2 id="about-ai-aggregator">
              {t(
                "Нейролюб Studio — русскоязычный AI-агрегатор",
                "Neuroluv Studio — one AI aggregator",
              )}
            </h2>
            <p>
              {t(
                "Это сайт с нейросетями для ежедневных и профессиональных задач. Не нужно создавать отдельные аккаунты у разных сервисов: выбирайте ИИ онлайн, сравнивайте модели по назначению и продолжайте работу в сохранённом чате.",
                "This is a single website for everyday and professional AI tasks. Choose online models by purpose and continue your work in saved conversations without juggling separate services.",
              )}
            </p>
          </div>

          <div className={styles.seoGrid}>
            <article>
              <FiMessageCircle aria-hidden="true" />
              <h3>{t("Чат с нейросетью онлайн на вашем языке", "Online AI chat")}</h3>
              <p>
                {t(
                  "Используйте ChatGPT онлайн, Claude, DeepSeek, Perplexity и другие текстовые модели: задавайте вопросы, прикрепляйте файлы, анализируйте документы и создавайте тексты в одном диалоге.",
                  "Use ChatGPT, Claude, DeepSeek, Perplexity and other text models to ask questions, attach files, analyze documents and create content in one conversation.",
                )}
              </p>
            </article>
            <article>
              <FiImage aria-hidden="true" />
              <h3>{t("Генерация и обработка изображений", "Image generation and editing")}</h3>
              <p>
                {t(
                  "Нейросеть для генерации изображений поможет создать фото по описанию, изменить референс, улучшить композицию или подготовить визуал в нужном соотношении сторон.",
                  "Image models can create a photo from a description, edit a reference, improve the composition or prepare a visual in the required aspect ratio.",
                )}
              </p>
            </article>
            <article>
              <FiVideo aria-hidden="true" />
              <h3>{t("Видео по тексту или фотографии", "Video from text or an image")}</h3>
              <p>
                {t(
                  "ИИ для видео превращает описание или исходный кадр в ролик. Поддерживаемые режимы, длительность, разрешение и аудио подстраиваются под выбранную нейросеть.",
                  "Video AI turns a description or a source frame into a clip. Modes, duration, resolution and audio adapt to the selected model.",
                )}
              </p>
            </article>
          </div>

          <p className={styles.brandNote}>
            {t(
              "Нейролюб Студия помогает выбрать лучшие нейросети под конкретную задачу и хранит результат в одном рабочем пространстве.",
              "Neuroluv Studio helps you choose the right model for each task and keeps the result in one workspace.",
            )}
          </p>
        </section>
      </main>

      <nav aria-label={t("Полезные разделы", "Helpful sections")} className={styles.footerLinks}>
        <Link href="/ai/prompts">{t("Каталог промптов", "Prompt catalog")}</Link>
        <Link href="/ai/works">{t("Мои работы", "My works")}</Link>
        <Link href="/ai/faq">{t("Частые вопросы", "Frequently asked questions")}</Link>
      </nav>
    </AiPage>
  );
}

function CapabilityPreview({ type }: { type: (typeof CREATE_TYPES)[number]["id"] }) {
  if (type === "text") {
    return (
      <div aria-hidden="true" className={`${styles.capabilityPreview} ${styles.textPreview}`}>
        <div className={styles.previewBar}>
          <span />
          <span />
          <span />
        </div>
        <div className={styles.chatBubbleUser}>Напиши структуру статьи</div>
        <div className={styles.chatBubbleAi}>
          <FiZap />
          <span>
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className={styles.chatBubbleAi}>
          <FiZap />
          <span>
            <i />
            <i />
          </span>
        </div>
      </div>
    );
  }

  if (type === "image") {
    return (
      <div aria-hidden="true" className={`${styles.capabilityPreview} ${styles.imagePreview}`}>
        <div className={styles.imageTile}>
          <FiImage />
        </div>
        <div className={styles.imageTile}>
          <FiImage />
        </div>
        <div className={styles.imageTile}>
          <FiImage />
        </div>
        <div className={styles.imagePrompt}>Неоновый город после дождя…</div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={`${styles.capabilityPreview} ${styles.videoPreview}`}>
      <div className={styles.videoFrame}>
        <span className={styles.playButton}>
          <FiPlay />
        </span>
        <span className={styles.videoDuration}>00:08</span>
      </div>
      <div className={styles.videoTimeline}>
        <span />
      </div>
    </div>
  );
}

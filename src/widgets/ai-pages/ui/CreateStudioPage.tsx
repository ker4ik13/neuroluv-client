import Link from "next/link";
import { FiArrowRight, FiFileText, FiImage, FiVideo } from "react-icons/fi";

import { AiCard, AiLinkButton, AiPage } from "./AiUi";
import { GenerationChatPage, type GenerationChatKind } from "./GenerationChatPage";
import styles from "./AiPages.module.scss";

type CreateKind = "entry" | GenerationChatKind;

const CREATE_TYPES = [
  {
    id: "text",
    title: "Текст",
    description: "Полноценный диалог с сохраняемым контекстом",
    href: "/ai/create/text",
    icon: FiFileText,
  },
  {
    id: "image",
    title: "Изображение",
    description: "Диалог с генерацией и редактированием изображений",
    href: "/ai/create/photo",
    icon: FiImage,
  },
  {
    id: "video",
    title: "Видео",
    description: "Генерация видео в чате с нейросетью",
    href: "/ai/create/video",
    icon: FiVideo,
  },
] as const;

export function CreateStudioPage({ kind }: { kind: CreateKind }) {
  if (kind !== "entry") {
    return <GenerationChatPage kind={kind} />;
  }

  return (
    <AiPage>
      <div className={styles.createHero}>
        <span className={styles.eyebrow}>Нейролюб AI</span>
        <h1>Все нейросети — в понятном формате чата</h1>
        <p>
          Выберите тип результата, общайтесь с моделью сообщениями и управляйте
          параметрами в одном сайдбаре.
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
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <FiArrowRight aria-hidden="true" className={styles.cardArrow} />
            </Link>
          );
        })}
      </div>

      <AiCard className={styles.toolBanner}>
        <div>
          <span className={styles.eyebrow}>AI-инструмент</span>
          <h2>Получить точный промпт из фотографии</h2>
          <p>
            Загрузите референс, выберите нужный формат описания и продолжите работу
            в чате генератора.
          </p>
        </div>
        <AiLinkButton href="/ai/tools/photo-to-prompt" variant="secondary">
          Открыть инструмент
          <FiArrowRight aria-hidden="true" />
        </AiLinkButton>
      </AiCard>

      <div className={styles.entryFooterLinks}>
        <Link href="/ai/prompts">Подобрать готовый промпт</Link>
        <Link href="/ai/faq">Как всё устроено</Link>
      </div>
    </AiPage>
  );
}

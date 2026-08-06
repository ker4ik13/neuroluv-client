"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiArrowRight, FiBookmark, FiImage, FiMaximize2 } from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
import { useAiLocale } from "@/features/ai-locale";
import {
  aiApiFetch,
  type AiPromptDetail,
  type AiPublicModel,
  type AiToolFieldOption,
} from "@/shared/api/ai";

import { getAiErrorMessage, useAiResource } from "../model/api";
import { readLocalJson, writeLocalJson } from "../model/storage";
import {
  AiButton,
  AiCard,
  AiPage,
  AiPageHeader,
  AsyncState,
  FieldMessage,
} from "./AiUi";
import { AiSelect } from "./AiSelect";
import { AiModelLogo } from "./AiModelLogo";
import { ImageLightbox } from "./ChatImageOutput";
import styles from "./AiPages.module.scss";

type PromptVariableValue = string | number | boolean;

export function PromptDetailPage({
  initialPrompt = null,
  slug,
}: {
  initialPrompt?: AiPromptDetail | null;
  slug: string;
}) {
  const router = useRouter();
  const { session } = useAiSession();
  const { t } = useAiLocale();
  const prompt = useAiResource<AiPromptDetail>(
    `/catalog/prompts/${encodeURIComponent(slug)}`,
    initialPrompt,
    { revalidateInitial: true },
  );
  const models = useAiResource<AiPublicModel[]>("/catalog/models");
  const [modelId, setModelId] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, PromptVariableValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const draftKey = `neuroluv-ai:prompt-draft:${slug}`;
  const isLocked = prompt.data?.access === "subscription";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = readLocalJson<{
          modelId?: string;
          variables?: Record<string, PromptVariableValue>;
        }>(draftKey, {});
        setModelId(saved.modelId || "");
        setVariableValues(saved.variables || {});
      } catch {
        setVariableValues({});
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [draftKey]);

  const compatibleModels = useMemo(() => {
    if (!prompt.data || !models.data) return [];
    return models.data.filter(
      (model) =>
        model.available &&
        (prompt.data?.compatibleModelIds.length === 0 ||
          prompt.data?.compatibleModelIds.includes(model.id)),
    );
  }, [models.data, prompt.data]);

  const selectedModelId =
    compatibleModels.some((model) => model.id === modelId)
      ? modelId
      : compatibleModels[0]?.id || "";

  function handleUse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLocked) {
      setError(t("Этот промпт пока закрыт", "This prompt is currently locked"));
      return;
    }
    if (!prompt.data || !selectedModelId) {
      setError(t("Для этого промпта пока нет доступной модели", "No compatible model is currently available for this prompt"));
      return;
    }

    const variables = Object.fromEntries(
      (prompt.data.variablesSchema?.fields || []).map((field) => [
        field.code,
        variableValues[field.code] ?? "",
      ]),
    );
    const model = compatibleModels.find((item) => item.id === selectedModelId);
    const preparedPrompt = renderPromptTemplate(
      prompt.data.promptTemplate,
      prompt.data.variablesSchema?.fields || [],
      variables,
    );
    const target =
      model?.modality === "video"
        ? "/ai/create/video"
        : model?.modality === "text"
          ? "/ai/create/text"
          : "/ai/create/photo";

    writeLocalJson(
      "neuroluv-ai:create-preset",
      {
        promptId: Number(prompt.data.id),
        promptTitle: prompt.data.title,
        promptCompatibleModelIds: prompt.data.compatibleModelIds,
        modelId: selectedModelId,
        prompt: preparedPrompt,
        aspectRatio: prompt.data.defaultAspectRatio || "",
        promptMinimumReferenceFiles: prompt.data.minimumReferenceFiles,
        promptMaximumReferenceFiles: prompt.data.maximumReferenceFiles,
        catalogPromptOverride: prompt.data.allowUserPromptEdit,
        toolValues: {},
      },
    );
    router.push(target);
  }

  function updateDraft(
    nextModelId: string,
    nextVariables: Record<string, PromptVariableValue>,
  ) {
    setModelId(nextModelId);
    setVariableValues(nextVariables);
    writeLocalJson(draftKey, { modelId: nextModelId, variables: nextVariables });
  }

  async function toggleFavorite() {
    if (!prompt.data) return;
    if (!session.authenticated) {
      router.push(`/ai/auth?returnTo=${encodeURIComponent(`/ai/prompts/${slug}`)}`);
      return;
    }

    setIsFavoritePending(true);
    setError(null);
    try {
      await aiApiFetch(`/catalog/prompts/${prompt.data.id}/favorite`, {
        method: prompt.data.favorite ? "DELETE" : "POST",
      });
      prompt.reload();
    } catch (requestError) {
      setError(getAiErrorMessage(requestError));
    } finally {
      setIsFavoritePending(false);
    }
  }

  return (
    <AiPage className={styles.promptDetailPage}>
      <AsyncState
        error={prompt.error}
        isEmpty={!prompt.data}
        isLoading={prompt.isLoading}
        emptyTitle={t("Промпт не найден", "Prompt not found")}
        onRetry={prompt.reload}
      >
        {prompt.data ? (
          <>
            <AiPageHeader
              backHref="/ai/prompts"
              title={prompt.data.title}
              actions={
                <AiButton
                  disabled={isFavoritePending}
                  type="button"
                  variant="secondary"
                  onClick={() => void toggleFavorite()}
                >
                  <FiBookmark
                    aria-hidden="true"
                    fill={prompt.data.favorite ? "currentColor" : "none"}
                  />
                  {prompt.data.favorite ? t("В избранном", "Saved") : t("Сохранить", "Save")}
                </AiButton>
              }
            />

            <div className={styles.promptDetailGrid}>
              <AiCard className={styles.promptPreviewCard}>
                <div className={styles.detailMedia}>
                  {prompt.data.imageUrl ? (
                    <ImageLightbox
                      alt={t("Пример результата", "Result example")}
                      fullUrl={prompt.data.imageUrl}
                      previewUrl={prompt.data.imageUrl}
                      triggerClassName={styles.mediaLightboxButton}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- backend/CDN URL with unknown host */}
                      <img alt={t("Пример результата", "Result example")} src={prompt.data.imageUrl} />
                      <span aria-hidden="true" className={styles.mediaFullscreenHint}>
                        <FiMaximize2 />
                      </span>
                    </ImageLightbox>
                  ) : (
                    <span className={styles.mediaPlaceholder}>
                      <FiImage aria-hidden="true" />
                    </span>
                  )}
                </div>
                {prompt.data.description || prompt.data.excerpt ? (
                  <p className={styles.promptDescription}>
                    {prompt.data.description || prompt.data.excerpt}
                  </p>
                ) : null}
              </AiCard>

              <AiCard className={styles.promptConfigurator}>
                <h2>{t("Настроить промпт", "Configure prompt")}</h2>
                <p>{t("Заполните параметры и выберите совместимую модель.", "Fill in the parameters and choose a compatible model.")}</p>
                <form className={styles.formStack} onSubmit={handleUse}>
                  {(prompt.data.variablesSchema?.fields || []).map((field) =>
                    field.type === "select" ? (
                      <AiSelect
                        compact
                        id={`prompt-variable-${field.code}`}
                        key={field.code}
                        label={field.label}
                        name={field.code}
                        options={[
                          { value: "", label: t("Выберите значение", "Choose a value") },
                          ...(field.options?.map((option, index) => ({
                            value: String(index),
                            label: option.label,
                          })) || []),
                        ]}
                        required={false}
                        value={selectedOptionToken(field.options, variableValues[field.code])}
                        onChange={(optionToken) => {
                          const option = field.options?.[Number(optionToken)];
                          updateDraft(selectedModelId, {
                            ...variableValues,
                            [field.code]: option?.value ?? "",
                          });
                        }}
                      />
                    ) : (
                      <label className={styles.field} key={field.code}>
                        <span>{field.label}</span>
                        {field.type === "textarea" ? (
                        <textarea
                          name={field.code}
                          placeholder={field.placeholder || ""}
                          required={false}
                          rows={4}
                          value={String(variableValues[field.code] ?? "")}
                          onChange={(event) =>
                            updateDraft(selectedModelId, {
                              ...variableValues,
                              [field.code]: event.target.value,
                            })
                          }
                        />
                        ) : (
                        <input
                          name={field.code}
                          placeholder={field.placeholder || ""}
                          required={false}
                          type={field.type === "number" ? "number" : "text"}
                          value={String(variableValues[field.code] ?? "")}
                          onChange={(event) =>
                            updateDraft(selectedModelId, {
                              ...variableValues,
                              [field.code]:
                                field.type === "number" && event.target.value !== ""
                                  ? Number(event.target.value)
                                  : event.target.value,
                            })
                          }
                        />
                        )}
                      </label>
                    ),
                  )}

                  <AiSelect
                    disabled={models.isLoading || compatibleModels.length === 0}
                    id="prompt-compatible-model"
                    label={t("Модель", "Model")}
                    options={compatibleModels.map((model) => ({
                      value: model.id,
                      label: model.name,
                      visual: <AiModelLogo label={model.name} logoUrl={model.logoUrl} />,
                    }))}
                    required
                    value={selectedModelId}
                    onChange={(nextModelId) => updateDraft(nextModelId, variableValues)}
                  />

                  {error ? <FieldMessage>{error}</FieldMessage> : null}
                  {models.error ? <FieldMessage>{models.error}</FieldMessage> : null}

                  <AiButton disabled={!selectedModelId || isLocked} type="submit">
                    {isLocked
                      ? t("Промпт пока закрыт", "Prompt is currently locked")
                      : t("Продолжить в генераторе", "Continue in generator")}
                    {!isLocked ? <FiArrowRight aria-hidden="true" /> : null}
                  </AiButton>
                </form>
              </AiCard>
            </div>
          </>
        ) : null}
      </AsyncState>
    </AiPage>
  );
}

function selectedOptionToken(
  options: AiToolFieldOption[] | undefined,
  value: PromptVariableValue | undefined,
): string {
  const index = options?.findIndex(
    (option) => typeof option.value === typeof value && option.value === value,
  );
  return index === undefined || index < 0 ? "" : String(index);
}

function renderPromptTemplate(
  template: string,
  fields: NonNullable<AiPromptDetail["variablesSchema"]>["fields"],
  values: Record<string, PromptVariableValue>,
): string {
  let rendered = template;
  for (const field of fields || []) {
    const value = values[field.code];
    if (value === undefined || value === null || String(value).trim() === "") continue;
    const replacement = String(value);
    const tokens = [
      field.templateToken,
      `{{${field.code}}}`,
    ].filter((token): token is string => Boolean(token));
    tokens.forEach((token) => {
      rendered = rendered.split(token).join(replacement);
    });
  }
  return rendered;
}

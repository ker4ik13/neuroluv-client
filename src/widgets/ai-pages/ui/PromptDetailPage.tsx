"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FiArrowRight, FiBookmark, FiCheck, FiImage } from "react-icons/fi";

import { useAiSession } from "@/features/ai-session";
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
import styles from "./AiPages.module.scss";

type PromptVariableValue = string | number | boolean;

export function PromptDetailPage({ slug }: { slug: string }) {
  const { session } = useAiSession();
  const prompt = useAiResource<AiPromptDetail>(
    `/catalog/prompts/${encodeURIComponent(slug)}`,
  );
  const models = useAiResource<AiPublicModel[]>("/catalog/models");
  const [modelId, setModelId] = useState("");
  const [variableValues, setVariableValues] = useState<Record<string, PromptVariableValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const draftKey = `neuroluv-ai:prompt-draft:${slug}`;

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
    if (!prompt.data || !selectedModelId) {
      setError("Для этого промпта пока нет доступной модели");
      return;
    }

    const variables = Object.fromEntries(
      (prompt.data.variablesSchema?.fields || []).map((field) => [
        field.code,
        variableValues[field.code] ?? "",
      ]),
    );
    const model = compatibleModels.find((item) => item.id === selectedModelId);
    const target =
      model?.modality === "video"
        ? "/ai/create/video"
        : model?.modality === "text"
          ? "/ai/create/text"
          : "/ai/create/photo";

    writeLocalJson(
      "neuroluv-ai:create-preset",
      {
        promptConfigId: prompt.data.id,
        modelId: selectedModelId,
        toolValues: variables,
      },
    );
    window.location.assign(target);
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
      window.location.assign(`/ai/auth?returnTo=${encodeURIComponent(`/ai/prompts/${slug}`)}`);
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
    <AiPage>
      <AsyncState
        error={prompt.error}
        isEmpty={!prompt.data}
        isLoading={prompt.isLoading}
        emptyTitle="Промпт не найден"
        onRetry={prompt.reload}
      >
        {prompt.data ? (
          <>
            <AiPageHeader
              backHref="/ai/prompts"
              eyebrow={prompt.data.category || "Промпт редакции"}
              title={prompt.data.title}
              description={prompt.data.description || prompt.data.excerpt || undefined}
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
                  {prompt.data.favorite ? "В избранном" : "Сохранить"}
                </AiButton>
              }
            />

            <div className={styles.promptDetailGrid}>
              <AiCard className={styles.promptPreviewCard}>
                <div className={styles.detailMedia}>
                  {prompt.data.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- backend/CDN URL with unknown host
                    <img alt="Пример результата" src={prompt.data.imageUrl} />
                  ) : (
                    <span className={styles.mediaPlaceholder}>
                      <FiImage aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className={styles.detailFeatures}>
                  <span><FiCheck aria-hidden="true" /> Переменные проверяются до запуска</span>
                  <span><FiCheck aria-hidden="true" /> Цена рассчитывается сервером</span>
                  <span><FiCheck aria-hidden="true" /> Результат по умолчанию приватный</span>
                </div>
              </AiCard>

              <AiCard className={styles.promptConfigurator}>
                <h2>Настроить промпт</h2>
                <p>Заполните параметры и выберите совместимую модель.</p>
                <form className={styles.formStack} onSubmit={handleUse}>
                  {(prompt.data.variablesSchema?.fields || []).map((field) => (
                    <label className={styles.field} key={field.code}>
                      <span>{field.label}</span>
                      {field.type === "textarea" ? (
                        <textarea
                          name={field.code}
                          placeholder={field.placeholder || ""}
                          required={field.required}
                          rows={4}
                          value={String(variableValues[field.code] ?? "")}
                          onChange={(event) =>
                            updateDraft(selectedModelId, {
                              ...variableValues,
                              [field.code]: event.target.value,
                            })
                          }
                        />
                      ) : field.type === "select" ? (
                        <select
                          name={field.code}
                          required={field.required}
                          value={selectedOptionToken(field.options, variableValues[field.code])}
                          onChange={(event) => {
                            const option = field.options?.[Number(event.target.value)];
                            updateDraft(selectedModelId, {
                              ...variableValues,
                              [field.code]: option?.value ?? "",
                            });
                          }}
                        >
                          <option value="">Выберите значение</option>
                          {field.options?.map((option, index) => (
                            <option
                              key={`${index}:${typeof option.value}:${String(option.value)}`}
                              value={index}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name={field.code}
                          placeholder={field.placeholder || ""}
                          required={field.required}
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
                  ))}

                  <label className={styles.field}>
                    <span>Модель</span>
                    <select
                      disabled={models.isLoading || compatibleModels.length === 0}
                      required
                      value={selectedModelId}
                      onChange={(event) => updateDraft(event.target.value, variableValues)}
                    >
                      {compatibleModels.map((model) => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                  </label>

                  {error ? <FieldMessage>{error}</FieldMessage> : null}
                  {models.error ? <FieldMessage>{models.error}</FieldMessage> : null}

                  <AiButton disabled={!selectedModelId} type="submit">
                    Продолжить в генераторе
                    <FiArrowRight aria-hidden="true" />
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

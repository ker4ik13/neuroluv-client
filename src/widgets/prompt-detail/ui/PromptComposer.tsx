"use client";

import { useMemo, useState } from "react";

import { CopyContentBox } from "@/shared/ui/copy-content-box";

import styles from "./PromptDetailPage.module.scss";

type PromptComposerProps = {
  modelLabel?: string;
  promptText: string;
  title?: string | null;
};

export function PromptComposer({
  modelLabel,
  promptText,
  title,
}: PromptComposerProps) {
  const variables = useMemo(() => extractPromptVariables(promptText), [promptText]);
  const [values, setValues] = useState<Record<string, string>>({});
  const resolvedPrompt = useMemo(
    () => applyPromptVariables(promptText, values),
    [promptText, values],
  );
  const promptParts = useMemo(
    () => buildPromptParts(promptText, values),
    [promptText, values],
  );

  return (
    <>
      <CopyContentBox
        copyLabel="Скопировать промпт"
        copyText={resolvedPrompt}
        title={title || "Промпт"}
      >
        {modelLabel && <strong className={styles.promptModel}>{modelLabel}</strong>}
        <p className={styles.promptText}>
          {promptParts.map((part, index) =>
            part.isReplacement ? (
              <mark
                className={styles.promptReplacement}
                key={`prompt-part-${index}`}
              >
                {part.text}
              </mark>
            ) : (
              <span key={`prompt-part-${index}`}>{part.text}</span>
            ),
          )}
        </p>
      </CopyContentBox>
      {variables.length > 0 && (
        <div className={styles.promptVariables}>
          <h3>Переменные для замены</h3>
          <span dangerouslySetInnerHTML={{ __html: "<!--noindex-->" }} />
          <div className={styles.promptVariableFields} data-nosnippet="true">
            {variables.map((variable) => {
              const value = values[variable] || "";
              const width = Math.min(
                Math.max(value.length || variable.length, 12) + 2,
                42,
              );

              return (
                <input
                  aria-label={`Значение для ${variable}`}
                  key={variable}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [variable]: event.target.value,
                    }))
                  }
                  placeholder={variable}
                  style={{ width: `${width}ch` }}
                  value={value}
                />
              );
            })}
          </div>
          <span dangerouslySetInnerHTML={{ __html: "<!--/noindex-->" }} />
        </div>
      )}
    </>
  );
}

function extractPromptVariables(prompt: string): string[] {
  return [...new Set(prompt.match(/\[[^[\]\n]{1,80}\]/g) || [])];
}

function applyPromptVariables(
  prompt: string,
  values: Record<string, string>,
): string {
  return prompt.replace(/\[[^[\]\n]{1,80}\]/g, (variable) => {
    const value = values[variable]?.trim();

    return value || variable;
  });
}

function buildPromptParts(
  prompt: string,
  values: Record<string, string>,
): Array<{ isReplacement: boolean; text: string }> {
  const parts: Array<{ isReplacement: boolean; text: string }> = [];
  const variablePattern = /\[[^[\]\n]{1,80}\]/g;
  let lastIndex = 0;

  for (const match of prompt.matchAll(variablePattern)) {
    const variable = match[0];
    const index = match.index || 0;
    const value = values[variable]?.trim();

    if (index > lastIndex) {
      parts.push({
        isReplacement: false,
        text: prompt.slice(lastIndex, index),
      });
    }

    parts.push({
      isReplacement: Boolean(value),
      text: value || variable,
    });

    lastIndex = index + variable.length;
  }

  if (lastIndex < prompt.length) {
    parts.push({
      isReplacement: false,
      text: prompt.slice(lastIndex),
    });
  }

  return parts;
}

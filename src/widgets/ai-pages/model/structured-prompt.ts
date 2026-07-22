export type StructuredPrompt = {
  mainPrompt: string;
  shortPrompt: string;
  negativePrompt: string;
};

export function readStructuredPrompt(value: unknown): StructuredPrompt | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.mainPrompt !== "string" ||
    typeof data.shortPrompt !== "string" ||
    typeof data.negativePrompt !== "string"
  ) {
    return null;
  }

  const prompt = {
    mainPrompt: data.mainPrompt.trim(),
    shortPrompt: data.shortPrompt.trim(),
    negativePrompt: data.negativePrompt.trim(),
  };
  return prompt.mainPrompt && prompt.shortPrompt && prompt.negativePrompt ? prompt : null;
}


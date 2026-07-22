"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiArrowLeft,
  FiCheck,
  FiClock,
  FiCopy,
  FiFileText,
  FiImage,
  FiMessageCircle,
  FiMinus,
  FiPaperclip,
  FiPlus,
  FiRefreshCw,
  FiSend,
  FiSettings,
  FiVideo,
  FiX,
  FiZap,
} from "react-icons/fi";
import { RiSparkling2Fill } from "react-icons/ri";

import { useAiSession } from "@/features/ai-session";
import {
  aiApiFetch,
  type AiApiEnvelope,
  type AiConversation,
  type AiConversationKind,
  type AiMessageAttachment,
  type AiModelModality,
  type AiPage as AiPageResponse,
  type AiPublicModel,
  type AiPublicTool,
  type AiQuote,
  type AiRunDetail,
  type AiRunOutput,
  type AiRunSummary,
  type AiToolField,
  type AiWorkDetail,
  type AiWorkOutput,
} from "@/shared/api/ai";
import { useFocusTrap } from "@/shared/lib/dom/useFocusTrap";
import { writeClipboardText } from "@/shared/lib/dom/writeClipboardText";
import {
  formatCreditNumber,
  formatCredits,
} from "@/shared/lib/formatCredits";
import { useDebouncedValue } from "@/shared/lib/react";

import { getAiErrorMessage, unwrapAiData, useAiResource } from "../model/api";
import { resolveGenerationOperation } from "../model/generationOperation";
import { readLocalJson, removeLocalValue, writeLocalJson } from "../model/storage";
import { AiSelect, type AiSelectOption } from "./AiSelect";
import { ChatImageOutput } from "./ChatImageOutput";
import {
  AiCard,
  AiPage,
  AsyncState,
  FieldMessage,
} from "./AiUi";
import styles from "./GenerationChatPage.module.scss";

export type GenerationChatKind = "image" | "video" | "text" | "photo-to-prompt";

type Draft = {
  idempotencyKey: string;
  conversationId: string;
  contextEnabled: boolean;
  promptConfigId: string;
  publicShareDraftToken: string;
  repeatRunId: string;
  replaceReference: boolean;
  modelId: string;
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  outputCount: string;
  duration: string;
  resolution: string;
  quality: string;
  sound: boolean;
  toolValues: Record<string, string | number | boolean>;
};

type ChatTurn = {
  id: string;
  run: AiRunSummary | null;
  prompt: string;
  outputs: AiRunOutput[];
  inputFiles: ChatMessageAttachment[];
  createdAt: string;
  modelName: string;
  submissionState: "submitting" | "active" | "failed";
  submitError?: string | null;
};

type ChatMessageAttachment = AiMessageAttachment & {
  localObjectUrl?: boolean;
};

type QuotePayload = {
  operation: string;
  modelId: string;
  promptConfigId?: string;
  toolId?: string;
  conversationId?: string;
  contextEnabled?: boolean;
  useConversationReference?: boolean;
  parameters: Record<string, unknown>;
};

type PendingReference = {
  id: string;
  file: File;
  previewUrl: string;
};

const EMPTY_DRAFT: Draft = {
  idempotencyKey: "",
  conversationId: "",
  contextEnabled: true,
  promptConfigId: "",
  publicShareDraftToken: "",
  repeatRunId: "",
  replaceReference: false,
  modelId: "",
  prompt: "",
  negativePrompt: "",
  aspectRatio: "",
  outputCount: "",
  duration: "",
  resolution: "",
  quality: "",
  sound: false,
  toolValues: {},
};

const REFERENCE_REQUIRED_OPERATIONS = new Set([
  "image_to_image",
  "image_edit",
  "image_to_video",
  "photo_to_prompt",
]);
const SAFE_IMAGE_REFERENCE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SAFE_TEXT_REFERENCE_MIME_TYPES = new Set([
  ...SAFE_IMAGE_REFERENCE_MIME_TYPES,
  "application/pdf",
]);
const PLATFORM_REFERENCE_FILE_LIMIT = 5;
const PLATFORM_REFERENCE_TOTAL_BYTES_LIMIT = 40 * 1024 * 1024;
const TERMINAL_RUN_STATUSES = new Set([
  "succeeded",
  "partially_succeeded",
  "failed",
  "cancelled",
]);
const PRICE_PREVIEW_PROMPT = "Предварительный расчёт стоимости";

export function GenerationChatPage({ kind }: { kind: GenerationChatKind }) {
  const router = useRouter();
  const { session } = useAiSession();
  const modality = getModality(kind);
  const isTool = kind === "photo-to-prompt";
  const supportsContext = kind === "text" || kind === "image";
  const models = useAiResource<AiPublicModel[]>(
    `/catalog/models?modality=${encodeURIComponent(modality)}`,
  );
  const tools = useAiResource<AiPublicTool[]>(
    isTool ? "/catalog/tools?code=photo-to-prompt" : null,
  );
  const conversationHistory = useAiResource<AiPageResponse<AiConversation>>(
    session.authenticated
      ? "/conversations?status=active&page=1&pageSize=100"
      : null,
  );
  const tool = tools.data?.[0] || null;
  const availableModels = useMemo(() => {
    const source = models.data || [];
    if (!isTool || !tool?.modelIds.length) return source;
    return source.filter((model) => tool.modelIds.includes(model.id));
  }, [isTool, models.data, tool]);

  const [draft, setDraft] = useState<Draft>({
    ...EMPTY_DRAFT,
    contextEnabled: supportsContext,
  });
  const [draftReady, setDraftReady] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [references, setReferences] = useState<PendingReference[]>([]);
  const [quote, setQuote] = useState<AiQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteState, setQuoteState] = useState<
    "idle" | "debouncing" | "loading" | "success" | "error"
  >("idle");
  const [pricingCalculationByKey, setPricingCalculationByKey] = useState<
    Record<string, AiQuote["pricing"]["calculation"]>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [isContextSaving, setIsContextSaving] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const referencesRef = useRef<PendingReference[]>([]);
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLElement>(null);
  const historyRef = useRef<HTMLElement>(null);
  const hydratedRetryRun = useRef<string | null>(null);
  const hydratedConversation = useRef<string | null>(null);
  const quoteRequestSequence = useRef(0);
  const submitLock = useRef(false);
  const viewEpoch = useRef(0);
  const storageKey = `neuroluv-ai:create-draft:${kind}`;

  useFocusTrap(isSettingsOpen, settingsRef);
  useFocusTrap(isHistoryOpen, historyRef);

  const visibleConversations = useMemo(
    () =>
      (conversationHistory.data?.data || []).filter(
        (conversation) => conversation.kind === getConversationKind(kind),
      ),
    [conversationHistory.data?.data, kind],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = readLocalJson<Partial<Draft>>(storageKey, {});
        const preset = readLocalJson<{
          promptConfigId?: string;
          publicShareDraftToken?: string;
          repeatRunId?: string;
          replaceReference?: boolean;
          prompt?: string;
          negativePrompt?: string;
          modelId?: string;
          operation?: string;
          toolValues?: Record<string, string | number | boolean>;
        } | null>("neuroluv-ai:create-preset", null);
        const nextDraft = {
          ...EMPTY_DRAFT,
          contextEnabled: supportsContext,
          ...saved,
        } as Draft;

        if (!supportsContext) nextDraft.contextEnabled = false;
        if (preset) {
          nextDraft.prompt = preset.prompt || nextDraft.prompt;
          nextDraft.negativePrompt = preset.negativePrompt || nextDraft.negativePrompt;
          nextDraft.promptConfigId = preset.promptConfigId || nextDraft.promptConfigId;
          nextDraft.publicShareDraftToken = preset.publicShareDraftToken || "";
          nextDraft.repeatRunId = preset.repeatRunId || "";
          nextDraft.replaceReference = Boolean(preset.replaceReference);
          nextDraft.modelId = preset.modelId || nextDraft.modelId;
          nextDraft.toolValues = { ...nextDraft.toolValues, ...preset.toolValues };
          removeLocalValue("neuroluv-ai:create-preset");
        }
        setDraft(nextDraft);
      } catch {
        setDraft({ ...EMPTY_DRAFT, contextEnabled: supportsContext });
      } finally {
        setDraftReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [storageKey, supportsContext]);

  useEffect(() => {
    if (!draftReady) return;
    writeLocalJson(storageKey, draft);
  }, [draft, draftReady, storageKey]);

  useEffect(() => {
    if (!isSettingsOpen && !isHistoryOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsSettingsOpen(false);
      setIsHistoryOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isHistoryOpen, isSettingsOpen]);

  useEffect(() => {
    if (
      !draftReady ||
      !draft.repeatRunId ||
      !draft.replaceReference ||
      hydratedRetryRun.current === draft.repeatRunId
    ) {
      return;
    }

    const runId = draft.repeatRunId;
    const controller = new AbortController();
    hydratedRetryRun.current = runId;
    void aiApiFetch<AiRunDetail | AiApiEnvelope<AiRunDetail>>(
      `/runs/${encodeURIComponent(runId)}`,
      { signal: controller.signal },
    )
      .then((payload) => {
        const preset = unwrapAiData(payload).retryPreset;
        const patch = retryParametersToDraft(preset.parameters);
        setDraft((current) =>
          current.repeatRunId === runId
            ? {
                ...current,
                ...patch,
                modelId: preset.modelId,
                promptConfigId: preset.promptConfigId || "",
              }
            : current,
        );
      })
      .catch((error) => {
        if (!controller.signal.aborted) setQuoteError(getAiErrorMessage(error));
      });

    return () => controller.abort();
  }, [draft.repeatRunId, draft.replaceReference, draftReady]);

  useEffect(() => {
    if (!availableModels.length) return;
    const current = availableModels.find((model) => model.id === draft.modelId);
    const selected =
      current || availableModels.find((model) => model.available) || availableModels[0];
    const capability = selected.capabilities;
    const timer = window.setTimeout(() => {
      setDraft((value) => ({
        ...value,
        modelId: selected.id,
        aspectRatio:
          capability.aspectRatios?.includes(value.aspectRatio) && value.aspectRatio
            ? value.aspectRatio
            : String(capability.aspectRatios?.[0] || ""),
        outputCount:
          capability.outputCounts?.includes(Number(value.outputCount)) && value.outputCount
            ? value.outputCount
            : String(capability.outputCounts?.[0] || ""),
        duration:
          capability.durations?.includes(Number(value.duration)) && value.duration
            ? value.duration
            : String(capability.durations?.[0] || ""),
        resolution:
          capability.resolutions?.includes(value.resolution) && value.resolution
            ? value.resolution
            : String(capability.resolutions?.[0] || ""),
        quality:
          capability.qualities?.includes(value.quality) && value.quality
            ? value.quality
            : String(capability.qualities?.[0] || ""),
      }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [availableModels, draft.modelId]);

  useEffect(() => {
    if (
      !draftReady ||
      !session.authenticated ||
      !draft.conversationId ||
      hydratedConversation.current === draft.conversationId
    ) {
      return;
    }

    const conversationId = draft.conversationId;
    const controller = new AbortController();
    hydratedConversation.current = conversationId;
    queueMicrotask(() => setIsConversationLoading(true));
    void aiApiFetch<AiConversation | AiApiEnvelope<AiConversation>>(
      `/conversations/${encodeURIComponent(conversationId)}`,
      { signal: controller.signal },
    )
      .then((payload) => {
        const conversation = unwrapAiData(payload);
        setTurns(
          (conversation.turns || []).map((turn) => ({
            id: turn.run.id,
            run: turn.run,
            prompt: turn.userText,
            outputs: turn.outputs,
            inputFiles: turn.inputFiles || [],
            createdAt: turn.run.createdAt,
            modelName: turn.run.modelName,
            submissionState: "active" as const,
          })),
        );
        setDraft((current) => ({
          ...current,
          contextEnabled: supportsContext ? conversation.contextEnabled : false,
        }));
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setConversationError(getAiErrorMessage(error));
          setDraft((current) => ({ ...current, conversationId: "" }));
          hydratedConversation.current = null;
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsConversationLoading(false);
      });
    return () => controller.abort();
  }, [draft.conversationId, draftReady, session.authenticated, supportsContext]);

  useEffect(() => {
    return () => {
      referencesRef.current.forEach((reference) =>
        URL.revokeObjectURL(reference.previewUrl),
      );
    };
  }, []);

  useEffect(() => {
    if (!turns.length) return;
    window.requestAnimationFrame(() => {
      const chatThread = thread.current;
      if (chatThread) chatThread.scrollTo({ top: chatThread.scrollHeight });
    });
  }, [turns.length]);

  useEffect(() => {
    const input = composerInput.current;
    if (!input) return;
    input.style.height = "auto";
    const configuredMaxHeight = Number.parseFloat(window.getComputedStyle(input).maxHeight);
    const maxHeight = Number.isFinite(configuredMaxHeight) ? configuredMaxHeight : 144;
    const nextHeight = Math.min(input.scrollHeight, maxHeight);
    input.style.height = `${nextHeight}px`;
    input.style.overflowY = input.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [draft.prompt, models.isLoading, tools.isLoading]);

  const selectedModel = useMemo(
    () => availableModels.find((model) => model.id === draft.modelId) || null,
    [availableModels, draft.modelId],
  );
  const capabilities = selectedModel?.capabilities;
  const maxReferenceFiles = Math.min(
    PLATFORM_REFERENCE_FILE_LIMIT,
    Math.max(1, isTool ? 1 : capabilities?.maxReferenceFiles ?? 1),
  );
  const maxReferenceFileBytes =
    capabilities?.maxUploadBytes || 20 * 1024 * 1024;
  const acceptedReferenceMimeTypes =
    kind === "text"
      ? SAFE_TEXT_REFERENCE_MIME_TYPES
      : SAFE_IMAGE_REFERENCE_MIME_TYPES;
  const acceptsPdf = kind === "text";
  const currentContextEpoch = [...turns]
    .reverse()
    .find((turn) => turn.run?.contextEpoch != null)?.run?.contextEpoch;
  const hasContextImage = turns.some(
    (turn) =>
      turn.run != null &&
      turn.run.contextEnabled !== false &&
      (currentContextEpoch == null || turn.run.contextEpoch === currentContextEpoch) &&
      ["succeeded", "partially_succeeded"].includes(turn.run.status) &&
      turn.outputs.some(
        (output) =>
          output.type === "image" &&
          !output.heldForReview &&
          output.fileAvailable !== false &&
          output.assetAvailable !== false,
      ),
  );
  const hasRemoteReference = Boolean(
    draft.publicShareDraftToken ||
      (draft.repeatRunId && !draft.replaceReference) ||
      (kind === "image" && draft.contextEnabled && hasContextImage),
  );
  const referenceInputVisible = Boolean(
    isTool ||
      kind === "image" ||
      (kind === "text" && capabilities?.acceptsReference) ||
      (kind === "video" &&
        capabilities?.acceptsReference &&
        capabilities.operations.includes("image_to_video")) ||
      draft.replaceReference ||
      (draft.promptConfigId && capabilities?.acceptsReference),
  );
  const activeReferences = useMemo(
    () =>
      referenceInputVisible
        ? references.map((reference) => reference.file)
        : [],
    [referenceInputVisible, references],
  );
  const hasReferenceIntent = activeReferences.length > 0 || hasRemoteReference;
  const resolvedOperation = resolveGenerationOperation({
    kind,
    supportedOperations: capabilities?.operations || [],
    hasReference: hasReferenceIntent,
    requiresImageToImage: Boolean(draft.publicShareDraftToken),
  });
  const referenceRequired = isReferenceRequired(
    resolvedOperation,
    isTool,
    draft.replaceReference,
  );
  const useConversationReference = Boolean(
    kind === "image" &&
      capabilities?.acceptsReference === true &&
      resolvedOperation !== null &&
      REFERENCE_REQUIRED_OPERATIONS.has(resolvedOperation) &&
      draft.contextEnabled &&
      hasContextImage &&
      activeReferences.length === 0 &&
      !draft.publicShareDraftToken &&
      !(draft.repeatRunId && !draft.replaceReference),
  );
  const referenceVisibilityMessage =
    references.length > 0 && !referenceInputVisible
      ? `Выбранная модель не принимает прикреплённые ${acceptsPdf ? "файлы" : "изображения"}`
      : null;
  const referenceCapabilityMessage =
    activeReferences.length > 0 && capabilities?.acceptsReference !== true
      ? `Выбранная модель не принимает входные ${acceptsPdf ? "файлы" : "изображения"}`
      : null;
  const referenceLimitMessage =
    activeReferences.length > maxReferenceFiles
      ? `Для выбранной модели можно приложить не более ${acceptsPdf ? formatFileCount(maxReferenceFiles) : formatImageCount(maxReferenceFiles)}`
      : null;
  const referenceBlockMessage =
    (!resolvedOperation
      ? "Выбранная модель не поддерживает нужный формат генерации"
      : null) ||
    referenceVisibilityMessage ||
    referenceCapabilityMessage ||
    referenceLimitMessage ||
    (referenceRequired
      ? capabilities?.acceptsReference !== true
        ? "Выбранная модель не принимает исходные изображения для этой генерации"
        : !hasReferenceIntent
          ? "Для генерации загрузите исходное изображение"
          : null
      : null);
  const hasPendingTurn = turns.some(
    (turn) =>
      turn.submissionState === "submitting" ||
      (turn.run != null &&
        (!TERMINAL_RUN_STATUSES.has(turn.run.status) ||
          (["succeeded", "partially_succeeded"].includes(turn.run.status) &&
            turn.outputs.length === 0))),
  );
  const promptReady = isTool || Boolean(draft.prompt.trim());
  const pricingBehaviorKey =
    selectedModel && resolvedOperation
      ? `${selectedModel.id}:${resolvedOperation}`
      : "";
  const pricingCalculation = pricingBehaviorKey
    ? pricingCalculationByKey[pricingBehaviorKey]
    : undefined;

  const addReferenceFiles = useCallback(
    (incomingFiles: readonly File[]) => {
      if (incomingFiles.length === 0) return;
      if (!referenceInputVisible) {
        setQuoteError(`Выбранная модель не принимает входные ${acceptsPdf ? "файлы" : "изображения"}`);
        return;
      }
      if (capabilities?.acceptsReference !== true) {
        setQuoteError(`Выбранная модель не принимает входные ${acceptsPdf ? "файлы" : "изображения"}`);
        return;
      }

      const current = referencesRef.current;
      const existingFingerprints = new Set(
        current.map((reference) => getFileFingerprint(reference.file)),
      );
      const acceptedFiles: File[] = [];
      let hasUnsupportedType = false;
      let hasOversizedFile = false;
      let hasDuplicate = false;

      incomingFiles.forEach((file) => {
        if (!acceptedReferenceMimeTypes.has(file.type)) {
          hasUnsupportedType = true;
          return;
        }
        if (file.size > maxReferenceFileBytes) {
          hasOversizedFile = true;
          return;
        }
        const fingerprint = getFileFingerprint(file);
        if (existingFingerprints.has(fingerprint)) {
          hasDuplicate = true;
          return;
        }
        existingFingerprints.add(fingerprint);
        acceptedFiles.push(file);
      });

      let retainedReferences = current;
      if (
        maxReferenceFiles === 1 &&
        current.length === 1 &&
        acceptedFiles.length > 0
      ) {
        URL.revokeObjectURL(current[0].previewUrl);
        retainedReferences = [];
      }

      const availableSlots = Math.max(
        0,
        maxReferenceFiles - retainedReferences.length,
      );
      const countLimitedFiles = acceptedFiles.slice(0, availableSlots);
      const hasExceededLimit = acceptedFiles.length > availableSlots;
      let totalBytes = retainedReferences.reduce(
        (sum, reference) => sum + reference.file.size,
        0,
      );
      let hasExceededTotalSize = false;
      const filesToAdd = countLimitedFiles.filter((file) => {
        if (totalBytes + file.size > PLATFORM_REFERENCE_TOTAL_BYTES_LIMIT) {
          hasExceededTotalSize = true;
          return false;
        }
        totalBytes += file.size;
        return true;
      });

      if (filesToAdd.length > 0) {
        const additions = filesToAdd.map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        }));
        const nextReferences = [...retainedReferences, ...additions];
        referencesRef.current = nextReferences;
        setReferences(nextReferences);
        setDraft((currentDraft) => ({
          ...currentDraft,
          publicShareDraftToken: "",
          replaceReference: currentDraft.repeatRunId
            ? true
            : currentDraft.replaceReference,
        }));
      }

      const validationMessage = hasUnsupportedType
        ? acceptsPdf
          ? "Поддерживаются файлы PDF и изображения JPG, PNG, WebP"
          : "Поддерживаются только изображения JPG, PNG и WebP"
        : hasOversizedFile
          ? `Один из ${acceptsPdf ? "файлов" : "изображений"} превышает лимит выбранной модели`
          : hasExceededTotalSize
            ? "Общий размер прикреплённых файлов не должен превышать 40 МБ"
            : hasExceededLimit
            ? `Для выбранной модели можно приложить не более ${acceptsPdf ? formatFileCount(maxReferenceFiles) : formatImageCount(maxReferenceFiles)}`
            : hasDuplicate
              ? `Этот ${acceptsPdf ? "файл" : "рисунок"} уже прикреплён`
              : null;
      setQuoteError(validationMessage);
      if (fileInput.current) fileInput.current.value = "";
    },
    [
      acceptedReferenceMimeTypes,
      acceptsPdf,
      capabilities?.acceptsReference,
      maxReferenceFileBytes,
      maxReferenceFiles,
      referenceInputVisible,
    ],
  );

  useEffect(() => {
    const handleClipboardPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented) return;
      const clipboardFiles = getClipboardFiles(event.clipboardData);
      if (clipboardFiles.length === 0) return;
      if (!referenceInputVisible) {
        setQuoteError(`Выбранная модель не принимает входные ${acceptsPdf ? "файлы" : "изображения"}`);
        return;
      }

      event.preventDefault();
      addReferenceFiles(clipboardFiles);
    };

    document.addEventListener("paste", handleClipboardPaste);
    return () => document.removeEventListener("paste", handleClipboardPaste);
  }, [acceptsPdf, addReferenceFiles, referenceInputVisible]);

  const quotePayload = useMemo<QuotePayload | null>(() => {
    if (
      !draftReady ||
      !selectedModel?.available ||
      !resolvedOperation ||
      hasPendingTurn ||
      referenceBlockMessage ||
      (isTool && !tool)
    ) {
      return null;
    }

    const pricingDraft =
      promptReady && pricingCalculation === "variable"
        ? draft
        : { ...draft, prompt: PRICE_PREVIEW_PROMPT };

    return buildQuotePayload({
      operation: resolvedOperation,
      draft: session.authenticated
        ? pricingDraft
        : { ...pricingDraft, conversationId: "" },
      model: selectedModel,
      tool,
      references: activeReferences,
      supportsContext,
      useConversationReference,
    });
  }, [
    activeReferences,
    draft,
    draftReady,
    hasPendingTurn,
    isTool,
    promptReady,
    pricingCalculation,
    referenceBlockMessage,
    resolvedOperation,
    selectedModel,
    session.authenticated,
    supportsContext,
    tool,
    useConversationReference,
  ]);
  const quoteFingerprint = quotePayload ? JSON.stringify(quotePayload) : "";
  const debouncedQuoteFingerprint = useDebouncedValue(quoteFingerprint, 700);

  useEffect(() => {
    let active = true;
    quoteRequestSequence.current += 1;
    queueMicrotask(() => {
      if (!active) return;
      setQuote(null);
      setQuoteError(null);
      setQuoteState(quoteFingerprint ? "debouncing" : "idle");
    });
    return () => {
      active = false;
    };
  }, [quoteFingerprint]);

  useEffect(() => {
    if (!debouncedQuoteFingerprint) return;
    const controller = new AbortController();
    const sequence = ++quoteRequestSequence.current;
    queueMicrotask(() => {
      if (!controller.signal.aborted && sequence === quoteRequestSequence.current) {
        setQuoteState("loading");
      }
    });
    void aiApiFetch<AiQuote | AiApiEnvelope<AiQuote>>("/quote", {
      method: "POST",
      body: JSON.parse(debouncedQuoteFingerprint) as QuotePayload,
      signal: controller.signal,
    })
      .then((payload) => {
        if (sequence !== quoteRequestSequence.current) return;
        const nextQuote = unwrapAiData(payload);
        setQuote(nextQuote);
        if (pricingBehaviorKey) {
          setPricingCalculationByKey((current) =>
            current[pricingBehaviorKey] === nextQuote.pricing.calculation
              ? current
              : {
                  ...current,
                  [pricingBehaviorKey]: nextQuote.pricing.calculation,
                },
          );
        }
        setQuoteError(null);
        setQuoteState("success");
      })
      .catch((error) => {
        if (controller.signal.aborted || sequence !== quoteRequestSequence.current) return;
        setQuote(null);
        setQuoteError(getAiErrorMessage(error));
        setQuoteState("error");
      });
    return () => controller.abort();
  }, [debouncedQuoteFingerprint, pricingBehaviorKey]);

  const updateTurn = useCallback((run: AiRunSummary, outputs?: AiRunOutput[]) => {
    setTurns((current) =>
      current.map((turn) =>
        turn.run?.id === run.id
          ? { ...turn, run, outputs: outputs ?? turn.outputs }
          : turn,
      ),
    );
  }, []);

  async function ensureConversation(
    submittedDraft: Draft,
    firstMessage: string,
    submissionEpoch: number,
  ): Promise<string> {
    if (submittedDraft.conversationId) return submittedDraft.conversationId;
    const payload = await aiApiFetch<AiConversation | AiApiEnvelope<AiConversation>>(
      "/conversations",
      {
        method: "POST",
        body: {
          kind: getConversationKind(kind),
          contextEnabled: supportsContext ? submittedDraft.contextEnabled : false,
          title: getConversationTitle(firstMessage, getCreateTitle(kind)),
        },
      },
    );
    const conversation = unwrapAiData(payload);
    if (viewEpoch.current === submissionEpoch) {
      setDraft((current) => ({ ...current, conversationId: conversation.id }));
      hydratedConversation.current = conversation.id;
    }
    conversationHistory.reload();
    return conversation.id;
  }

  async function requestFreshQuote(input: {
    conversationId: string;
    draft: Draft;
    model: AiPublicModel;
    operation: string;
    tool: AiPublicTool | null;
    references: File[];
    useConversationReference: boolean;
    submissionEpoch: number;
    pricingKey: string;
  }): Promise<AiQuote> {
    const payload = buildQuotePayload({
      operation: input.operation,
      draft: { ...input.draft, conversationId: input.conversationId },
      model: input.model,
      tool: input.tool,
      references: input.references,
      supportsContext,
      useConversationReference: input.useConversationReference,
    });
    if (viewEpoch.current === input.submissionEpoch) setQuoteState("loading");
    try {
      const response = await aiApiFetch<AiQuote | AiApiEnvelope<AiQuote>>("/quote", {
        method: "POST",
        body: payload,
      });
      const nextQuote = unwrapAiData(response);
      if (viewEpoch.current === input.submissionEpoch) {
        setQuote(nextQuote);
        if (input.pricingKey) {
          setPricingCalculationByKey((current) => ({
            ...current,
            [input.pricingKey]: nextQuote.pricing.calculation,
          }));
        }
        setQuoteState("success");
      }
      return nextQuote;
    } catch (error) {
      if (viewEpoch.current === input.submissionEpoch) {
        setQuote(null);
        setQuoteState("error");
      }
      throw error;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    if (!session.authenticated) {
      router.push(`/ai/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (isConversationLoading) {
      setQuoteError("Дождитесь загрузки чата");
      return;
    }
    if (hasPendingTurn) {
      setQuoteError("Дождитесь ответа на предыдущее сообщение");
      return;
    }
    if (!promptReady) {
      setQuoteError("Введите сообщение");
      return;
    }
    if (!resolvedOperation) {
      setQuoteError("Выбранная модель не поддерживает нужный формат генерации");
      return;
    }
    if (referenceBlockMessage) {
      setQuoteError(referenceBlockMessage);
      return;
    }
    if (!selectedModel || (isTool && !tool)) {
      setQuoteError("Выберите доступную модель");
      return;
    }

    const submittedDraft: Draft = {
      ...draft,
      toolValues: { ...draft.toolValues },
    };
    const submittedReferences = referenceInputVisible
      ? [...referencesRef.current]
      : [];
    const submittedFiles = submittedReferences.map((reference) => reference.file);
    const submittedPrompt =
      submittedDraft.prompt.trim() || getToolMessage(submittedDraft.toolValues);
    const submittedModel = selectedModel;
    const submittedOperation = resolvedOperation;
    const submittedTool = tool;
    const submittedUseConversationReference = useConversationReference;
    const submittedPricingKey = pricingBehaviorKey;
    const submissionEpoch = viewEpoch.current;
    const clientId = `local:${crypto.randomUUID()}`;
    const idempotencyKey = crypto.randomUUID();
    const submittedAt = new Date().toISOString();
    const inputFiles = submittedReferences.map(toLocalMessageAttachment);

    submitLock.current = true;

    setIsSubmitting(true);
    setQuoteError(null);
    setTurns((current) => [
      ...current,
      {
        id: clientId,
        run: null,
        prompt: submittedPrompt,
        outputs: [],
        inputFiles,
        createdAt: submittedAt,
        modelName: submittedModel.name,
        submissionState: "submitting",
      },
    ]);
    consumeReferences();
    setDraft((current) => ({
      ...current,
      idempotencyKey: "",
      prompt: "",
      publicShareDraftToken: "",
      repeatRunId: "",
      replaceReference: false,
    }));

    try {
      const conversationId = await ensureConversation(
        submittedDraft,
        submittedPrompt,
        submissionEpoch,
      );
      const freshQuote = await requestFreshQuote({
        conversationId,
        draft: submittedDraft,
        model: submittedModel,
        operation: submittedOperation,
        tool: submittedTool,
        references: submittedFiles,
        useConversationReference: submittedUseConversationReference,
        submissionEpoch,
        pricingKey: submittedPricingKey,
      });
      if (!freshQuote.supported) {
        throw new Error(
          freshQuote.unavailableReasons[0] || "Генерация с этими параметрами недоступна",
        );
      }

      const inputFileIds = await Promise.all(
        submittedReferences.map(async (reference) => {
          const upload = new FormData();
          upload.set("file", reference.file);
          const uploadPayload = await aiApiFetch<
            { id: string } | AiApiEnvelope<{ id: string }>
          >("/uploads", { method: "POST", body: upload, timeoutMs: 60_000 });
          return unwrapAiData(uploadPayload).id;
        }),
      );

      const runPayload = await aiApiFetch<AiRunSummary | AiApiEnvelope<AiRunSummary>>(
        "/runs",
        {
          method: "POST",
          body: {
            idempotencyKey,
            quoteId: freshQuote.quoteId,
            operation: submittedOperation,
            modelId: submittedDraft.modelId,
            conversationId,
            contextEnabled: supportsContext ? submittedDraft.contextEnabled : false,
            ...(submittedUseConversationReference
              ? { useConversationReference: true }
              : {}),
            ...(submittedDraft.promptConfigId
              ? { promptConfigId: submittedDraft.promptConfigId }
              : {}),
            ...(submittedDraft.publicShareDraftToken
              ? { publicShareDraftToken: submittedDraft.publicShareDraftToken }
              : {}),
            ...(submittedDraft.repeatRunId
              ? { retryRunId: submittedDraft.repeatRunId }
              : {}),
            ...(submittedTool ? { toolId: submittedTool.id } : {}),
            parameters: buildParameters(
              submittedDraft,
              submittedOperation,
              submittedFiles,
              submittedUseConversationReference,
            ),
            inputFileIds,
          },
          timeoutMs: 30_000,
        },
      );
      const nextRun = unwrapAiData(runPayload);
      if (viewEpoch.current === submissionEpoch) {
        setTurns((current) =>
          current.map((turn) =>
            turn.id === clientId
              ? {
                  ...turn,
                  run: nextRun,
                  createdAt: nextRun.createdAt,
                  modelName: nextRun.modelName,
                  submissionState: "active",
                }
              : turn,
          ),
        );
      }
      conversationHistory.reload();
    } catch (error) {
      const message = getAiErrorMessage(error);
      if (viewEpoch.current === submissionEpoch) {
        setTurns((current) =>
          current.map((turn) =>
            turn.id === clientId
              ? { ...turn, submissionState: "failed", submitError: message }
              : turn,
          ),
        );
        setQuoteError(message);
      }
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  function handleReference(event: ChangeEvent<HTMLInputElement>) {
    addReferenceFiles(Array.from(event.target.files || []));
  }

  function removeReference(referenceId: string) {
    const current = referencesRef.current;
    const removed = current.find((reference) => reference.id === referenceId);
    if (!removed) return;

    URL.revokeObjectURL(removed.previewUrl);
    const nextReferences = current.filter(
      (reference) => reference.id !== referenceId,
    );
    referencesRef.current = nextReferences;
    setReferences(nextReferences);
    setQuoteError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function clearReferences() {
    referencesRef.current.forEach((reference) =>
      URL.revokeObjectURL(reference.previewUrl),
    );
    referencesRef.current = [];
    setReferences([]);
    if (fileInput.current) fileInput.current.value = "";
  }

  function consumeReferences() {
    referencesRef.current = [];
    setReferences([]);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleContextChange(contextEnabled: boolean) {
    if (!supportsContext) return;
    const previous = draft.contextEnabled;
    setDraft((current) => ({ ...current, contextEnabled }));
    setConversationError(null);
    if (!draft.conversationId || !session.authenticated) return;
    setIsContextSaving(true);
    try {
      await aiApiFetch(`/conversations/${encodeURIComponent(draft.conversationId)}`, {
        method: "PATCH",
        body: { contextEnabled },
      });
    } catch (error) {
      setDraft((current) => ({ ...current, contextEnabled: previous }));
      setConversationError(getAiErrorMessage(error));
    } finally {
      setIsContextSaving(false);
    }
  }

  function startNewChat() {
    if (hasPendingTurn && !window.confirm("Текущая генерация ещё выполняется. Начать новый чат?")) {
      return;
    }
    viewEpoch.current += 1;
    hydratedConversation.current = null;
    clearReferences();
    setIsConversationLoading(false);
    setTurns([]);
    setConversationError(null);
    setIsHistoryOpen(false);
    setDraft((current) => ({
      ...current,
      conversationId: "",
      idempotencyKey: "",
      prompt: "",
      publicShareDraftToken: "",
      repeatRunId: "",
      replaceReference: false,
    }));
  }

  function selectConversation(conversationId: string) {
    if (conversationId === draft.conversationId) {
      setIsHistoryOpen(false);
      return;
    }
    if (hasPendingTurn && !window.confirm("Текущая генерация ещё выполняется. Открыть другой чат?")) {
      return;
    }
    viewEpoch.current += 1;
    clearReferences();
    hydratedConversation.current = null;
    setTurns([]);
    setConversationError(null);
    setIsConversationLoading(true);
    setIsHistoryOpen(false);
    setDraft((current) => ({
      ...current,
      conversationId,
      idempotencyKey: "",
      prompt: "",
      publicShareDraftToken: "",
      repeatRunId: "",
      replaceReference: false,
    }));
  }

  const requiresToolConfig = isTool && !tools.isLoading && !tool;
  const modelOptions: AiSelectOption<string>[] = availableModels.map((model) => ({
    value: model.id,
    label: model.name,
    description: model.available
      ? model.description || getModalityLabel(model.modality)
      : model.unavailableReason || "Временно недоступна",
    disabled: !model.available,
  }));

  return (
    <AiPage className={styles.workspacePage}>
      <div className={styles.workspace}>
        <div className={styles.compactHeader}>
          <Link className={styles.compactBack} href="/ai/create">
            <FiArrowLeft aria-hidden="true" />
            <span>Назад</span>
          </Link>
          <span aria-hidden="true" className={styles.compactDivider} />
          <h1>{getCreateTitle(kind)}</h1>
        </div>

        <div className={styles.workspaceBody}>
          <AsyncState
            error={models.error || (isTool ? tools.error : null)}
            isEmpty={!availableModels.length || requiresToolConfig}
            isLoading={models.isLoading || (isTool && tools.isLoading)}
            emptyTitle={requiresToolConfig ? "Инструмент пока не настроен" : "Нет доступных моделей"}
            emptyDescription={
              requiresToolConfig
                ? "Администратор должен опубликовать конфигурацию полей и связать модели."
                : "Включите модель и её маршрут в настройках AI-контура."
            }
            onRetry={() => {
              models.reload();
              tools.reload();
            }}
          >
            <form className={styles.layout} onSubmit={handleSubmit}>
          {isHistoryOpen ? (
            <button
              aria-label="Закрыть историю чатов"
              className={styles.historyBackdrop}
              type="button"
              onClick={() => setIsHistoryOpen(false)}
            />
          ) : null}

          <aside
            aria-label="История чатов"
            aria-modal={isHistoryOpen ? true : undefined}
            className={`${styles.history} ${isHistoryOpen ? styles.historyOpen : ""}`}
            id={`ai-chat-history-${kind}`}
            ref={historyRef}
            role={isHistoryOpen ? "dialog" : undefined}
            tabIndex={isHistoryOpen ? -1 : undefined}
          >
            <AiCard className={styles.historyCard}>
              <div className={styles.historyHeading}>
                <div>
                  <h2>История чатов</h2>
                </div>
                <button
                  aria-label="Закрыть историю чатов"
                  className={styles.historyClose}
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                >
                  <FiX aria-hidden="true" />
                </button>
              </div>
              <button
                className={styles.historyNewChat}
                type="button"
                onClick={startNewChat}
              >
                <FiPlus aria-hidden="true" /> Новый чат
              </button>

              <div className={styles.historyListArea} aria-live="polite">
                {!session.authenticated ? (
                  <div className={styles.historyState}>
                    <FiMessageCircle aria-hidden="true" />
                    <p>Войдите, чтобы сохранять и открывать историю чатов.</p>
                    <Link href={`/ai/auth?returnTo=${encodeURIComponent(`/ai/create/${kind}`)}`}>
                      Войти
                    </Link>
                  </div>
                ) : conversationHistory.isLoading ? (
                  <div className={styles.historyState} role="status">
                    <FiRefreshCw aria-hidden="true" className={styles.spinningIcon} />
                    <p>Загружаем чаты…</p>
                  </div>
                ) : conversationHistory.error ? (
                  <div className={styles.historyState} role="alert">
                    <p>{conversationHistory.error}</p>
                    <button type="button" onClick={conversationHistory.reload}>
                      Повторить
                    </button>
                  </div>
                ) : visibleConversations.length ? (
                  <ul className={styles.historyList}>
                    {visibleConversations.map((conversation) => {
                      const isActive = conversation.id === draft.conversationId;
                      return (
                        <li key={conversation.id}>
                          <button
                            aria-current={isActive ? "page" : undefined}
                            className={isActive ? styles.historyItemActive : ""}
                            type="button"
                            onClick={() => selectConversation(conversation.id)}
                          >
                            <span><FiMessageCircle aria-hidden="true" /></span>
                            <span>
                              <strong>{conversation.title || "Чат без названия"}</strong>
                              <time dateTime={conversation.updatedAt}>
                                {formatConversationDate(conversation.updatedAt)}
                              </time>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className={styles.historyState}>
                    <FiMessageCircle aria-hidden="true" />
                    <p>Здесь появятся ваши сохранённые чаты.</p>
                  </div>
                )}
              </div>
            </AiCard>
          </aside>

          <AiCard className={styles.chat}>
            <div className={styles.chatToolbar}>
              <div>
                <span className={styles.onlineDot} aria-hidden="true" />
                <strong>{selectedModel?.name || "AI-модель"}</strong>
                {resolvedOperation ? (
                  <small>{getOperationLabel(resolvedOperation)}</small>
                ) : null}
              </div>
              <div className={styles.mobileToolbarActions}>
                <button
                  aria-controls={`ai-chat-history-${kind}`}
                  aria-expanded={isHistoryOpen}
                  className={styles.mobileHistoryButton}
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setIsHistoryOpen(true);
                  }}
                >
                  <FiMessageCircle aria-hidden="true" />
                  История
                </button>
                <button
                  aria-controls={`ai-chat-settings-${kind}`}
                  aria-expanded={isSettingsOpen}
                  className={styles.mobileSettingsButton}
                  type="button"
                  onClick={() => {
                    setIsHistoryOpen(false);
                    setIsSettingsOpen(true);
                  }}
                >
                  <FiSettings aria-hidden="true" />
                  Настройки
                </button>
              </div>
            </div>

            <div aria-live="polite" className={styles.thread} ref={thread}>
              {isConversationLoading ? (
                <div className={styles.conversationLoading} role="status">
                  <FiRefreshCw aria-hidden="true" />
                  Загружаем чат…
                </div>
              ) : turns.length ? (
                turns.map((turn) => (
                  <ChatTurnMessage
                    createdAt={turn.createdAt}
                    initialOutputs={turn.outputs}
                    inputFiles={turn.inputFiles}
                    key={turn.id}
                    modelName={turn.modelName}
                    prompt={turn.prompt}
                    run={turn.run}
                    submissionState={turn.submissionState}
                    submitError={turn.submitError}
                    onUpdate={updateTurn}
                  />
                ))
              ) : (
                <div className={styles.emptyChat}>
                  <span><RiSparkling2Fill aria-hidden="true" /></span>
                  <h2>Начните диалог</h2>
                  <p>
                    {kind === "image"
                      ? "Опишите изображение. Следующий запрос сможет учитывать предыдущий результат."
                      : kind === "video"
                        ? "Опишите ролик — каждый запрос будет самостоятельной генерацией."
                        : isTool
                          ? "Добавьте фотографию и выберите формат результата в настройках."
                          : "Задайте вопрос или опишите задачу — ответ появится прямо здесь."}
                  </p>
                </div>
              )}
            </div>

            <div className={styles.composer}>
              {referenceInputVisible && hasRemoteReference && references.length === 0 ? (
                <div className={`${styles.composerAttachment} ${styles.composerRemoteAttachment}`}>
                  <FiCheck aria-hidden="true" />
                  <span>
                    {kind === "image" && draft.contextEnabled && hasContextImage
                      ? "Прикреплён последний результат этого чата"
                      : draft.publicShareDraftToken
                        ? "Прикреплено изображение из публичной работы"
                        : "Прикреплён исходный файл генерации"}
                  </span>
                </div>
              ) : null}
              {references.length ? (
                <ul
                  aria-label={`Прикреплено: ${acceptsPdf ? formatFileCount(references.length) : formatImageCount(references.length)}`}
                  aria-live="polite"
                  className={styles.composerAttachments}
                >
                  {references.map((reference) => (
                    <li className={styles.composerAttachment} key={reference.id}>
                      {reference.file.type.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local object URL
                        <img alt="" src={reference.previewUrl} />
                      ) : (
                        <FiFileText aria-hidden="true" />
                      )}
                      <span>{reference.file.name}</span>
                      <small>{formatFileSize(reference.file.size)}</small>
                      <button
                        aria-label={`Удалить файл ${reference.file.name}`}
                        type="button"
                        onClick={() => removeReference(reference.id)}
                      >
                        <FiX aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <input
                ref={fileInput}
                accept={
                  acceptsPdf
                    ? "image/jpeg,image/png,image/webp,application/pdf"
                    : "image/jpeg,image/png,image/webp"
                }
                aria-required={referenceRequired}
                className={styles.visuallyHidden}
                multiple={maxReferenceFiles > 1}
                type="file"
                onChange={handleReference}
              />
              {!isTool ? (
                <label className={styles.composerField}>
                  <span className={styles.visuallyHidden}>Сообщение</span>
                  <textarea
                    ref={composerInput}
                    maxLength={10_000}
                    placeholder={getComposerPlaceholder(kind)}
                    required
                    rows={3}
                    value={draft.prompt}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, prompt: event.target.value }))
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                </label>
              ) : (
                <p className={styles.toolComposerText}>
                  Настройте формат результата и прикрепите фото, затем отправьте сообщение.
                </p>
              )}
              <div className={styles.composerActions}>
                {referenceInputVisible ? (
                  <button
                    aria-label={
                      maxReferenceFiles > 1
                        ? `Прикрепить ${acceptsPdf ? "файлы" : "изображения"}, максимум ${maxReferenceFiles}`
                        : `Прикрепить ${acceptsPdf ? "файл" : "изображение"}`
                    }
                    className={styles.attachButton}
                    type="button"
                    onClick={() => fileInput.current?.click()}
                  >
                    <FiPaperclip aria-hidden="true" />
                  </button>
                ) : null}
                <div
                  aria-label={getQuoteAriaLabel(quote, quoteState)}
                  aria-live="polite"
                  className={styles.composerPrice}
                >
                  {quote ? (
                    <>
                      <FiZap aria-hidden="true" />
                      <strong>{formatCreditNumber(quote.reserveCredits)}</strong>
                    </>
                  ) : quoteState === "debouncing" || quoteState === "loading" ? (
                    <span aria-hidden="true" className={styles.quoteSpinner} />
                  ) : null}
                </div>
                <button
                  aria-label={session.authenticated ? "Отправить сообщение" : "Войти и отправить"}
                  className={styles.sendButton}
                  disabled={
                    isSubmitting ||
                    isConversationLoading ||
                    hasPendingTurn ||
                    !selectedModel?.available ||
                    !promptReady ||
                    Boolean(referenceBlockMessage) ||
                    Boolean(quote && !quote.supported)
                  }
                  type="submit"
                >
                  {isSubmitting ? <FiClock aria-hidden="true" /> : <FiSend aria-hidden="true" />}
                </button>
              </div>
              {referenceBlockMessage ? (
                <FieldMessage>{referenceBlockMessage}</FieldMessage>
              ) : quoteError ? (
                <FieldMessage>{quoteError}</FieldMessage>
              ) : null}
            </div>
          </AiCard>

          {isSettingsOpen ? (
            <button
              aria-label="Закрыть настройки"
              className={styles.settingsBackdrop}
              type="button"
              onClick={() => setIsSettingsOpen(false)}
            />
          ) : null}

          <aside
            aria-label="Настройки генерации"
            className={`${styles.settings} ${isSettingsOpen ? styles.settingsOpen : ""}`}
            id={`ai-chat-settings-${kind}`}
            ref={settingsRef}
            role={isSettingsOpen ? "dialog" : undefined}
            aria-modal={isSettingsOpen ? true : undefined}
            tabIndex={isSettingsOpen ? -1 : undefined}
          >
            <AiCard className={styles.settingsCard}>
              <div className={styles.settingsHeading}>
                <div>
                  <span>Параметры</span>
                  <h2>Настройки чата</h2>
                </div>
                <button
                  aria-label="Закрыть настройки"
                  className={styles.settingsClose}
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  <FiX aria-hidden="true" />
                </button>
              </div>

              <AiSelect
                id={`ai-model-${kind}`}
                label="Нейросеть"
                options={modelOptions}
                value={draft.modelId}
                onChange={(modelId) =>
                  setDraft((current) => ({ ...current, modelId }))
                }
              />

              {supportsContext ? (
                <label className={styles.contextToggle}>
                  <span>
                    <strong>Сохранять контекст</strong>
                    <small>
                      {kind === "image"
                        ? "Следующий запрос учтёт историю и последний успешный результат."
                        : "Следующий ответ учтёт предыдущие сообщения этого чата."}
                    </small>
                  </span>
                  <input
                    checked={draft.contextEnabled}
                    disabled={isContextSaving}
                    type="checkbox"
                    onChange={(event) => void handleContextChange(event.target.checked)}
                  />
                  <i aria-hidden="true" />
                </label>
              ) : kind === "video" ? (
                <div className={styles.contextNotice}>
                  <FiVideo aria-hidden="true" />
                  <p><strong>Видео без контекста</strong><span>Предыдущий ролик не отправляется модели.</span></p>
                </div>
              ) : isTool ? (
                <div className={styles.contextNotice}>
                  <FiImage aria-hidden="true" />
                  <p><strong>Отдельный анализ</strong><span>В инструмент передаётся только выбранная фотография.</span></p>
                </div>
              ) : null}

              {conversationError ? <FieldMessage>{conversationError}</FieldMessage> : null}

              {isTool ? (
                <DynamicToolFields
                  fields={tool?.fields || []}
                  values={draft.toolValues}
                  onChange={(code, value) =>
                    setDraft((current) => ({
                      ...current,
                      toolValues: { ...current.toolValues, [code]: value },
                    }))
                  }
                />
              ) : null}

              {!isTool && capabilities?.acceptsNegativePrompt ? (
                <label className={styles.field}>
                  <span>Негативный промпт <em>необязательно</em></span>
                  <textarea
                    placeholder="Что не должно появиться в результате"
                    rows={3}
                    value={draft.negativePrompt}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        negativePrompt: event.target.value,
                      }))
                    }
                  />
                </label>
              ) : null}

              {!isTool ? (
                <CapabilityFields
                  draft={draft}
                  model={selectedModel}
                  onChange={(patch) =>
                    setDraft((current) => ({ ...current, ...patch }))
                  }
                />
              ) : null}

            </AiCard>
          </aside>
            </form>
          </AsyncState>
        </div>
      </div>
    </AiPage>
  );
}

function ChatTurnMessage({
  createdAt,
  inputFiles,
  modelName,
  prompt,
  run: initialRun,
  initialOutputs,
  submissionState,
  submitError,
  onUpdate,
}: {
  createdAt: string;
  inputFiles: ChatMessageAttachment[];
  modelName: string;
  prompt: string;
  run: AiRunSummary | null;
  initialOutputs: AiRunOutput[];
  submissionState: ChatTurn["submissionState"];
  submitError?: string | null;
  onUpdate: (run: AiRunSummary, outputs?: AiRunOutput[]) => void;
}) {
  const { refresh } = useAiSession();
  const [polledRun, setPolledRun] = useState<AiRunSummary | null>(null);
  const [resolvedOutputs, setResolvedOutputs] = useState<{
    runId: string;
    outputs: AiRunOutput[];
  } | null>(null);
  const [work, setWork] = useState<AiWorkDetail | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const run =
    initialRun && polledRun?.id === initialRun.id ? polledRun : initialRun;
  const runId = run?.id || null;
  const outputs =
    runId && resolvedOutputs?.runId === runId
      ? resolvedOutputs.outputs
      : initialOutputs;
  const isFinished = run ? TERMINAL_RUN_STATUSES.has(run.status) : false;
  const isGenerating =
    submissionState === "submitting" || Boolean(run && !isFinished);
  const hasSuccessfulResult = Boolean(
    run && ["succeeded", "partially_succeeded"].includes(run.status),
  );
  const messageCreatedAt = run?.createdAt || createdAt;
  const effectiveModelName = run?.modelName || modelName;

  useEffect(() => {
    return () => {
      inputFiles.forEach((file) => {
        if (file.localObjectUrl && file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, [inputFiles]);

  useEffect(() => {
    if (!runId || isFinished) return;
    let active = true;
    let timer: number | null = null;
    let failures = 0;
    const schedule = (delay: number) => {
      if (!active) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => void poll(), delay);
    };
    const poll = async () => {
      timer = null;
      if (!active) return;
      if (document.visibilityState === "hidden") {
        schedule(10_000);
        return;
      }
      try {
        const payload = await aiApiFetch<AiRunSummary | AiApiEnvelope<AiRunSummary>>(
          `/runs/${runId}`,
        );
        if (!active) return;
        const nextRun = unwrapAiData(payload);
        setPolledRun(nextRun);
        onUpdate(nextRun);
        setPollError(null);
        failures = 0;
        if (!TERMINAL_RUN_STATUSES.has(nextRun.status)) schedule(2_500);
      } catch (error) {
        if (!active) return;
        failures += 1;
        setPollError(getAiErrorMessage(error));
        schedule(Math.min(30_000, 2_500 * 2 ** failures));
      }
    };
    schedule(2_000);
    return () => {
      active = false;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [isFinished, onUpdate, runId]);

  useEffect(() => {
    if (!isFinished || !runId) return;
    const controller = new AbortController();
    void aiApiFetch<AiRunDetail | AiApiEnvelope<AiRunDetail>>(
      `/runs/${encodeURIComponent(runId)}`,
      { signal: controller.signal },
    )
      .then(async (payload) => {
        const detail = unwrapAiData(payload);
        setPolledRun(detail);
        setResolvedOutputs({ runId: detail.id, outputs: detail.outputs });
        onUpdate(detail, detail.outputs);
        if (detail.workId) {
          const workPayload = await aiApiFetch<AiWorkDetail | AiApiEnvelope<AiWorkDetail>>(
            `/works/${encodeURIComponent(detail.workId)}`,
            { signal: controller.signal },
          );
          setWork(unwrapAiData(workPayload));
        }
        await refresh();
      })
      .catch((error) => {
        if (!controller.signal.aborted) setPollError(getAiErrorMessage(error));
      });
    return () => controller.abort();
  }, [isFinished, onUpdate, refresh, runId]);

  const copyableResult = getCopyableResult(outputs, work);

  return (
    <article className={styles.turn}>
      <div className={styles.userMessage}>
        {inputFiles.length ? <ChatMessageAttachments files={inputFiles} /> : null}
        <p>{prompt}</p>
        <div className={styles.userMessageMeta}>
          <time dateTime={messageCreatedAt}>{formatMessageDate(messageCreatedAt)}</time>
          <CopyMessageButton label="Скопировать запрос" text={prompt} tone="user" />
        </div>
      </div>
      <div className={styles.assistantRow}>
        <span className={styles.assistantAvatar}><RiSparkling2Fill aria-hidden="true" /></span>
        <div
          aria-label={isGenerating ? `${effectiveModelName} формирует ответ` : undefined}
          className={`${styles.assistantMessage} ${isGenerating ? styles.typingMessage : ""}`}
          role={isGenerating ? "status" : undefined}
        >
          <div className={styles.messageMeta}>
            <strong>{effectiveModelName}</strong>
          </div>
          {isGenerating ? (
            <div aria-hidden="true" className={styles.typingIndicator}>
              <span />
              <span />
              <span />
            </div>
          ) : null}
          {hasSuccessfulResult ? <ChatOutputs outputs={outputs} work={work} /> : null}
          {submitError ? <FieldMessage>{submitError}</FieldMessage> : null}
          {run?.errorMessage ? <FieldMessage>{run.errorMessage}</FieldMessage> : null}
          {pollError ? <FieldMessage>{pollError}</FieldMessage> : null}
          {isFinished || submissionState === "failed" ? (
            <div className={styles.messageFooter}>
              <time dateTime={messageCreatedAt}>{formatMessageDate(messageCreatedAt)}</time>
              {copyableResult ? (
                <CopyMessageButton label="Скопировать результат" text={copyableResult} />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CopyMessageButton({
  text,
  label,
  tone = "assistant",
}: {
  text: string;
  label: string;
  tone?: "user" | "assistant";
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  async function copy() {
    try {
      await writeClipboardText(text);
      setState("copied");
    } catch {
      setState("error");
    }
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setState("idle"), 2_000);
  }

  const stateLabel = state === "copied" ? "Скопировано" : state === "error" ? "Не удалось" : "Копировать";

  return (
    <button
      aria-label={state === "idle" ? label : stateLabel}
      aria-live="polite"
      className={`${styles.copyButton} ${tone === "user" ? styles.copyButtonUser : ""}`}
      title={state === "idle" ? label : stateLabel}
      type="button"
      onClick={() => void copy()}
    >
      {state === "copied" ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
    </button>
  );
}

function ChatMessageAttachments({ files }: { files: ChatMessageAttachment[] }) {
  return (
    <ul aria-label="Прикреплённые файлы" className={styles.messageAttachments}>
      {files.map((file) => {
        const isImage = file.mimeType?.startsWith("image/") && file.previewUrl;
        const label = file.name || (isImage ? "Изображение" : "Файл");
        const details = formatAttachmentDetails(file);
        const content = (
          <>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed or local private URL
              <img alt="" src={file.previewUrl || undefined} />
            ) : (
              <span className={styles.messageAttachmentIcon}>
                <FiPaperclip aria-hidden="true" />
              </span>
            )}
            <span className={styles.messageAttachmentText}>
              <strong>{label}</strong>
              {details ? <small>{details}</small> : null}
            </span>
          </>
        );

        return (
          <li key={file.id}>
            {file.assetAvailable !== false && file.previewUrl ? (
              <a
                aria-label={`Открыть файл ${label}`}
                href={file.previewUrl}
                rel="noreferrer"
                target="_blank"
              >
                {content}
              </a>
            ) : (
              <div>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function getCopyableResult(outputs: AiRunOutput[], work: AiWorkDetail | null): string {
  const workOutputs = work?.outputs || [];
  const source: Array<AiRunOutput | AiWorkOutput> = workOutputs.length
    ? workOutputs
    : outputs;
  return source
    .filter(
      (output) =>
        output.type === "text" &&
        !output.heldForReview &&
        !output.deletedAt &&
        !("deletedByRetention" in output && output.deletedByRetention),
    )
    .map((output) => output.text?.trim() || "")
    .filter(Boolean)
    .join("\n\n");
}

function ChatOutputs({ outputs, work }: { outputs: AiRunOutput[]; work: AiWorkDetail | null }) {
  const workOutputs = work?.outputs || [];
  if (!outputs.length && !workOutputs.length) {
    return <p className={styles.emptyOutput}>Результат сохранён в «Моих работах».</p>;
  }
  return (
    <div className={styles.outputList}>
      {(workOutputs.length ? workOutputs : outputs).map((output) => (
        <ChatOutput key={output.id} output={output} />
      ))}
    </div>
  );
}

function ChatOutput({ output }: { output: AiRunOutput | AiWorkOutput }) {
  if (output.heldForReview) {
    return <FieldMessage tone="notice">Результат ожидает проверки модерации.</FieldMessage>;
  }
  if (output.type === "text" && output.text) {
    return <div className={styles.textOutput}>{output.text}</div>;
  }
  const media = getOutputMediaUrl(output);
  if (output.type === "image" && media) {
    const originalUrl = output.outputUrl || ("url" in output ? output.url : null) || media;
    return (
      <ChatImageOutput
        alt="Результат генерации"
        copyUrl={output.copyUrl}
        downloadUrl={output.downloadUrl}
        fileName={getImageFileName(output)}
        height={output.height}
        previewUrl={output.previewUrl}
        url={originalUrl}
        width={output.width}
      />
    );
  }
  if (output.type === "video" && media) {
    return <video className={styles.videoOutput} controls playsInline preload="metadata" src={media} />;
  }
  if (("deletedByRetention" in output && output.deletedByRetention) || output.deletedAt) {
    return <p className={styles.emptyOutput}>Файл удалён по сроку хранения.</p>;
  }
  return <p className={styles.emptyOutput}>Результат доступен на странице работы.</p>;
}

function getOutputMediaUrl(output: AiRunOutput | AiWorkOutput): string | null {
  return (
    ("outputUrl" in output ? output.outputUrl || output.previewUrl : null) ||
    ("url" in output ? output.url : null) ||
    null
  );
}

function CapabilityFields({
  draft,
  model,
  onChange,
}: {
  draft: Draft;
  model: AiPublicModel | null;
  onChange: (patch: Partial<Draft>) => void;
}) {
  if (!model) return null;
  const { capabilities } = model;
  const fields: React.ReactNode[] = [];
  if (capabilities.aspectRatios?.length) {
    fields.push(
      <OptionField id="aspect-ratio" key="aspect" label="Соотношение сторон" value={draft.aspectRatio} values={capabilities.aspectRatios} onChange={(aspectRatio) => onChange({ aspectRatio })} />,
    );
  }
  
  if (capabilities.durations?.length) {
    fields.push(
      <OptionField id="duration" key="duration" label="Длительность, сек." value={draft.duration} values={capabilities.durations} onChange={(duration) => onChange({ duration })} />,
    );
  }
  if (capabilities.resolutions?.length) {
    fields.push(
      <OptionField id="resolution" key="resolution" label="Разрешение" value={draft.resolution} values={capabilities.resolutions} onChange={(resolution) => onChange({ resolution })} />,
    );
  }
  if (capabilities.qualities?.length) {
    fields.push(
      <OptionField
        id="quality"
        key="quality"
        label="Детализация"
        optionLabel={getDetailLabel}
        value={draft.quality}
        values={capabilities.qualities}
        onChange={(quality) => onChange({ quality })}
      />,
    );
  }
  if (capabilities.acceptsSound) {
    fields.push(
      <label className={styles.contextToggle} key="sound">
        <span><strong>Создать со звуком</strong><small>Если модель поддерживает аудиодорожку.</small></span>
        <input checked={draft.sound} type="checkbox" onChange={(event) => onChange({ sound: event.target.checked })} />
        <i aria-hidden="true" />
      </label>,
    );
  }
  const countField = capabilities.outputCounts?.length ? (
    <CountStepper
      value={draft.outputCount}
      values={capabilities.outputCounts}
      onChange={(outputCount) => onChange({ outputCount })}
    />
  ) : null;

  return fields.length || countField ? (
    <div className={styles.capabilityFields}>
      {fields}
      {countField}
    </div>
  ) : null;
}

function OptionField({
  id,
  label,
  value,
  values,
  optionLabel = String,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  values: Array<string | number>;
  optionLabel?: (value: string | number) => string;
  onChange: (value: string) => void;
}) {
  return (
    <AiSelect
      id={`generation-${id}`}
      label={label}
      options={values.map((option) => ({ value: String(option), label: optionLabel(option) }))}
      value={value}
      onChange={onChange}
    />
  );
}

function getDetailLabel(value: string | number): string {
  const normalized = String(value);
  const labels: Record<string, string> = {
    auto: "Автоматическая",
    draft: "Черновая",
    low: "Низкая",
    medium: "Средняя",
    standard: "Стандартная",
    high: "Высокая",
    hd: "HD",
    ultra: "Максимальная",
  };
  return labels[normalized.toLowerCase()] || normalized;
}

function CountStepper({
  value,
  values,
  onChange,
}: {
  value: string;
  values: number[];
  onChange: (value: string) => void;
}) {
  const allowedValues = [...new Set(values)]
    .filter((item) => Number.isInteger(item) && item > 0)
    .sort((left, right) => left - right);
  if (!allowedValues.length) return null;

  const currentValue = Number(value);
  const currentIndex = Math.max(0, allowedValues.indexOf(currentValue));
  const resolvedValue = allowedValues[currentIndex] ?? allowedValues[0];
  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < allowedValues.length - 1;

  return (
    <div className={styles.countField}>
      <span id="generation-output-count-label">Количество</span>
      <div
        aria-labelledby="generation-output-count-label"
        className={styles.countStepper}
        role="group"
      >
        <button
          aria-label="Уменьшить количество результатов"
          disabled={!canDecrease}
          type="button"
          onClick={() => onChange(String(allowedValues[currentIndex - 1]))}
        >
          <FiMinus aria-hidden="true" />
        </button>
        <output aria-live="polite">
          {resolvedValue}
        </output>
        <button
          aria-label="Увеличить количество результатов"
          disabled={!canIncrease}
          type="button"
          onClick={() => onChange(String(allowedValues[currentIndex + 1]))}
        >
          <FiPlus aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function DynamicToolFields({
  fields,
  values,
  onChange,
}: {
  fields: AiToolField[];
  values: Record<string, string | number | boolean>;
  onChange: (code: string, value: string | number | boolean) => void;
}) {
  return (
    <div className={styles.dynamicFields}>
      {fields.filter((field) => field.type !== "file").map((field) => {
        const current = values[field.code] ?? "";
        if (field.type === "boolean") {
          return (
            <label className={styles.contextToggle} key={field.code}>
              <span><strong>{field.label}</strong>{field.description ? <small>{field.description}</small> : null}</span>
              <input checked={Boolean(current)} type="checkbox" onChange={(event) => onChange(field.code, event.target.checked)} />
              <i aria-hidden="true" />
            </label>
          );
        }
        if (field.type === "select") {
          return (
            <AiSelect
              id={`tool-${field.code}`}
              key={field.code}
              label={field.label}
              description={field.description || undefined}
              required={field.required}
              options={(field.options || []).map((option) => ({ value: String(option.value), label: option.label }))}
              value={String(current)}
              onChange={(value) => onChange(field.code, value)}
            />
          );
        }
        return (
          <label className={styles.field} key={field.code}>
            <span>{field.label}</span>
            {field.type === "textarea" ? (
              <textarea placeholder={field.placeholder || ""} required={field.required} rows={3} value={String(current)} onChange={(event) => onChange(field.code, event.target.value)} />
            ) : (
              <input max={field.maximum ?? undefined} min={field.minimum ?? undefined} placeholder={field.placeholder || ""} required={field.required} type={field.type === "number" ? "number" : "text"} value={String(current)} onChange={(event) => onChange(field.code, field.type === "number" ? Number(event.target.value) : event.target.value)} />
            )}
            {field.description ? <small>{field.description}</small> : null}
          </label>
        );
      })}
    </div>
  );
}

function buildQuotePayload({
  operation,
  draft,
  model,
  tool,
  references,
  supportsContext,
  useConversationReference,
}: {
  operation: string;
  draft: Draft;
  model: AiPublicModel;
  tool: AiPublicTool | null;
  references: readonly File[];
  supportsContext: boolean;
  useConversationReference: boolean;
}): QuotePayload {
  return {
    operation,
    modelId: model.id,
    ...(draft.promptConfigId ? { promptConfigId: draft.promptConfigId } : {}),
    ...(tool ? { toolId: tool.id } : {}),
    ...(draft.conversationId ? { conversationId: draft.conversationId } : {}),
    ...(supportsContext && draft.conversationId
      ? { contextEnabled: draft.contextEnabled }
      : {}),
    ...(useConversationReference ? { useConversationReference: true } : {}),
    parameters: buildParameters(
      draft,
      operation,
      references,
      useConversationReference,
    ),
  };
}

function buildParameters(
  draft: Draft,
  operation: string,
  references: readonly File[],
  useConversationReference: boolean,
) {
  const hasReference = Boolean(
    references.length ||
      draft.publicShareDraftToken ||
      (draft.repeatRunId &&
        !draft.replaceReference &&
        REFERENCE_REQUIRED_OPERATIONS.has(operation)) ||
      useConversationReference,
  );
  return {
    prompt: draft.prompt,
    ...(draft.negativePrompt ? { negativePrompt: draft.negativePrompt } : {}),
    ...(draft.aspectRatio ? { aspectRatio: draft.aspectRatio } : {}),
    ...(draft.outputCount ? { count: Number(draft.outputCount) } : {}),
    ...(draft.duration ? { duration: Number(draft.duration) } : {}),
    ...(draft.resolution ? { resolution: draft.resolution } : {}),
    ...(draft.quality ? { quality: draft.quality } : {}),
    ...(draft.sound ? { sound: true } : {}),
    ...(hasReference ? { hasReference: true } : {}),
    ...draft.toolValues,
  };
}

function isReferenceRequired(
  operation: string | null,
  isTool: boolean,
  replaceReference: boolean,
): boolean {
  return Boolean(
    isTool ||
      replaceReference ||
      (operation && REFERENCE_REQUIRED_OPERATIONS.has(operation)),
  );
}

function retryParametersToDraft(parameters: Record<string, unknown>): Partial<Draft> {
  const standardKeys = new Set([
    "prompt",
    "negativePrompt",
    "aspectRatio",
    "count",
    "duration",
    "resolution",
    "quality",
    "sound",
    "hasReference",
    "estimatedInputTokens",
  ]);
  const toolValues = Object.fromEntries(
    Object.entries(parameters).filter(
      (entry): entry is [string, string | number | boolean] =>
        !standardKeys.has(entry[0]) && ["string", "number", "boolean"].includes(typeof entry[1]),
    ),
  );
  return {
    prompt: typeof parameters.prompt === "string" ? parameters.prompt : "",
    negativePrompt: typeof parameters.negativePrompt === "string" ? parameters.negativePrompt : "",
    aspectRatio: typeof parameters.aspectRatio === "string" ? parameters.aspectRatio : "",
    outputCount: typeof parameters.count === "number" || typeof parameters.count === "string" ? String(parameters.count) : "",
    duration: typeof parameters.duration === "number" || typeof parameters.duration === "string" ? String(parameters.duration) : "",
    resolution: typeof parameters.resolution === "string" ? parameters.resolution : "",
    quality: typeof parameters.quality === "string" ? parameters.quality : "",
    sound: parameters.sound === true,
    toolValues,
  };
}

function getModality(kind: GenerationChatKind): AiModelModality {
  if (kind === "photo-to-prompt") return "vision";
  return kind;
}

function getConversationKind(kind: GenerationChatKind): AiConversationKind {
  if (kind === "photo-to-prompt") return "text";
  return kind;
}

function getCreateTitle(kind: GenerationChatKind): string {
  return {
    image: "Генерация изображений",
    video: "Генерация видео",
    text: "Генерация текста",
    "photo-to-prompt": "Промпт из фотографии",
  }[kind];
}

function getComposerPlaceholder(kind: GenerationChatKind): string {
  return {
    image: "Опишите изображение, стиль, свет и важные детали…",
    video: "Опишите сцену, движение камеры и атмосферу…",
    text: "Напишите сообщение…",
    "photo-to-prompt": "",
  }[kind];
}

function getOperationLabel(operation: string): string {
  const labels: Record<string, string> = {
    text_to_image: "Текст → изображение",
    image_to_image: "Продолжить с изображением",
    image_edit: "Редактировать изображение",
    text_to_video: "Текст → видео",
    image_to_video: "Изображение → видео",
    text_generation: "Текстовый ответ",
    photo_to_prompt: "Фото → промпт",
  };
  return labels[operation] || operation.replaceAll("_", " ");
}

function getModalityLabel(modality: AiModelModality): string {
  return { text: "Текст", image: "Изображения", video: "Видео", vision: "Анализ изображений" }[modality];
}

function getToolMessage(values: Record<string, string | number | boolean>): string {
  const valuesText = Object.values(values).filter((value) => value !== "").join(" · ");
  return valuesText ? `Промпт из фотографии · ${valuesText}` : "Получить промпт из фотографии";
}

function getConversationTitle(message: string, fallback: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  if (normalized.length <= 72) return normalized;
  return `${normalized.slice(0, 69).trimEnd()}…`;
}

function formatConversationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Недавно";
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return `Сегодня, ${date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

function formatMessageDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата неизвестна";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getQuoteAriaLabel(
  quote: AiQuote | null,
  state: "idle" | "debouncing" | "loading" | "success" | "error",
): string {
  if (quote) return `Цена: ${formatCredits(quote.reserveCredits)}`;
  if (state === "debouncing" || state === "loading") return "Цена рассчитывается";
  if (state === "error") return "Не удалось рассчитать цену";
  return "Цена пока недоступна";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function toLocalMessageAttachment(
  reference: PendingReference,
): ChatMessageAttachment {
  return {
    id: reference.id,
    role: "reference",
    name: reference.file.name,
    mimeType: reference.file.type || null,
    sizeBytes: String(reference.file.size),
    width: null,
    height: null,
    durationMs: null,
    assetAvailable: true,
    previewUrl: reference.previewUrl,
    downloadUrl: null,
    deletedAt: null,
    localObjectUrl: true,
  };
}

function formatAttachmentDetails(file: AiMessageAttachment): string {
  const details: string[] = [];
  if (file.mimeType === "application/pdf") details.push("PDF");
  if (file.width && file.height) details.push(`${file.width} × ${file.height} px`);
  const bytes = Number(file.sizeBytes);
  if (Number.isFinite(bytes) && bytes > 0) details.push(formatFileSize(bytes));
  return details.join(" · ");
}

function getImageFileName(output: AiRunOutput | AiWorkOutput): string {
  const extension =
    output.mimeType === "image/png"
      ? "png"
      : output.mimeType === "image/jpeg"
        ? "jpg"
        : "webp";
  return `neuroluv-${output.id}.${extension}`;
}

function formatImageCount(count: number): string {
  const absolute = Math.abs(count);
  const lastTwoDigits = absolute % 100;
  const lastDigit = absolute % 10;
  const noun =
    lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? "изображений"
      : lastDigit === 1
        ? "изображение"
        : lastDigit >= 2 && lastDigit <= 4
          ? "изображения"
          : "изображений";
  return `${count} ${noun}`;
}

function formatFileCount(count: number): string {
  const absolute = Math.abs(count);
  const lastTwoDigits = absolute % 100;
  const lastDigit = absolute % 10;
  const noun =
    lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? "файлов"
      : lastDigit === 1
        ? "файл"
        : lastDigit >= 2 && lastDigit <= 4
          ? "файла"
          : "файлов";
  return `${count} ${noun}`;
}

function getFileFingerprint(file: File): string {
  return [file.name, file.type, file.size, file.lastModified].join(":");
}

function getClipboardFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  const itemFiles = Array.from(data.items)
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
  return itemFiles.length > 0 ? itemFiles : Array.from(data.files);
}

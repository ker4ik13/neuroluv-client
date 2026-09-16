'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
	type ChangeEvent,
	type CSSProperties,
	type DragEvent,
	type FormEvent,
	type UIEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	FiArrowLeft,
	FiCheck,
	FiChevronDown,
	FiClock,
	FiCopy,
	FiDownload,
	FiExternalLink,
	FiFileText,
	FiGift,
	FiImage,
	FiMessageCircle,
	FiMinus,
	FiMusic,
	FiPaperclip,
	FiPlus,
	FiRefreshCw,
	FiSend,
	FiSettings,
	FiTrash2,
	FiVideo,
	FiX,
	FiZap,
} from 'react-icons/fi';
import { RiSparkling2Fill } from 'react-icons/ri';
import { useAiLocale } from '@/features/ai-locale';
import { useAiSession } from '@/features/ai-session';
import {
	type AiApiEnvelope,
	AiApiError,
	aiApiFetch,
	type AiCitation,
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
	type AiUploadResult,
	type AiWorkDetail,
	type AiWorkOutput,
} from '@/shared/api/ai';
import { useFocusTrap } from '@/shared/lib/dom/useFocusTrap';
import { writeClipboardText } from '@/shared/lib/dom/writeClipboardText';
import { formatCreditNumber, formatCredits } from '@/shared/lib/formatCredits';
import { useDebouncedValue } from '@/shared/lib/react';
import { getAiErrorMessage, unwrapAiData, useAiResource } from '../model/api';
import {
	resolveGenerationOperation,
	resolvePromptVideoModeCode,
} from '../model/generationOperation';
import {
	formatMediaCharacteristics,
	type MediaSize,
	normalizeMediaDimension,
} from '../model/mediaCharacteristics';
import {
	readLocalJson,
	removeLocalValue,
	writeLocalJson,
} from '../model/storage';
import { useAdaptivePolling } from '../model/useAdaptivePolling';
import { useAiLiveSync } from '../model/useAiLiveSync';
import { AiMarkdown } from './AiMarkdown';
import { AiModelLogo } from './AiModelLogo';
import { AiSelect, type AiSelectOption } from './AiSelect';
import { AiCard, AiPage, AsyncState, FieldMessage } from './AiUi';
import { ChatImageCarousel } from './ChatImageCarousel';
import {
	ChatImageOutput,
	ImageGalleryProvider,
	ImageLightbox,
} from './ChatImageOutput';
import styles from './GenerationChatPage.module.scss';
import {
	PromptComposerEditor,
	type PromptComposerMention,
} from './PromptComposerEditor';

export type GenerationChatKind = 'image' | 'video' | 'text' | 'photo-to-prompt';

type Draft = {
	idempotencyKey: string;
	conversationId: string;
	contextEnabled: boolean;
	catalogPromptOverride: boolean;
	promptId: number | null;
	promptCompatibleModelIds: string[];
	promptMinimumReferenceFiles: number;
	promptMaximumReferenceFiles: number;
	promptTitle: string;
	publicShareDraftToken: string;
	publicPromptUseToken: string;
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
	background: string;
	sound: boolean;
	reasoningMode: string;
	videoMode: string;
	toolValues: Record<string, string | number | boolean>;
};

type ChatTurn = {
	id: string;
	sequence?: number | null;
	run: AiRunSummary | null;
	prompt: string;
	outputs: AiRunOutput[];
	inputFiles: ChatMessageAttachment[];
	createdAt: string;
	modelId: string;
	modelName: string;
	submissionState: 'submitting' | 'active' | 'failed';
	uploadStates?: Record<string, AttachmentUploadState>;
	submitError?: string | null;
};

type AttachmentUploadState = 'uploading' | 'uploaded' | 'failed';

type ChatMessageAttachment = AiMessageAttachment & {
	localObjectUrl?: boolean;
};

type QuotePayload = {
	operation: string;
	modelId: string;
	promptId?: number;
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

type VideoModeCapability = NonNullable<
	AiPublicModel['capabilities']['videoModes']
>[number];

const EMPTY_DRAFT: Draft = {
	idempotencyKey: '',
	conversationId: '',
	contextEnabled: false,
	catalogPromptOverride: false,
	promptId: null,
	promptCompatibleModelIds: [],
	promptMinimumReferenceFiles: 0,
	promptMaximumReferenceFiles: 0,
	promptTitle: '',
	publicShareDraftToken: '',
	publicPromptUseToken: '',
	repeatRunId: '',
	replaceReference: false,
	modelId: '',
	prompt: '',
	negativePrompt: '',
	aspectRatio: '',
	outputCount: '',
	duration: '',
	resolution: '',
	quality: '',
	background: '',
	sound: false,
	reasoningMode: '',
	videoMode: '',
	toolValues: {},
};

const REFERENCE_REQUIRED_OPERATIONS = new Set([
	'image_to_image',
	'image_edit',
	'image_to_video',
	'photo_to_prompt',
]);
const SAFE_IMAGE_REFERENCE_MIME_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
]);
const SAFE_TEXT_REFERENCE_MIME_TYPES = new Set([
	...SAFE_IMAGE_REFERENCE_MIME_TYPES,
	'application/pdf',
]);
const PLATFORM_REFERENCE_FILE_LIMIT = 50;
const PLATFORM_REFERENCE_TOTAL_BYTES_LIMIT = 500 * 1024 * 1024;
const COLLAPSIBLE_USER_MESSAGE_LENGTH = 420;
const COLLAPSIBLE_USER_MESSAGE_LINES = 7;
const TERMINAL_RUN_STATUSES = new Set([
	'succeeded',
	'partially_succeeded',
	'failed',
	'cancelled',
]);
const PRICE_PREVIEW_PROMPT = 'Предварительный расчёт стоимости';
const CATALOG_CACHE_TTL_MS = 5 * 60_000;
const VARIABLE_QUOTE_DEBOUNCE_MS = 250;

function toPersistedDraft(draft: Draft): Draft {
	return {
		...draft,
		catalogPromptOverride: false,
		promptId: null,
		promptCompatibleModelIds: [],
		promptMinimumReferenceFiles: 0,
		promptMaximumReferenceFiles: 0,
		promptTitle: '',
		publicShareDraftToken: '',
		publicPromptUseToken: '',
		repeatRunId: '',
		replaceReference: false,
	};
}

export function GenerationChatPage({
	kind,
	initialModelSlug,
	pageTitle,
	semanticTitle = true,
	syncModelUrl = false,
}: {
	kind: GenerationChatKind;
	initialModelSlug?: string;
	pageTitle?: string;
	semanticTitle?: boolean;
	syncModelUrl?: boolean;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const requestedModelSlug =
		initialModelSlug ||
		(syncModelUrl ? getModelSlugFromGenerationPath(pathname, kind) : undefined);
	const [initialRequestedModelSlug] = useState(requestedModelSlug);
	const { locale, isEnglish, t } = useAiLocale();
	const { session, isLoading: isSessionLoading } = useAiSession();
	const modality = getModality(kind);
	const isTool = kind === 'photo-to-prompt';
	const canUseContext = kind === 'text';
	const models = useAiResource<AiPublicModel[]>(
		`/catalog/models?modality=${encodeURIComponent(modality)}`,
		null,
		{ cacheTtlMs: CATALOG_CACHE_TTL_MS },
	);
	const reloadModels = models.reload;
	const tools = useAiResource<AiPublicTool[]>(
		isTool ? '/catalog/tools?code=photo-to-prompt' : null,
		null,
		{ cacheTtlMs: CATALOG_CACHE_TTL_MS },
	);
	const conversationHistory = useAiResource<AiPageResponse<AiConversation>>(
		session.authenticated
			? '/conversations?status=active&page=1&pageSize=100'
			: null,
	);
	const tool = tools.data?.[0] || null;
	const toolFields = useMemo(() => visibleToolFields(tool), [tool]);
	const [draft, setDraft] = useState<Draft>({
		...EMPTY_DRAFT,
		contextEnabled: false,
	});
	const availableModels = useMemo(() => {
		const source = models.data || [];
		const toolModels =
			!isTool || !tool?.modelIds.length
				? source
				: source.filter((model) => tool.modelIds.includes(model.id));
		if (!draft.promptId || draft.promptCompatibleModelIds.length === 0) {
			return toolModels;
		}
		const compatibleModelIds = new Set(draft.promptCompatibleModelIds);
		return toolModels.filter((model) => compatibleModelIds.has(model.id));
	}, [
		draft.promptCompatibleModelIds,
		draft.promptId,
		isTool,
		models.data,
		tool,
	]);
	const selectedModel = useMemo(
		() => availableModels.find((model) => model.id === draft.modelId) || null,
		[availableModels, draft.modelId],
	);
	const capabilities = selectedModel?.capabilities;
	const supportsContext = session.authenticated && kind === 'text';
	const [draftReady, setDraftReady] = useState(false);
	const [initialModelResolved, setInitialModelResolved] = useState(
		!initialRequestedModelSlug,
	);
	const [turns, setTurns] = useState<ChatTurn[]>([]);
	const [references, setReferences] = useState<PendingReference[]>([]);
	const [quote, setQuote] = useState<AiQuote | null>(null);
	const [quoteError, setQuoteError] = useState<string | null>(null);
	const [quoteState, setQuoteState] = useState<
		'idle' | 'debouncing' | 'loading' | 'success' | 'error'
	>('idle');
	const [pricingCalculationByKey, setPricingCalculationByKey] = useState<
		Record<string, AiQuote['pricing']['calculation']>
	>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [isConversationLoading, setIsConversationLoading] = useState(false);
	const [isContextSaving, setIsContextSaving] = useState(false);
	const [isValidReferenceDrag, setIsValidReferenceDrag] = useState(false);
	const [draggedReferenceId, setDraggedReferenceId] = useState<string | null>(
		null,
	);
	const [attachmentStatus, setAttachmentStatus] = useState('');
	const [conversationError, setConversationError] = useState<string | null>(
		null,
	);
	const [conversationTitle, setConversationTitle] = useState(
		getCreateTitle(kind, isEnglish),
	);
	const [conversationTitleDraft, setConversationTitleDraft] = useState('');
	const [isConversationTitleEditing, setIsConversationTitleEditing] =
		useState(false);
	const [isConversationTitleSaving, setIsConversationTitleSaving] =
		useState(false);
	const [showScrollToBottom, setShowScrollToBottom] = useState(false);
	const [deletingConversationId, setDeletingConversationId] = useState<
		string | null
	>(null);
	const [historyMutationError, setHistoryMutationError] = useState<
		string | null
	>(null);
	const fileInput = useRef<HTMLInputElement>(null);
	const referencesRef = useRef<PendingReference[]>([]);
	const chatForm = useRef<HTMLFormElement>(null);
	const thread = useRef<HTMLDivElement>(null);
	const threadContent = useRef<HTMLDivElement>(null);
	const threadPinnedToBottom = useRef(true);
	const initialThreadScrollPending = useRef(true);
	const settingsRef = useRef<HTMLElement>(null);
	const historyRef = useRef<HTMLElement>(null);
	const hydratedRetryRun = useRef<string | null>(null);
	const hydratedConversation = useRef<string | null>(null);
	const quoteRequestSequence = useRef(0);
	const submitLock = useRef(false);
	const retryLock = useRef(false);
	const viewEpoch = useRef(0);
	const conversationSyncSequence = useRef(0);
	const lastSyncedConversationVersion = useRef('');
	const broadcastedTerminalRuns = useRef(new Set<string>());
	const activeConversationId = useRef('');
	const loadedStorageKey = useRef('');
	const outputCountManuallySelected = useRef(false);
	const outputCountModelId = useRef('');
	const storageOwner = session.user?.id || 'guest';
	const storageKey = `neuroluv-ai:create-draft:${storageOwner}:${kind}`;

	useFocusTrap(isSettingsOpen, settingsRef);
	useFocusTrap(isHistoryOpen, historyRef);

	useEffect(() => {
		activeConversationId.current = draft.conversationId;
	}, [draft.conversationId]);

	const visibleConversations = useMemo(
		() =>
			(conversationHistory.data?.data || []).filter(
				(conversation) => conversation.kind === getConversationKind(kind),
			),
		[conversationHistory.data?.data, kind],
	);

	const applyConversationSnapshot = useCallback(
		(conversation: AiConversation) => {
			setConversationTitle(
				conversation.title || getCreateTitle(kind, isEnglish),
			);
			setTurns((current) =>
				mergeConversationTurns(
					current,
					(conversation.turns || []).map(toChatTurn),
				),
			);
			setDraft((current) => ({
				...current,
				contextEnabled: supportsContext ? conversation.contextEnabled : false,
			}));
			lastSyncedConversationVersion.current = conversationVersion(conversation);
		},
		[isEnglish, kind, supportsContext],
	);

	const synchronizeConversation = useCallback(
		async (conversationId: string) => {
			const sequence = ++conversationSyncSequence.current;
			try {
				const payload = await aiApiFetch<
					AiConversation | AiApiEnvelope<AiConversation>
				>(`/conversations/${encodeURIComponent(conversationId)}`);
				if (sequence !== conversationSyncSequence.current) return;
				const conversation = unwrapAiData(payload);
				applyConversationSnapshot(conversation);
				setConversationError(null);
			} catch (error) {
				if (sequence === conversationSyncSequence.current) {
					setConversationError(getAiErrorMessage(error));
				}
			}
		},
		[applyConversationSnapshot],
	);

	const publishLiveSync = useAiLiveSync({
		enabled: session.authenticated,
		onMessage: (message) => {
			void conversationHistory.refresh();
			if (
				message.conversationId &&
				message.conversationId === draft.conversationId
			) {
				void synchronizeConversation(message.conversationId);
			}
		},
	});

	const broadcastConversationChange = useCallback(
		(
			conversationId?: string | null,
			reason: 'conversation' | 'started' | 'terminal' = 'conversation',
		) => {
			publishLiveSync({
				type: 'conversation-changed',
				conversationId: conversationId || null,
				kind: getConversationKind(kind),
				reason,
			});
		},
		[kind, publishLiveSync],
	);

	useEffect(() => {
		if (isSessionLoading) return;
		loadedStorageKey.current = '';
		const timer = window.setTimeout(() => {
			try {
				const hasInitialModel = Boolean(initialRequestedModelSlug);
				const saved = hasInitialModel
					? {}
					: readLocalJson<Partial<Draft>>(storageKey, {});
				const preset = hasInitialModel
					? null
					: readLocalJson<{
							promptId?: number;
							promptTitle?: string;
							promptCompatibleModelIds?: string[];
							promptMinimumReferenceFiles?: number;
							promptMaximumReferenceFiles?: number;
							catalogPromptOverride?: boolean;
							publicShareDraftToken?: string;
							publicPromptUseToken?: string;
							repeatRunId?: string;
							replaceReference?: boolean;
							prompt?: string;
							negativePrompt?: string;
							modelId?: string;
							aspectRatio?: string;
							operation?: string;
							videoMode?: string;
							toolValues?: Record<string, string | number | boolean>;
						} | null>('neuroluv-ai:create-preset', null);
				const nextDraft = {
					...EMPTY_DRAFT,
					contextEnabled: false,
					...saved,
					// Sources from the prompt catalog, public works and retries are one-shot.
					// Persisting them makes an ordinary new chat inherit incompatible input.
					catalogPromptOverride: false,
					promptId: null,
					promptCompatibleModelIds: [],
					promptMinimumReferenceFiles: 0,
					promptMaximumReferenceFiles: 0,
					promptTitle: '',
					publicShareDraftToken: '',
					publicPromptUseToken: '',
					repeatRunId: '',
					replaceReference: false,
				} as Draft;

				if (!canUseContext) nextDraft.contextEnabled = false;
				if (!nextDraft.conversationId) nextDraft.contextEnabled = false;
				if (hasInitialModel) {
					removeLocalValue('neuroluv-ai:create-preset');
				} else if (preset) {
					// Every external preset starts a clean conversation. Otherwise a saved
					// draft can overwrite the preset model or mix a catalog prompt with an
					// unrelated existing chat.
					nextDraft.conversationId = '';
					nextDraft.contextEnabled = false;
					if (preset.promptId) {
						nextDraft.prompt = '';
						nextDraft.negativePrompt = '';
						nextDraft.toolValues = {};
					}
					nextDraft.prompt = preset.prompt ?? nextDraft.prompt;
					nextDraft.negativePrompt =
						preset.negativePrompt ?? nextDraft.negativePrompt;
					nextDraft.promptId = preset.promptId || nextDraft.promptId;
					nextDraft.promptTitle = preset.promptTitle || '';
					nextDraft.promptCompatibleModelIds = normalizePresetModelIds(
						preset.promptCompatibleModelIds,
					);
					nextDraft.promptMinimumReferenceFiles = normalizePresetReferenceLimit(
						preset.promptMinimumReferenceFiles,
					);
					nextDraft.promptMaximumReferenceFiles = normalizePresetReferenceLimit(
						preset.promptMaximumReferenceFiles,
					);
					nextDraft.catalogPromptOverride =
						preset.catalogPromptOverride === true;
					nextDraft.publicShareDraftToken = preset.publicShareDraftToken || '';
					nextDraft.publicPromptUseToken = preset.publicPromptUseToken || '';
					nextDraft.repeatRunId = preset.repeatRunId || '';
					nextDraft.replaceReference = Boolean(preset.replaceReference);
					nextDraft.modelId = preset.modelId || nextDraft.modelId;
					nextDraft.aspectRatio = preset.aspectRatio || nextDraft.aspectRatio;
					nextDraft.videoMode = preset.videoMode || nextDraft.videoMode;
					nextDraft.toolValues = {
						...nextDraft.toolValues,
						...preset.toolValues,
					};
					removeLocalValue('neuroluv-ai:create-preset');
				}
				setDraft(nextDraft);
			} catch {
				setDraft({ ...EMPTY_DRAFT, contextEnabled: false });
			} finally {
				loadedStorageKey.current = storageKey;
				setDraftReady(true);
			}
		}, 0);

		return () => window.clearTimeout(timer);
	}, [canUseContext, initialRequestedModelSlug, isSessionLoading, storageKey]);

	useEffect(() => {
		if (
			!draftReady ||
			isSessionLoading ||
			loadedStorageKey.current !== storageKey
		) {
			return;
		}
		writeLocalJson(storageKey, toPersistedDraft(draft));
	}, [draft, draftReady, isSessionLoading, storageKey]);

	useEffect(() => {
		if (!isSettingsOpen && !isHistoryOpen) return;
		const previousOverflow = document.body.style.overflow;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			setIsSettingsOpen(false);
			setIsHistoryOpen(false);
		};
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', onKeyDown);
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
			{
				signal: controller.signal,
			},
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
								promptId: preset.promptId || null,
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
		if (
			initialModelResolved ||
			!requestedModelSlug ||
			!draftReady ||
			models.isLoading ||
			!models.data
		) {
			return;
		}

		const requestedModel = resolveRequestedModel(
			models.data,
			requestedModelSlug,
			kind,
		);
		const timer = window.setTimeout(() => {
			if (!requestedModel) {
				setConversationError(
					t(
						`Модель «${requestedModelSlug}» не найдена для этого типа генерации. Выберите доступную модель.`,
						`Model “${requestedModelSlug}” is not available for this generation type. Choose an available model.`,
					),
				);
				setInitialModelResolved(true);
				return;
			}

			setDraft((current) =>
				selectDraftModel(
					{
						...current,
						conversationId: '',
						contextEnabled: false,
					},
					requestedModel.id,
				),
			);
			setInitialModelResolved(true);

			if (requestedModel.available) {
				setConversationError(null);
			} else {
				setConversationError(
					t(
						`Модель «${requestedModel.name}» временно недоступна. Выберите другую модель.`,
						`Model “${requestedModel.name}” is temporarily unavailable. Choose another model.`,
					),
				);
			}
		}, 0);

		return () => window.clearTimeout(timer);
	}, [
		draftReady,
		initialModelResolved,
		kind,
		models.data,
		models.isLoading,
		requestedModelSlug,
		t,
	]);

	useEffect(() => {
		if (!draftReady || !availableModels.length) return;
		if (!initialModelResolved) return;
		const current = availableModels.find((model) => model.id === draft.modelId);
		const requestedModel = requestedModelSlug
			? resolveRequestedModel(availableModels, requestedModelSlug, kind)
			: null;
		const currentMatchesRoute = Boolean(
			current && requestedModel?.id === current.id,
		);
		const selected =
			(current && (current.available || currentMatchesRoute)
				? current
				: null) ||
			availableModels.find((model) => model.available) ||
			current ||
			availableModels[0];
		const capability = selected.capabilities;
		const timer = window.setTimeout(() => {
			setDraft((value) => ({
				...value,
				modelId: selected.id,
				aspectRatio:
					capability.aspectRatios?.includes(value.aspectRatio) &&
					value.aspectRatio
						? value.aspectRatio
						: String(capability.aspectRatios?.[0] || ''),
				outputCount:
					capability.outputCounts?.includes(Number(value.outputCount)) &&
					value.outputCount
						? value.outputCount
						: String(capability.outputCounts?.[0] || ''),
				duration:
					capability.durations?.includes(Number(value.duration)) &&
					value.duration
						? value.duration
						: String(capability.durations?.[0] || ''),
				resolution:
					capability.resolutions?.includes(value.resolution) && value.resolution
						? value.resolution
						: String(capability.resolutions?.[0] || ''),
				quality:
					capability.qualities?.includes(value.quality) && value.quality
						? value.quality
						: String(capability.qualities?.[0] || ''),
				background:
					capability.backgrounds?.includes(value.background) && value.background
						? value.background
						: String(capability.backgrounds?.[0] || ''),
				reasoningMode:
					capability.reasoning?.modes.includes(value.reasoningMode) &&
					value.reasoningMode
						? value.reasoningMode
						: String(capability.reasoning?.defaultMode || ''),
				videoMode:
					(value.promptId || value.publicPromptUseToken
						? resolvePromptVideoModeCode({
								maximumReferenceFiles: value.promptMaximumReferenceFiles,
								minimumReferenceFiles: value.promptMinimumReferenceFiles,
								modes: capability.videoModes,
							})
						: null) ||
					(capability.videoModes?.some(
						(mode) => mode.code === value.videoMode,
					) && value.videoMode
						? value.videoMode
						: String(capability.videoModes?.[0]?.code || '')),
				contextEnabled: kind === 'text' ? value.contextEnabled : false,
			}));
		}, 0);
		return () => window.clearTimeout(timer);
	}, [
		availableModels,
		draft.modelId,
		draftReady,
		initialModelResolved,
		kind,
		requestedModelSlug,
	]);

	useEffect(() => {
		if (!draftReady || kind !== 'image' || !selectedModel) return;
		if (outputCountModelId.current !== selectedModel.id) {
			outputCountModelId.current = selectedModel.id;
			outputCountManuallySelected.current = false;
		}
		if (!draft.prompt.trim()) {
			outputCountManuallySelected.current = false;
			return;
		}
		if (outputCountManuallySelected.current) return;

		const inferredCount = inferCarouselOutputCount(
			draft.prompt,
			selectedModel.capabilities.outputCounts || [],
		);
		if (!inferredCount || String(inferredCount) === draft.outputCount) return;
		const timer = window.setTimeout(() => {
			setDraft((current) => ({
				...current,
				outputCount: String(inferredCount),
			}));
		}, 0);
		return () => window.clearTimeout(timer);
	}, [draft.outputCount, draft.prompt, draftReady, kind, selectedModel]);

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
				applyConversationSnapshot(conversation);
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					const isMissingConversation =
						error instanceof AiApiError && error.problem.status === 404;
					setConversationError(
						isMissingConversation ? null : getAiErrorMessage(error),
					);
					setDraft((current) => ({ ...current, conversationId: '' }));
					hydratedConversation.current = null;
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) setIsConversationLoading(false);
			});
		return () => controller.abort();
	}, [
		applyConversationSnapshot,
		draft.conversationId,
		draftReady,
		session.authenticated,
	]);

	useEffect(() => {
		return () => {
			referencesRef.current.forEach((reference) =>
				URL.revokeObjectURL(reference.previewUrl),
			);
		};
	}, []);

	const scrollThreadToBottom = useCallback(() => {
		const chatThread = thread.current;
		if (!chatThread) return;
		chatThread.scrollTop = chatThread.scrollHeight;
		setShowScrollToBottom(false);
	}, []);

	const smoothlyScrollThreadToBottom = useCallback(() => {
		const chatThread = thread.current;
		if (!chatThread) return;
		threadPinnedToBottom.current = true;
		chatThread.scrollTo({ top: chatThread.scrollHeight, behavior: 'smooth' });
		setShowScrollToBottom(false);
	}, []);

	useLayoutEffect(() => {
		initialThreadScrollPending.current = true;
		threadPinnedToBottom.current = true;
		scrollThreadToBottom();
		const frame = window.requestAnimationFrame(scrollThreadToBottom);
		return () => window.cancelAnimationFrame(frame);
	}, [draft.conversationId, scrollThreadToBottom]);

	useLayoutEffect(() => {
		if (isConversationLoading) return;
		if (initialThreadScrollPending.current || threadPinnedToBottom.current) {
			scrollThreadToBottom();
		}
	}, [isConversationLoading, scrollThreadToBottom, turns.length]);

	useEffect(() => {
		const content = threadContent.current;
		const chatThread = thread.current;
		if (!content || !chatThread || typeof ResizeObserver === 'undefined')
			return;

		const observer = new ResizeObserver(() => {
			if (initialThreadScrollPending.current || threadPinnedToBottom.current) {
				scrollThreadToBottom();
			}
		});
		observer.observe(content);
		observer.observe(chatThread);
		return () => observer.disconnect();
	}, [scrollThreadToBottom]);

	const handleThreadScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
		const chatThread = event.currentTarget;
		const distanceToBottom =
			chatThread.scrollHeight - chatThread.scrollTop - chatThread.clientHeight;
		if (initialThreadScrollPending.current) {
			threadPinnedToBottom.current = true;
			setShowScrollToBottom(false);
			return;
		}
		threadPinnedToBottom.current = distanceToBottom <= 48;
		setShowScrollToBottom(distanceToBottom > 96);
	}, []);

	const markThreadAsUserControlled = useCallback(() => {
		initialThreadScrollPending.current = false;
	}, []);

	const automaticVideoModes = useMemo(
		() => getAutomaticVideoModes(capabilities?.videoModes),
		[capabilities?.videoModes],
	);
	const configuredVideoMode =
		capabilities?.videoModes?.find((mode) => mode.code === draft.videoMode) ||
		capabilities?.videoModes?.[0] ||
		null;
	const referenceVideoMode = automaticVideoModes?.frame || configuredVideoMode;
	const capabilityMaxReferenceFiles = Math.min(
		PLATFORM_REFERENCE_FILE_LIMIT,
		Math.max(
			1,
			kind === 'video' && referenceVideoMode
				? referenceVideoMode.maxReferenceFiles
				: (capabilities?.maxReferenceFiles ?? 1),
		),
	);
	const hasPresetReferenceContract = Boolean(
		draft.promptId || draft.publicPromptUseToken,
	);
	const maxReferenceFiles =
		hasPresetReferenceContract && draft.promptMaximumReferenceFiles > 0
			? Math.min(capabilityMaxReferenceFiles, draft.promptMaximumReferenceFiles)
			: capabilityMaxReferenceFiles;
	const promptMinimumReferenceFiles = hasPresetReferenceContract
		? Math.min(
				maxReferenceFiles,
				Math.max(0, draft.promptMinimumReferenceFiles),
			)
		: 0;
	const maxReferenceFileBytes =
		capabilities?.maxUploadBytes || 20 * 1024 * 1024;
	const modelAcceptedReferenceMimeTypes = useMemo(
		() =>
			new Set(
				capabilities?.acceptedMimeTypes?.length
					? capabilities.acceptedMimeTypes
					: kind === 'text'
						? SAFE_TEXT_REFERENCE_MIME_TYPES
						: SAFE_IMAGE_REFERENCE_MIME_TYPES,
			),
		[capabilities?.acceptedMimeTypes, kind],
	);
	const acceptedReferenceMimeTypes = useMemo(() => {
		if (
			kind === 'video' &&
			(referenceVideoMode?.maxReferenceFiles === 0 ||
				referenceVideoMode?.imageInput === 'frame_images')
		) {
			return new Set(
				[...modelAcceptedReferenceMimeTypes].filter((mimeType) =>
					mimeType.startsWith('image/'),
				),
			);
		}
		return modelAcceptedReferenceMimeTypes;
	}, [kind, modelAcceptedReferenceMimeTypes, referenceVideoMode]);
	const acceptsPdf = acceptedReferenceMimeTypes.has('application/pdf');
	const acceptsVideo = [...acceptedReferenceMimeTypes].some((mimeType) =>
		mimeType.startsWith('video/'),
	);
	const acceptsAudio = [...acceptedReferenceMimeTypes].some((mimeType) =>
		mimeType.startsWith('audio/'),
	);
	const acceptsFiles = acceptsPdf || acceptsVideo || acceptsAudio;
	const referenceFileKindLimits = useMemo(
		() => capabilities?.requiredFileKinds || [],
		[capabilities?.requiredFileKinds],
	);
	const getReferenceFileBytesLimit = useCallback(
		(mimeType: string) => {
			const kind = getAttachmentKind(mimeType);
			return (
				referenceFileKindLimits.find((requirement) => requirement.kind === kind)
					?.maxBytes || maxReferenceFileBytes
			);
		},
		[maxReferenceFileBytes, referenceFileKindLimits],
	);
	const attachmentSupportKinds = useMemo(
		() =>
			(['image', 'video', 'audio', 'document'] as const).flatMap(
				(kindValue) => {
					if (!mimeSetAcceptsKind(acceptedReferenceMimeTypes, kindValue))
						return [];
					const limit = referenceFileKindLimits.find(
						(requirement) => requirement.kind === kindValue,
					);
					return [
						{
							kind: kindValue,
							max: limit?.max ?? maxReferenceFiles,
							maxBytes: limit?.maxBytes ?? maxReferenceFileBytes,
						},
					];
				},
			),
		[
			acceptedReferenceMimeTypes,
			maxReferenceFileBytes,
			maxReferenceFiles,
			referenceFileKindLimits,
		],
	);
	const currentContextEpoch = [...turns]
		.reverse()
		.find((turn) => turn.run?.contextEpoch != null)?.run?.contextEpoch;
	const hasContextImage = turns.some(
		(turn) =>
			turn.run != null &&
			turn.run.contextEnabled !== false &&
			(currentContextEpoch == null ||
				turn.run.contextEpoch === currentContextEpoch) &&
			['succeeded', 'partially_succeeded'].includes(turn.run.status) &&
			turn.outputs.some(
				(output) =>
					output.type === 'image' &&
					!output.heldForReview &&
					output.fileAvailable !== false &&
					output.assetAvailable !== false,
			),
	);
	const hasRemoteReference = Boolean(
		draft.publicShareDraftToken ||
		(draft.repeatRunId &&
			!draft.replaceReference &&
			(kind !== 'video' ||
				configuredVideoMode?.operation === 'image_to_video')) ||
		(kind === 'image' && draft.contextEnabled && hasContextImage),
	);
	const referenceMentions = useMemo<PromptComposerMention[]>(() => {
		if (
			kind !== 'video' ||
			referenceVideoMode?.imageInput !== 'input_references'
		) {
			return [];
		}
		const counters = { audio: 0, image: 0, video: 0 };
		const mentions = references.flatMap((reference) => {
			const kindValue = getAttachmentKind(reference.file.type);
			if (
				kindValue !== 'audio' &&
				kindValue !== 'image' &&
				kindValue !== 'video'
			)
				return [];
			counters[kindValue] += 1;
			const template =
				capabilities?.referencePromptTags?.[kindValue] ||
				capabilities?.referencePromptTag;
			if (!template?.includes('{index}')) return [];
			const tag = template.replace('{index}', String(counters[kindValue]));
			return [
				{
					tag,
					name: reference.file.name || tag,
					previewUrl: reference.previewUrl || null,
				},
			];
		});
		if (mentions.length === 0 && hasRemoteReference) {
			const template =
				capabilities?.referencePromptTags?.image ||
				capabilities?.referencePromptTag;
			if (template?.includes('{index}')) {
				const tag = template.replace('{index}', '1');
				mentions.push({ tag, name: tag, previewUrl: null });
			}
		}
		return mentions;
	}, [
		capabilities?.referencePromptTag,
		capabilities?.referencePromptTags,
		hasRemoteReference,
		kind,
		referenceVideoMode?.imageInput,
		references,
	]);
	const referenceInputVisible = Boolean(
		isTool ||
		kind === 'image' ||
		(kind === 'text' && capabilities?.acceptsReference) ||
		(kind === 'video' &&
			capabilities?.acceptsReference &&
			Boolean(referenceVideoMode?.maxReferenceFiles)) ||
		draft.replaceReference ||
		(draft.promptId && capabilities?.acceptsReference),
	);
	const attachmentStatusId = `ai-chat-attachment-status-${kind}`;
	const dropTitle = acceptsFiles
		? t('Отпустите файлы, чтобы прикрепить', 'Drop files to attach')
		: t('Отпустите изображения, чтобы прикрепить', 'Drop images to attach');
	const dropDescription = acceptsFiles
		? `${getAcceptedFileTypesLabel(acceptedReferenceMimeTypes)} · ${t('максимум', 'up to')} ${isEnglish ? `${maxReferenceFiles} files` : formatFileCount(maxReferenceFiles)}`
		: `JPG, PNG ${t('или', 'or')} WebP · ${t('максимум', 'up to')} ${isEnglish ? `${maxReferenceFiles} images` : formatImageCount(maxReferenceFiles)}`;
	const activeReferences = useMemo(
		() =>
			referenceInputVisible
				? references.map((reference) => reference.file)
				: [],
		[referenceInputVisible, references],
	);
	const activeReferenceCount = Math.max(
		activeReferences.length,
		hasRemoteReference ? 1 : 0,
	);
	const activeReferenceKindCounts = {
		audio: activeReferences.filter((file) => file.type.startsWith('audio/'))
			.length,
		document: activeReferences.filter((file) => file.type === 'application/pdf')
			.length,
		image:
			activeReferences.filter((file) => file.type.startsWith('image/')).length +
			(hasRemoteReference ? 1 : 0),
		video: activeReferences.filter((file) => file.type.startsWith('video/'))
			.length,
	};
	const hasReferenceIntent = activeReferences.length > 0 || hasRemoteReference;
	const effectiveVideoMode = automaticVideoModes
		? hasReferenceIntent
			? automaticVideoModes.frame
			: automaticVideoModes.text
		: configuredVideoMode;
	const resolvedOperation =
		kind === 'video' && capabilities?.videoModes?.length
			? effectiveVideoMode &&
				capabilities.operations.includes(effectiveVideoMode.operation)
				? effectiveVideoMode.operation
				: null
			: resolveGenerationOperation({
					kind,
					supportedOperations: capabilities?.operations || [],
					hasReference: hasReferenceIntent,
					requiresImageToImage: Boolean(draft.publicShareDraftToken),
				});
	const referenceRequired =
		promptMinimumReferenceFiles > 0 ||
		Boolean(
			capabilities?.requiredFileKinds?.some(
				(requirement) => requirement.min > 0,
			),
		) ||
		isReferenceRequired(resolvedOperation, isTool, draft.replaceReference);
	const useConversationReference = Boolean(
		kind === 'image' &&
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
			? t(
					`Выбранная модель не принимает прикреплённые ${acceptsFiles ? 'файлы' : 'изображения'}`,
					`The selected model does not accept attached ${acceptsFiles ? 'files' : 'images'}`,
				)
			: null;
	const referenceCapabilityMessage =
		activeReferences.length > 0 && capabilities?.acceptsReference !== true
			? t(
					`Выбранная модель не принимает входные ${acceptsFiles ? 'файлы' : 'изображения'}`,
					`The selected model does not accept input ${acceptsFiles ? 'files' : 'images'}`,
				)
			: null;
	const referenceLimitMessage =
		activeReferenceCount > maxReferenceFiles
			? t(
					`Для выбранной модели можно приложить не более ${acceptsFiles ? formatFileCount(maxReferenceFiles) : formatImageCount(maxReferenceFiles)}`,
					`You can attach up to ${maxReferenceFiles} ${acceptsFiles ? 'files' : 'images'} for the selected model`,
				)
			: null;
	const requiredFileKindsMessage =
		capabilities?.requiredFileKinds
			?.map((requirement) => {
				const count = activeReferenceKindCounts[requirement.kind];
				if (count < requirement.min) {
					const kindLabel =
						requirement.kind === 'video'
							? t('видео', 'video')
							: requirement.kind === 'audio'
								? t('аудио', 'audio')
								: requirement.kind === 'document'
									? t('документ', 'document')
									: t('изображение', 'image');
					return t(
						`Прикрепите минимум ${requirement.min} ${kindLabel}`,
						`Upload at least ${requirement.min} ${kindLabel}`,
					);
				}
				if (count > requirement.max) {
					const kindLabel =
						requirement.kind === 'video'
							? t('видео', 'videos')
							: requirement.kind === 'audio'
								? t('аудиофайлов', 'audio files')
								: requirement.kind === 'document'
									? t('документов', 'documents')
									: t('изображений', 'images');
					return t(
						`Можно прикрепить не более ${requirement.max} ${kindLabel}`,
						`You can upload no more than ${requirement.max} ${kindLabel}`,
					);
				}
				return null;
			})
			.find((message): message is string => Boolean(message)) || null;
	const videoReferenceMinimumMessage =
		kind === 'video' &&
		effectiveVideoMode &&
		effectiveVideoMode.minReferenceFiles > 0 &&
		activeReferenceCount < effectiveVideoMode.minReferenceFiles
			? t(
					`Для выбранного режима прикрепите минимум ${acceptsFiles ? formatFileCount(effectiveVideoMode.minReferenceFiles) : formatImageCount(effectiveVideoMode.minReferenceFiles)}`,
					`Upload at least ${effectiveVideoMode.minReferenceFiles} ${acceptsFiles ? (effectiveVideoMode.minReferenceFiles === 1 ? 'file' : 'files') : effectiveVideoMode.minReferenceFiles === 1 ? 'image' : 'images'} for this mode`,
				)
			: null;
	const promptReferenceMinimumMessage =
		promptMinimumReferenceFiles > 0 &&
		activeReferenceCount < promptMinimumReferenceFiles
			? t(
					`Для этого промпта прикрепите минимум ${formatImageCount(promptMinimumReferenceFiles)}`,
					`Upload at least ${promptMinimumReferenceFiles} ${promptMinimumReferenceFiles === 1 ? 'image' : 'images'} for this prompt`,
				)
			: null;
	const operationBlockMessage = !resolvedOperation
		? t(
				'Выбранная модель не поддерживает нужный формат генерации',
				'The selected model does not support this generation format',
			)
		: null;
	const modelAvailabilityMessage =
		selectedModel && !selectedModel.available
			? selectedModel.unavailableReason ||
				t('Модель временно недоступна', 'The model is temporarily unavailable')
			: null;
	const quoteBlockMessage =
		modelAvailabilityMessage ||
		operationBlockMessage ||
		referenceVisibilityMessage ||
		referenceCapabilityMessage ||
		referenceLimitMessage ||
		requiredFileKindsMessage;
	const referenceBlockMessage =
		quoteBlockMessage ||
		promptReferenceMinimumMessage ||
		videoReferenceMinimumMessage ||
		(referenceRequired
			? capabilities?.acceptsReference !== true
				? t(
						'Выбранная модель не принимает исходные изображения для этой генерации',
						'The selected model does not accept source images for this generation',
					)
				: !hasReferenceIntent
					? t(
							'Для генерации загрузите исходное изображение',
							'Upload a source image for this generation',
						)
					: null
			: null);
	const composerReferenceBlockMessage =
		(isTool &&
			referenceRequired &&
			capabilities?.acceptsReference === true &&
			!hasReferenceIntent) ||
		referenceBlockMessage === videoReferenceMinimumMessage ||
		referenceBlockMessage === promptReferenceMinimumMessage
			? null
			: referenceBlockMessage;
	const hasPendingTurn = turns.some(
		(turn) =>
			turn.submissionState === 'submitting' ||
			(turn.run != null &&
				(!TERMINAL_RUN_STATUSES.has(turn.run.status) ||
					(['succeeded', 'partially_succeeded'].includes(turn.run.status) &&
						turn.outputs.length === 0))),
	);

	useAdaptivePolling({
		enabled: session.authenticated,
		hasActiveWork: hasPendingTurn,
		activeIntervalMs: 5_000,
		idleIntervalMs: 15_000,
		onPoll: conversationHistory.refresh,
	});

	useEffect(() => {
		if (!draft.conversationId || isConversationLoading) return;
		const currentConversation = conversationHistory.data?.data.find(
			(conversation) => conversation.id === draft.conversationId,
		);
		if (!currentConversation) return;

		const version = conversationVersion(currentConversation);
		if (!lastSyncedConversationVersion.current) {
			lastSyncedConversationVersion.current = version;
			return;
		}
		if (lastSyncedConversationVersion.current === version) return;

		lastSyncedConversationVersion.current = version;
		void synchronizeConversation(currentConversation.id);
	}, [
		conversationHistory.data?.data,
		draft.conversationId,
		isConversationLoading,
		synchronizeConversation,
	]);
	const unresolvedPromptVariables = useMemo(
		() => extractPromptVariables(draft.prompt),
		[draft.prompt],
	);
	const promptVariablesMessage =
		draft.promptId && unresolvedPromptVariables.length > 0
			? t(
					`Замените выделенные переменные: ${unresolvedPromptVariables.join(', ')}`,
					`Replace the highlighted variables: ${unresolvedPromptVariables.join(', ')}`,
				)
			: null;
	const promptReady =
		isTool || (Boolean(draft.prompt.trim()) && !promptVariablesMessage);
	const missingPromptReferenceSlots = Math.max(
		0,
		promptMinimumReferenceFiles - activeReferenceCount,
	);
	const showToolReferencePicker = isTool && activeReferenceCount === 0;
	const pricingBehaviorKey =
		selectedModel && resolvedOperation
			? `${selectedModel.id}:${resolvedOperation}`
			: '';
	const pricingCalculation = pricingBehaviorKey
		? pricingCalculationByKey[pricingBehaviorKey]
		: undefined;

	const canAcceptReferenceDrag = useCallback(
		(data: DataTransfer) => {
			if (
				!hasFileTransfer(data) ||
				!referenceInputVisible ||
				capabilities?.acceptsReference !== true
			) {
				return false;
			}

			const itemTypes = Array.from(data.items)
				.filter((item) => item.kind === 'file')
				.map((item) => item.type);
			const transferredFiles = getDataTransferFiles(data);
			const incomingCount = transferredFiles.length || itemTypes.length;
			if (incomingCount === 0) return false;

			const mimeTypes = transferredFiles.length
				? transferredFiles.map((file) => file.type)
				: itemTypes;
			if (
				mimeTypes.some(
					(mimeType) => !mimeType || !acceptedReferenceMimeTypes.has(mimeType),
				)
			) {
				return false;
			}

			const current = referencesRef.current;
			const retainedReferences =
				maxReferenceFiles === 1 && current.length === 1 && incomingCount > 0
					? []
					: current;
			if (incomingCount > maxReferenceFiles - retainedReferences.length) {
				return false;
			}
			const combinedKinds = [
				...retainedReferences.map((reference) =>
					getAttachmentKind(reference.file.type),
				),
				...mimeTypes.map(getAttachmentKind),
			];
			if (
				referenceFileKindLimits.some(
					(requirement) =>
						combinedKinds.filter((kindValue) => kindValue === requirement.kind)
							.length > requirement.max,
				)
			) {
				return false;
			}

			if (transferredFiles.length === 0) return true;
			const existingFingerprints = new Set(
				retainedReferences.map((reference) =>
					getFileFingerprint(reference.file),
				),
			);
			let totalBytes = retainedReferences.reduce(
				(sum, reference) => sum + reference.file.size,
				0,
			);

			for (const file of transferredFiles) {
				if (
					file.size > getReferenceFileBytesLimit(file.type) ||
					existingFingerprints.has(getFileFingerprint(file))
				) {
					return false;
				}
				totalBytes += file.size;
				if (totalBytes > PLATFORM_REFERENCE_TOTAL_BYTES_LIMIT) return false;
				existingFingerprints.add(getFileFingerprint(file));
			}

			return true;
		},
		[
			acceptedReferenceMimeTypes,
			capabilities?.acceptsReference,
			getReferenceFileBytesLimit,
			maxReferenceFiles,
			referenceFileKindLimits,
			referenceInputVisible,
		],
	);

	const addReferenceFiles = useCallback(
		(incomingFiles: readonly File[]) => {
			if (incomingFiles.length === 0) return;
			if (!referenceInputVisible) {
				const message = t(
					`Выбранная модель не принимает входные ${acceptsFiles ? 'файлы' : 'изображения'}`,
					`The selected model does not accept input ${acceptsFiles ? 'files' : 'images'}`,
				);
				setQuoteError(message);
				setAttachmentStatus(message);
				return;
			}
			if (capabilities?.acceptsReference !== true) {
				const message = t(
					`Выбранная модель не принимает входные ${acceptsFiles ? 'файлы' : 'изображения'}`,
					`The selected model does not accept input ${acceptsFiles ? 'files' : 'images'}`,
				);
				setQuoteError(message);
				setAttachmentStatus(message);
				return;
			}

			const current = referencesRef.current;
			const existingFingerprints = new Set(
				current.map((reference) => getFileFingerprint(reference.file)),
			);
			const acceptedFiles: File[] = [];
			const kindCounts = new Map<string, number>();
			current.forEach((reference) => {
				const kindValue = getAttachmentKind(reference.file.type);
				kindCounts.set(kindValue, (kindCounts.get(kindValue) || 0) + 1);
			});
			let hasUnsupportedType = false;
			let hasOversizedFile = false;
			let hasExceededKindLimit = false;
			let hasDuplicate = false;

			incomingFiles.forEach((file) => {
				if (!acceptedReferenceMimeTypes.has(file.type)) {
					hasUnsupportedType = true;
					return;
				}
				if (file.size > getReferenceFileBytesLimit(file.type)) {
					hasOversizedFile = true;
					return;
				}
				const kindValue = getAttachmentKind(file.type);
				const kindLimit = referenceFileKindLimits.find(
					(requirement) => requirement.kind === kindValue,
				);
				if (kindLimit && (kindCounts.get(kindValue) || 0) >= kindLimit.max) {
					hasExceededKindLimit = true;
					return;
				}
				const fingerprint = getFileFingerprint(file);
				if (existingFingerprints.has(fingerprint)) {
					hasDuplicate = true;
					return;
				}
				existingFingerprints.add(fingerprint);
				kindCounts.set(kindValue, (kindCounts.get(kindValue) || 0) + 1);
				acceptedFiles.push(file);
			});

			let retainedReferences = current;
			let replacedReference: PendingReference | null = null;
			if (
				maxReferenceFiles === 1 &&
				current.length === 1 &&
				acceptedFiles.length > 0
			) {
				replacedReference = current[0];
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
				if (replacedReference)
					URL.revokeObjectURL(replacedReference.previewUrl);
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
					publicShareDraftToken: '',
					replaceReference: currentDraft.repeatRunId
						? true
						: currentDraft.replaceReference,
				}));
			}

			const validationMessage = hasUnsupportedType
				? acceptsFiles
					? t(
							`Поддерживаемые форматы: ${getAcceptedFileTypesLabel(acceptedReferenceMimeTypes)}`,
							`Supported formats: ${getAcceptedFileTypesLabel(acceptedReferenceMimeTypes)}`,
						)
					: t(
							'Поддерживаются только изображения JPG, PNG и WebP',
							'Only JPG, PNG and WebP images are supported',
						)
				: hasOversizedFile
					? t(
							`Один из ${acceptsFiles ? 'файлов' : 'изображений'} превышает лимит выбранной модели`,
							`One of the attached ${acceptsFiles ? 'files' : 'images'} exceeds the selected model's limit`,
						)
					: hasExceededTotalSize
						? t(
								'Общий размер прикреплённых файлов не должен превышать 500 МБ',
								'The total attachment size must not exceed 500 MB',
							)
						: hasExceededKindLimit
							? t(
									'Превышен лимит файлов этого типа для выбранной модели',
									"The selected model's limit for this file type was exceeded",
								)
							: hasExceededLimit
								? t(
										`Для выбранной модели можно приложить не более ${acceptsFiles ? formatFileCount(maxReferenceFiles) : formatImageCount(maxReferenceFiles)}`,
										`You can attach up to ${maxReferenceFiles} ${acceptsFiles ? 'files' : 'images'} for the selected model`,
									)
								: hasDuplicate
									? t(
											`Этот ${acceptsFiles ? 'файл' : 'рисунок'} уже прикреплён`,
											`This ${acceptsFiles ? 'file' : 'image'} is already attached`,
										)
									: null;
			setQuoteError(validationMessage);
			const addedMessage = filesToAdd.length
				? t(
						`Прикреплено: ${acceptsFiles ? formatFileCount(filesToAdd.length) : formatImageCount(filesToAdd.length)}`,
						`Attached: ${filesToAdd.length} ${acceptsFiles ? (filesToAdd.length === 1 ? 'file' : 'files') : filesToAdd.length === 1 ? 'image' : 'images'}`,
					)
				: null;
			setAttachmentStatus(
				[addedMessage, validationMessage].filter(Boolean).join('. ') ||
					t('Файлы не были прикреплены', 'No files were attached'),
			);
			if (fileInput.current) fileInput.current.value = '';
		},
		[
			acceptedReferenceMimeTypes,
			acceptsFiles,
			capabilities?.acceptsReference,
			getReferenceFileBytesLimit,
			maxReferenceFiles,
			referenceFileKindLimits,
			referenceInputVisible,
			t,
		],
	);

	useEffect(() => {
		const handleClipboardPaste = (event: ClipboardEvent) => {
			if (event.defaultPrevented) return;
			const clipboardFiles = getDataTransferFiles(event.clipboardData);
			if (clipboardFiles.length === 0) return;

			event.preventDefault();
			addReferenceFiles(clipboardFiles);
		};

		document.addEventListener('paste', handleClipboardPaste);
		return () => document.removeEventListener('paste', handleClipboardPaste);
	}, [addReferenceFiles]);

	const quotePayload = useMemo<QuotePayload | null>(() => {
		if (
			!draftReady ||
			!selectedModel?.available ||
			!resolvedOperation ||
			hasPendingTurn ||
			quoteBlockMessage ||
			(isTool && !tool)
		) {
			return null;
		}

		const basePricingDraft =
			promptReady && pricingCalculation !== 'fixed_request'
				? draft
				: { ...draft, prompt: PRICE_PREVIEW_PROMPT };
		const pricingDraft = effectiveVideoMode
			? { ...basePricingDraft, videoMode: effectiveVideoMode.code }
			: basePricingDraft;

		return buildQuotePayload({
			operation: resolvedOperation,
			draft: session.authenticated
				? pricingDraft
				: { ...pricingDraft, conversationId: '' },
			model: selectedModel,
			tool,
			references: activeReferences,
			supportsContext,
			useConversationReference,
			assumedReferenceCount:
				referenceRequired &&
				activeReferenceCount <
					Math.max(
						1,
						promptMinimumReferenceFiles,
						kind === 'video' ? (effectiveVideoMode?.minReferenceFiles ?? 0) : 0,
					)
					? Math.max(
							1,
							promptMinimumReferenceFiles,
							kind === 'video'
								? (effectiveVideoMode?.minReferenceFiles ?? 0)
								: 0,
						)
					: 0,
		});
	}, [
		activeReferenceCount,
		activeReferences,
		draft,
		draftReady,
		effectiveVideoMode,
		hasPendingTurn,
		isTool,
		kind,
		promptReady,
		promptMinimumReferenceFiles,
		pricingCalculation,
		quoteBlockMessage,
		referenceRequired,
		resolvedOperation,
		selectedModel,
		session.authenticated,
		supportsContext,
		tool,
		useConversationReference,
	]);
	const quoteFingerprint = quotePayload ? JSON.stringify(quotePayload) : '';
	const quoteDebounceMs =
		promptReady && pricingCalculation !== 'fixed_request'
			? VARIABLE_QUOTE_DEBOUNCE_MS
			: 0;
	const debouncedQuoteFingerprint = useDebouncedValue(
		quoteFingerprint,
		quoteDebounceMs,
	);

	useEffect(() => {
		let active = true;
		quoteRequestSequence.current += 1;
		queueMicrotask(() => {
			if (!active) return;
			setQuote(null);
			setQuoteError(null);
			setQuoteState(quoteFingerprint ? 'debouncing' : 'idle');
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
			if (
				!controller.signal.aborted &&
				sequence === quoteRequestSequence.current
			) {
				setQuoteState('loading');
			}
		});
		void aiApiFetch<AiQuote | AiApiEnvelope<AiQuote>>('/quote', {
			method: 'POST',
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
				setQuoteState('success');
			})
			.catch((error) => {
				if (
					controller.signal.aborted ||
					sequence !== quoteRequestSequence.current
				)
					return;
				setQuote(null);
				setQuoteError(getAiErrorMessage(error));
				setQuoteState('error');
			});
		return () => controller.abort();
	}, [debouncedQuoteFingerprint, pricingBehaviorKey]);

	const updateTurn = useCallback(
		(run: AiRunSummary, outputs?: AiRunOutput[]) => {
			setTurns((current) =>
				current.map((turn) =>
					turn.run?.id === run.id
						? {
								...turn,
								sequence: run.sequence ?? turn.sequence,
								run,
								outputs:
									outputs === undefined
										? turn.outputs
										: mergeRunOutputs(turn.outputs, outputs),
							}
						: turn,
				),
			);
			if (
				TERMINAL_RUN_STATUSES.has(run.status) &&
				!broadcastedTerminalRuns.current.has(run.id)
			) {
				broadcastedTerminalRuns.current.add(run.id);
				if (!session.authenticated) reloadModels();
				broadcastConversationChange(
					run.conversationId || activeConversationId.current,
					'terminal',
				);
			}
		},
		[broadcastConversationChange, reloadModels, session.authenticated],
	);

	async function retryFailedTurn(turn: ChatTurn): Promise<void> {
		const sourceRun = turn.run;
		if (!sourceRun || sourceRun.status !== 'failed') return;
		if (retryLock.current || hasPendingTurn) {
			throw new Error(
				t(
					'Дождитесь ответа на текущую генерацию',
					'Wait for the current generation to finish',
				),
			);
		}

		retryLock.current = true;
		const submissionEpoch = viewEpoch.current;
		try {
			const payload = await aiApiFetch<
				AiRunSummary | AiApiEnvelope<AiRunSummary>
			>(`/runs/${encodeURIComponent(sourceRun.id)}/retry`, {
				method: 'POST',
				body: {
					idempotencyKey: crypto.randomUUID(),
					reuseInputFiles: true,
				},
				timeoutMs: 30_000,
			});
			const nextRun = unwrapAiData(payload);
			if (viewEpoch.current !== submissionEpoch) return;

			setTurns((current) => {
				if (current.some((currentTurn) => currentTurn.run?.id === nextRun.id))
					return current;
				return [
					...current,
					{
						id: nextRun.id,
						sequence: nextRun.sequence,
						run: nextRun,
						prompt: turn.prompt,
						outputs: [],
						inputFiles: turn.inputFiles,
						createdAt: nextRun.createdAt,
						modelId: turn.modelId,
						modelName: nextRun.modelName || turn.modelName,
						submissionState: 'active',
					},
				];
			});
			conversationHistory.reload();
			broadcastConversationChange(
				nextRun.conversationId || draft.conversationId,
				'started',
			);
		} finally {
			retryLock.current = false;
		}
	}

	async function ensureConversation(
		submittedDraft: Draft,
		firstMessage: string,
		submissionEpoch: number,
	): Promise<string> {
		if (!session.authenticated) return '';
		if (submittedDraft.conversationId) return submittedDraft.conversationId;
		const payload = await aiApiFetch<
			AiConversation | AiApiEnvelope<AiConversation>
		>('/conversations', {
			method: 'POST',
			body: {
				kind: getConversationKind(kind),
				contextEnabled: supportsContext ? submittedDraft.contextEnabled : false,
				title: getConversationTitle(
					firstMessage,
					getCreateTitle(kind, isEnglish),
				),
			},
		});
		const conversation = unwrapAiData(payload);
		if (viewEpoch.current === submissionEpoch) {
			setDraft((current) => ({ ...current, conversationId: conversation.id }));
			setConversationTitle(
				conversation.title ||
					getConversationTitle(firstMessage, getCreateTitle(kind, isEnglish)),
			);
			hydratedConversation.current = conversation.id;
		}
		conversationHistory.reload();
		broadcastConversationChange(conversation.id);
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
		if (viewEpoch.current === input.submissionEpoch) setQuoteState('loading');
		try {
			const response = await aiApiFetch<AiQuote | AiApiEnvelope<AiQuote>>(
				'/quote',
				{
					method: 'POST',
					body: payload,
				},
			);
			const nextQuote = unwrapAiData(response);
			if (viewEpoch.current === input.submissionEpoch) {
				setQuote(nextQuote);
				if (input.pricingKey) {
					setPricingCalculationByKey((current) => ({
						...current,
						[input.pricingKey]: nextQuote.pricing.calculation,
					}));
				}
				setQuoteState('success');
			}
			return nextQuote;
		} catch (error) {
			if (viewEpoch.current === input.submissionEpoch) {
				setQuote(null);
				setQuoteState('error');
			}
			throw error;
		}
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (submitLock.current) return;
		if (isConversationLoading) {
			setQuoteError(t('Дождитесь загрузки чата', 'Wait for the chat to load'));
			return;
		}
		if (hasPendingTurn) {
			setQuoteError(
				t(
					'Дождитесь ответа на предыдущее сообщение',
					'Wait for the previous response',
				),
			);
			return;
		}
		if (!promptReady) {
			setQuoteError(
				promptVariablesMessage || t('Введите сообщение', 'Enter a message'),
			);
			return;
		}
		if (!resolvedOperation) {
			setQuoteError(
				t(
					'Выбранная модель не поддерживает нужный формат генерации',
					'The selected model does not support this generation format',
				),
			);
			return;
		}
		if (referenceBlockMessage) {
			setQuoteError(referenceBlockMessage);
			return;
		}
		if (!selectedModel || (isTool && !tool)) {
			setQuoteError(
				t('Выберите доступную модель', 'Choose an available model'),
			);
			return;
		}

		const submittedDraft: Draft = {
			...draft,
			...(effectiveVideoMode ? { videoMode: effectiveVideoMode.code } : {}),
			toolValues:
				isTool && tool
					? filterToolValues(draft.toolValues, toolFields)
					: { ...draft.toolValues },
		};
		const submittedReferences = referenceInputVisible
			? [...referencesRef.current]
			: [];
		const submittedFiles = submittedReferences.map(
			(reference) => reference.file,
		);
		const submittedPrompt =
			submittedDraft.prompt.trim() ||
			submittedDraft.promptTitle ||
			getToolMessage(submittedDraft.toolValues, isEnglish);
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
		const uploadStates = Object.fromEntries(
			inputFiles.map((file) => [file.id, 'uploading' as const]),
		);

		submitLock.current = true;
		initialThreadScrollPending.current = false;
		threadPinnedToBottom.current = true;

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
				modelId: submittedModel.id,
				modelName: submittedModel.name,
				submissionState: 'submitting',
				uploadStates,
			},
		]);
		consumeReferences();
		setDraft((current) => ({
			...current,
			idempotencyKey: '',
			prompt: '',
			catalogPromptOverride: false,
			promptId: null,
			promptCompatibleModelIds: [],
			promptMinimumReferenceFiles: 0,
			promptMaximumReferenceFiles: 0,
			promptTitle: '',
			publicShareDraftToken: '',
			publicPromptUseToken: '',
			repeatRunId: '',
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
					freshQuote.unavailableReasons[0] ||
						t(
							'Генерация с этими параметрами недоступна',
							'Generation is unavailable with these parameters',
						),
				);
			}

			const uploadedFiles = await Promise.all(
				submittedReferences.map(async (reference) => {
					const upload = new FormData();
					upload.set('file', reference.file);
					const uploadPayload = await aiApiFetch<
						AiUploadResult | AiApiEnvelope<AiUploadResult>
					>('/uploads', {
						method: 'POST',
						body: upload,
						// A file upload must survive background-tab throttling. The browser
						// and transport still report genuine connection failures.
						timeoutMs: null,
					});
					const uploadedFile = unwrapAiData(uploadPayload);
					if (viewEpoch.current === submissionEpoch) {
						setTurns((current) =>
							current.map((turn) =>
								turn.id === clientId
									? {
											...turn,
											uploadStates: {
												...turn.uploadStates,
												[reference.id]: 'uploaded',
											},
										}
									: turn,
							),
						);
					}
					return uploadedFile;
				}),
			);
			const inputFileIds = uploadedFiles.map((file) => file.id);
			const cloudInputFiles = submittedReferences.map((reference, index) =>
				toUploadedMessageAttachment(reference, uploadedFiles[index]),
			);
			if (viewEpoch.current === submissionEpoch) {
				setTurns((current) =>
					current.map((turn) =>
						turn.id === clientId
							? {
									...turn,
									inputFiles: cloudInputFiles,
									uploadStates: Object.fromEntries(
										cloudInputFiles.map((file) => [
											file.id,
											'uploaded' as const,
										]),
									),
								}
							: turn,
					),
				);
			}

			const runPayload = await aiApiFetch<
				AiRunSummary | AiApiEnvelope<AiRunSummary>
			>('/runs', {
				method: 'POST',
				body: {
					idempotencyKey,
					quoteId: freshQuote.quoteId,
					operation: submittedOperation,
					modelId: submittedDraft.modelId,
					...(conversationId ? { conversationId } : {}),
					contextEnabled:
						session.authenticated && supportsContext && Boolean(conversationId)
							? submittedDraft.contextEnabled
							: false,
					...(submittedUseConversationReference
						? { useConversationReference: true }
						: {}),
					...(submittedDraft.promptId
						? { promptId: submittedDraft.promptId }
						: {}),
					...(submittedDraft.publicShareDraftToken
						? { publicShareDraftToken: submittedDraft.publicShareDraftToken }
						: {}),
					...(submittedDraft.publicPromptUseToken
						? { publicPromptUseToken: submittedDraft.publicPromptUseToken }
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
						submittedModel.capabilities,
					),
					inputFileIds,
				},
				timeoutMs: 30_000,
			});
			const nextRun = unwrapAiData(runPayload);
			if (viewEpoch.current === submissionEpoch) {
				setTurns((current) =>
					current.map((turn) =>
						turn.id === clientId
							? {
									...turn,
									sequence: nextRun.sequence ?? turn.sequence,
									run: nextRun,
									createdAt: nextRun.createdAt,
									modelName: nextRun.modelName,
									submissionState: 'active',
								}
							: turn,
					),
				);
			}
			conversationHistory.reload();
			if (!session.authenticated) void models.refresh();
			broadcastConversationChange(
				nextRun.conversationId || conversationId,
				'started',
			);
		} catch (error) {
			const message = getAiErrorMessage(error);
			if (viewEpoch.current === submissionEpoch) {
				setTurns((current) =>
					current.map((turn) =>
						turn.id === clientId
							? {
									...turn,
									submissionState: 'failed',
									submitError: message,
									uploadStates: Object.fromEntries(
										Object.entries(turn.uploadStates || {}).map(
											([id, state]) => [
												id,
												state === 'uploading' ? 'failed' : state,
											],
										),
									),
								}
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

	function handleReferenceDragEnter(event: DragEvent<HTMLElement>) {
		if (!hasFileTransfer(event.dataTransfer)) return;
		event.preventDefault();
		const canAccept = canAcceptReferenceDrag(event.dataTransfer);
		event.dataTransfer.dropEffect = canAccept ? 'copy' : 'none';
		setIsValidReferenceDrag(canAccept);
		setAttachmentStatus(
			canAccept
				? `${dropTitle}. ${dropDescription}`
				: t(
						'Эти файлы нельзя прикрепить к выбранной модели',
						'These files cannot be attached to the selected model',
					),
		);
	}

	function handleReferenceDragOver(event: DragEvent<HTMLElement>) {
		if (!hasFileTransfer(event.dataTransfer)) return;
		event.preventDefault();
		const canAccept = canAcceptReferenceDrag(event.dataTransfer);
		event.dataTransfer.dropEffect = canAccept ? 'copy' : 'none';
		setIsValidReferenceDrag(canAccept);
	}

	function handleReferenceDragLeave(event: DragEvent<HTMLElement>) {
		const nextTarget = event.relatedTarget as Node | null;
		if (nextTarget && event.currentTarget.contains(nextTarget)) return;
		setIsValidReferenceDrag(false);
	}

	function handleReferenceDrop(event: DragEvent<HTMLElement>) {
		if (!hasFileTransfer(event.dataTransfer)) return;
		event.preventDefault();
		event.stopPropagation();
		setIsValidReferenceDrag(false);

		const droppedFiles = getDataTransferFiles(event.dataTransfer);
		if (droppedFiles.length === 0) {
			setAttachmentStatus(
				t(
					'Не удалось прочитать перетаскиваемые файлы',
					'Unable to read dropped files',
				),
			);
			return;
		}
		addReferenceFiles(droppedFiles);
	}

	function removeReference(referenceId: string) {
		const current = referencesRef.current;
		const removedIndex = current.findIndex(
			(reference) => reference.id === referenceId,
		);
		const removed = current[removedIndex];
		if (!removed) return;

		URL.revokeObjectURL(removed.previewUrl);
		const nextReferences = current.filter(
			(reference) => reference.id !== referenceId,
		);
		referencesRef.current = nextReferences;
		setReferences(nextReferences);
		setDraft((currentDraft) => ({
			...currentDraft,
			prompt: remapReferencePromptTags(
				currentDraft.prompt,
				capabilities?.referencePromptTag,
				current,
				nextReferences,
			),
		}));
		setQuoteError(null);
		setAttachmentStatus(
			t(
				`Файл ${removed.file.name} удалён`,
				`File ${removed.file.name} removed`,
			),
		);
		if (fileInput.current) fileInput.current.value = '';
	}

	function reorderReferences(sourceId: string, targetId: string) {
		if (sourceId === targetId) return;
		const current = referencesRef.current;
		const sourceIndex = current.findIndex(
			(reference) => reference.id === sourceId,
		);
		const targetIndex = current.findIndex(
			(reference) => reference.id === targetId,
		);
		if (sourceIndex < 0 || targetIndex < 0) return;

		const nextReferences = [...current];
		const [moved] = nextReferences.splice(sourceIndex, 1);
		nextReferences.splice(targetIndex, 0, moved);
		referencesRef.current = nextReferences;
		setReferences(nextReferences);
		setDraft((currentDraft) => ({
			...currentDraft,
			prompt: remapReferencePromptTags(
				currentDraft.prompt,
				capabilities?.referencePromptTag,
				current,
				nextReferences,
			),
		}));
		setAttachmentStatus(
			t(
				`Изображение перемещено на позицию ${targetIndex + 1}`,
				`Image moved to position ${targetIndex + 1}`,
			),
		);
	}

	function clearReferences() {
		referencesRef.current.forEach((reference) =>
			URL.revokeObjectURL(reference.previewUrl),
		);
		referencesRef.current = [];
		setReferences([]);
		setIsValidReferenceDrag(false);
		setAttachmentStatus('');
		if (fileInput.current) fileInput.current.value = '';
	}

	function consumeReferences() {
		referencesRef.current = [];
		setReferences([]);
		if (fileInput.current) fileInput.current.value = '';
	}

	async function handleContextChange(contextEnabled: boolean) {
		if (!supportsContext) return;
		const previous = draft.contextEnabled;
		setDraft((current) => ({ ...current, contextEnabled }));
		setConversationError(null);
		if (!draft.conversationId || !session.authenticated) return;
		setIsContextSaving(true);
		try {
			await aiApiFetch(
				`/conversations/${encodeURIComponent(draft.conversationId)}`,
				{
					method: 'PATCH',
					body: { contextEnabled },
				},
			);
			conversationHistory.reload();
			broadcastConversationChange(draft.conversationId);
		} catch (error) {
			setDraft((current) => ({ ...current, contextEnabled: previous }));
			setConversationError(getAiErrorMessage(error));
		} finally {
			setIsContextSaving(false);
		}
	}

	function beginConversationTitleEditing() {
		if (!draft.conversationId || isConversationTitleSaving) return;
		setConversationTitleDraft(conversationTitle);
		setConversationError(null);
		setIsConversationTitleEditing(true);
	}

	function cancelConversationTitleEditing() {
		if (isConversationTitleSaving) return;
		setConversationTitleDraft('');
		setIsConversationTitleEditing(false);
	}

	async function saveConversationTitle() {
		if (!draft.conversationId || isConversationTitleSaving) return;
		const nextTitle = conversationTitleDraft.replace(/\s+/g, ' ').trim();
		if (!nextTitle) {
			setConversationError(
				t(
					'Название чата не может быть пустым',
					'The chat title cannot be empty',
				),
			);
			return;
		}
		if (nextTitle === conversationTitle) {
			cancelConversationTitleEditing();
			return;
		}

		setIsConversationTitleSaving(true);
		setConversationError(null);
		try {
			const payload = await aiApiFetch<
				AiConversation | AiApiEnvelope<AiConversation>
			>(`/conversations/${encodeURIComponent(draft.conversationId)}`, {
				method: 'PATCH',
				body: { title: nextTitle },
			});
			const conversation = unwrapAiData(payload);
			setConversationTitle(conversation.title);
			setConversationTitleDraft('');
			setIsConversationTitleEditing(false);
			conversationHistory.reload();
			broadcastConversationChange(conversation.id);
		} catch (error) {
			setConversationError(getAiErrorMessage(error));
		} finally {
			setIsConversationTitleSaving(false);
		}
	}

	function startNewChat() {
		if (
			hasPendingTurn &&
			!window.confirm(
				t(
					'Текущая генерация ещё выполняется. Начать новый чат?',
					'A generation is still in progress. Start a new chat?',
				),
			)
		) {
			return;
		}
		viewEpoch.current += 1;
		hydratedConversation.current = null;
		clearReferences();
		setIsConversationLoading(false);
		setTurns([]);
		setConversationTitle(getCreateTitle(kind, isEnglish));
		setIsConversationTitleEditing(false);
		setConversationError(null);
		setIsHistoryOpen(false);
		setDraft((current) => ({
			...current,
			conversationId: '',
			contextEnabled: false,
			idempotencyKey: '',
			prompt: '',
			catalogPromptOverride: false,
			promptId: null,
			promptCompatibleModelIds: [],
			promptMinimumReferenceFiles: 0,
			promptMaximumReferenceFiles: 0,
			promptTitle: '',
			publicShareDraftToken: '',
			publicPromptUseToken: '',
			repeatRunId: '',
			replaceReference: false,
		}));
	}

	function selectConversation(conversationId: string) {
		if (conversationId === draft.conversationId) {
			setIsHistoryOpen(false);
			threadPinnedToBottom.current = true;
			scrollThreadToBottom();
			return;
		}
		if (
			hasPendingTurn &&
			!window.confirm(
				t(
					'Текущая генерация ещё выполняется. Открыть другой чат?',
					'A generation is still in progress. Open another chat?',
				),
			)
		) {
			return;
		}
		viewEpoch.current += 1;
		clearReferences();
		hydratedConversation.current = null;
		setTurns([]);
		setConversationTitle(
			visibleConversations.find(
				(conversation) => conversation.id === conversationId,
			)?.title || getCreateTitle(kind, isEnglish),
		);
		setIsConversationTitleEditing(false);
		setConversationError(null);
		setIsConversationLoading(true);
		setIsHistoryOpen(false);
		setDraft((current) => ({
			...current,
			conversationId,
			idempotencyKey: '',
			prompt: '',
			catalogPromptOverride: false,
			promptId: null,
			promptCompatibleModelIds: [],
			promptMinimumReferenceFiles: 0,
			promptMaximumReferenceFiles: 0,
			promptTitle: '',
			publicShareDraftToken: '',
			publicPromptUseToken: '',
			repeatRunId: '',
			replaceReference: false,
		}));
	}

	async function deleteConversation(conversation: AiConversation) {
		if (conversation.id === draft.conversationId && hasPendingTurn) {
			setHistoryMutationError(
				t(
					'Дождитесь завершения текущей генерации перед удалением этого чата.',
					'Wait for the current generation to finish before deleting this chat.',
				),
			);
			return;
		}
		if (
			!window.confirm(
				t(
					`Удалить чат «${conversation.title || 'Без названия'}»?`,
					`Delete “${conversation.title || 'Untitled chat'}”?`,
				),
			)
		) {
			return;
		}

		setDeletingConversationId(conversation.id);
		setHistoryMutationError(null);
		try {
			await aiApiFetch(
				`/conversations/${encodeURIComponent(conversation.id)}`,
				{
					method: 'DELETE',
				},
			);
			conversationHistory.update((current) =>
				current
					? {
							...current,
							data: current.data.filter(
								(entry) => entry.id !== conversation.id,
							),
							total: Math.max(0, current.total - 1),
						}
					: current,
			);
			setHistoryMutationError(null);
			broadcastConversationChange(conversation.id);
			if (conversation.id === draft.conversationId) startNewChat();
		} catch (error) {
			setHistoryMutationError(getAiErrorMessage(error));
		} finally {
			setDeletingConversationId(null);
		}
	}

	const requiresToolConfig = isTool && !tools.isLoading && !tool;
	const modelFamilies = useMemo(
		() => createModelFamilies(availableModels),
		[availableModels],
	);
	const selectedModelFamily = useMemo(
		() =>
			modelFamilies.find((family) =>
				family.entries.some(({ model }) => model.id === draft.modelId),
			) ||
			modelFamilies[0] ||
			null,
		[draft.modelId, modelFamilies],
	);
	const modelFamilyOptions = useMemo<AiSelectOption<string>[]>(
		() =>
			modelFamilies.map((family) => {
				const freeAllowance = summarizeFamilyFreeAllowance(family);
				return {
					value: family.key,
					label: family.label,
					href: syncModelUrl
						? `/ai/create/${getCreatePathKind(kind)}/${getModelFamilyRouteSlug(family.label, kind)}`
						: undefined,
					disabled: family.entries.every(({ model }) => !model.available),
					visual: (
						<AiModelLogo
							label={family.label}
							logoUrl={
								family.entries.find(({ model }) => model.available)?.model
									.logoUrl || family.entries[0]?.model.logoUrl
							}
						/>
					),
					...(freeAllowance
						? {
								badge: (
									<FreeAllowanceBadge
										isEnglish={isEnglish}
										remaining={freeAllowance.remaining}
										total={freeAllowance.total}
									/>
								),
							}
						: {}),
				};
			}),
		[isEnglish, kind, modelFamilies, syncModelUrl],
	);
	const modelVersionOptions = useMemo<AiSelectOption<string>[]>(
		() => createModelVersionOptions(selectedModelFamily, isEnglish),
		[isEnglish, selectedModelFamily],
	);

	function selectModelFamily(familyKey: string) {
		const family = modelFamilies.find(
			(candidate) => candidate.key === familyKey,
		);
		const model =
			family?.entries.find((entry) => entry.model.available)?.model ||
			family?.entries[0]?.model;
		if (!model) return;
		setQuoteError(null);
		setDraft((current) => selectDraftModel(current, model.id));
		if (syncModelUrl) {
			const familySlug = getModelFamilyRouteSlug(family.label, kind);
			const nextPath = `/ai/create/${getCreatePathKind(kind)}/${familySlug}`;
			if (pathname !== nextPath) router.replace(nextPath, { scroll: false });
		}
	}

	function selectModelVersion(modelId: string) {
		setQuoteError(null);
		setDraft((current) => selectDraftModel(current, modelId));
	}

	const CompactTitle = semanticTitle ? 'h1' : 'div';

	return (
		<AiPage className={styles.workspacePage}>
			<div className={styles.workspace}>
				<div className={styles.compactHeader}>
					<Link className={styles.compactBack} href='/ai'>
						<FiArrowLeft aria-hidden='true' />
						<span>{t('Назад', 'Back')}</span>
					</Link>
					<span aria-hidden='true' className={styles.compactDivider} />
					<CompactTitle className={styles.compactTitle}>
						{pageTitle || getCreateTitle(kind, isEnglish)}
					</CompactTitle>
				</div>

				<div className={styles.workspaceBody}>
					<AsyncState
						error={models.error || (isTool ? tools.error : null)}
						isEmpty={!availableModels.length || requiresToolConfig}
						isLoading={models.isLoading || (isTool && tools.isLoading)}
						emptyTitle={
							requiresToolConfig
								? t('Инструмент пока не настроен', 'Tool is not configured yet')
								: t('Нет доступных моделей', 'No models available')
						}
						emptyDescription={
							requiresToolConfig
								? t(
										'Администратор должен опубликовать конфигурацию полей и связать модели.',
										'An administrator must publish the field configuration and connect models.',
									)
								: t(
										'Подходящие модели временно недоступны.',
										'Compatible models are temporarily unavailable.',
									)
						}
						onRetry={() => {
							models.reload();
							tools.reload();
						}}
					>
						<ImageGalleryProvider>
							<form
								className={styles.layout}
								ref={chatForm}
								onSubmit={handleSubmit}
							>
								{isHistoryOpen ? (
									<button
										aria-label={t(
											'Закрыть историю чатов',
											'Close chat history',
										)}
										className={styles.historyBackdrop}
										type='button'
										onClick={() => setIsHistoryOpen(false)}
									/>
								) : null}

								<aside
									aria-label={t('История чатов', 'Chat history')}
									aria-modal={isHistoryOpen ? true : undefined}
									className={`${styles.history} ${isHistoryOpen ? styles.historyOpen : ''}`}
									id={`ai-chat-history-${kind}`}
									ref={historyRef}
									role={isHistoryOpen ? 'dialog' : undefined}
									tabIndex={isHistoryOpen ? -1 : undefined}
								>
									<AiCard className={styles.historyCard}>
										<div className={styles.historyHeading}>
											<div>
												<h2>{t('История чатов', 'Chat history')}</h2>
											</div>
											<button
												aria-label={t(
													'Закрыть историю чатов',
													'Close chat history',
												)}
												className={styles.historyClose}
												type='button'
												onClick={() => setIsHistoryOpen(false)}
											>
												<FiX aria-hidden='true' />
											</button>
										</div>
										<button
											className={styles.historyNewChat}
											type='button'
											onClick={startNewChat}
										>
											<FiPlus aria-hidden='true' /> {t('Новый чат', 'New chat')}
										</button>

										<div className={styles.historyListArea} aria-live='polite'>
											{historyMutationError ? (
												<p className={styles.historyMutationError} role='alert'>
													{historyMutationError}
												</p>
											) : null}
											{!session.authenticated ? (
												<div className={styles.historyState}>
													<FiMessageCircle aria-hidden='true' />
													<p>
														{t(
															'Войдите, чтобы сохранять и открывать историю чатов.',
															'Sign in to save and open chat history.',
														)}
													</p>
													<Link
														href={`/ai/auth?returnTo=${encodeURIComponent(getGenerationPath(kind, requestedModelSlug))}`}
													>
														{t('Войти', 'Sign in')}
													</Link>
												</div>
											) : conversationHistory.isLoading ? (
												<div className={styles.historyState} role='status'>
													<FiRefreshCw
														aria-hidden='true'
														className={styles.spinningIcon}
													/>
													<p>{t('Загружаем чаты…', 'Loading chats…')}</p>
												</div>
											) : conversationHistory.error ? (
												<div className={styles.historyState} role='alert'>
													<p>{conversationHistory.error}</p>
													<button
														type='button'
														onClick={conversationHistory.reload}
													>
														{t('Повторить', 'Retry')}
													</button>
												</div>
											) : visibleConversations.length ? (
												<ul className={styles.historyList}>
													{visibleConversations.map((conversation) => {
														const isActive =
															conversation.id === draft.conversationId;
														return (
															<li
																className={styles.historyItemRow}
																key={conversation.id}
															>
																<button
																	aria-current={isActive ? 'page' : undefined}
																	className={`${styles.historyOpenButton} ${isActive ? styles.historyItemActive : ''}`}
																	type='button'
																	onClick={() =>
																		selectConversation(conversation.id)
																	}
																>
																	<span>
																		<FiMessageCircle aria-hidden='true' />
																	</span>
																	<span>
																		<ConversationHistoryTitle
																			title={
																				conversation.title ||
																				t('Чат без названия', 'Untitled chat')
																			}
																		/>
																		<time dateTime={conversation.updatedAt}>
																			{formatConversationDate(
																				conversation.updatedAt,
																				locale,
																			)}
																		</time>
																	</span>
																</button>
																<button
																	aria-label={t(
																		`Удалить чат ${conversation.title || 'без названия'}`,
																		`Delete chat ${conversation.title || 'without a title'}`,
																	)}
																	className={styles.historyDeleteButton}
																	disabled={
																		deletingConversationId === conversation.id
																	}
																	title={t('Удалить чат', 'Delete chat')}
																	type='button'
																	onClick={() =>
																		void deleteConversation(conversation)
																	}
																>
																	{deletingConversationId ===
																	conversation.id ? (
																		<FiRefreshCw
																			aria-hidden='true'
																			className={styles.spinningIcon}
																		/>
																	) : (
																		<FiTrash2 aria-hidden='true' />
																	)}
																</button>
															</li>
														);
													})}
												</ul>
											) : (
												<div className={styles.historyState}>
													<FiMessageCircle aria-hidden='true' />
													<p>
														{t(
															'Здесь появятся ваши сохранённые чаты.',
															'Your saved chats will appear here.',
														)}
													</p>
												</div>
											)}
										</div>
									</AiCard>
								</aside>

								<AiCard
									className={styles.chat}
									onDragEnd={() => setIsValidReferenceDrag(false)}
									onDragEnter={handleReferenceDragEnter}
									onDragLeave={handleReferenceDragLeave}
									onDragOver={handleReferenceDragOver}
									onDrop={handleReferenceDrop}
								>
									{isValidReferenceDrag ? (
										<div aria-hidden='true' className={styles.dropOverlay}>
											<span>
												<FiPaperclip />
											</span>
											<strong>{dropTitle}</strong>
											<small>{dropDescription}</small>
										</div>
									) : null}
									<div className={styles.chatToolbar}>
										<div className={styles.chatTitle}>
											{isConversationTitleEditing ? (
												<div className={styles.chatTitleEditor}>
													<input
														aria-label={t('Название чата', 'Chat title')}
														autoFocus
														disabled={isConversationTitleSaving}
														maxLength={160}
														value={conversationTitleDraft}
														onChange={(event) =>
															setConversationTitleDraft(event.target.value)
														}
														onKeyDown={(event) => {
															if (event.key === 'Enter') {
																event.preventDefault();
																void saveConversationTitle();
															} else if (event.key === 'Escape') {
																event.preventDefault();
																cancelConversationTitleEditing();
															}
														}}
													/>
													<button
														aria-label={t('Сохранить название', 'Save title')}
														className={styles.confirmChatTitleButton}
														disabled={isConversationTitleSaving}
														title={t('Сохранить название', 'Save title')}
														type='button'
														onClick={() => void saveConversationTitle()}
													>
														{isConversationTitleSaving ? (
															<FiRefreshCw
																aria-hidden='true'
																className={styles.spinningIcon}
															/>
														) : (
															<FiCheck aria-hidden='true' />
														)}
													</button>
												</div>
											) : draft.conversationId ? (
												<button
													aria-label={t('Переименовать чат', 'Rename chat')}
													className={styles.chatTitleTrigger}
													title={t(
														'Нажмите, чтобы переименовать чат',
														'Click to rename chat',
													)}
													type='button'
													onClick={beginConversationTitleEditing}
												>
													{draft.conversationId
														? conversationTitle
														: getCreateTitle(kind, isEnglish)}
												</button>
											) : (
												<strong>{getCreateTitle(kind, isEnglish)}</strong>
											)}
										</div>
										<div className={styles.mobileToolbarActions}>
											<button
												aria-label={t('Открыть историю', 'Open history')}
												aria-controls={`ai-chat-history-${kind}`}
												aria-expanded={isHistoryOpen}
												className={styles.mobileHistoryButton}
												title={t('История', 'History')}
												type='button'
												onClick={() => {
													setIsSettingsOpen(false);
													setIsHistoryOpen(true);
												}}
											>
												<FiMessageCircle aria-hidden='true' />
											</button>
											<button
												aria-label={t('Открыть настройки', 'Open settings')}
												aria-controls={`ai-chat-settings-${kind}`}
												aria-expanded={isSettingsOpen}
												className={styles.mobileSettingsButton}
												title={t('Настройки', 'Settings')}
												type='button'
												onClick={() => {
													setIsHistoryOpen(false);
													setIsSettingsOpen(true);
												}}
											>
												<FiSettings aria-hidden='true' />
											</button>
										</div>
									</div>

									<div className={styles.threadShell}>
										<div
											aria-live='polite'
											className={styles.thread}
											ref={thread}
											onPointerDown={markThreadAsUserControlled}
											onScroll={handleThreadScroll}
											onTouchStart={markThreadAsUserControlled}
											onWheel={markThreadAsUserControlled}
										>
											<div className={styles.threadContent} ref={threadContent}>
												{isConversationLoading ? (
													<div
														className={styles.conversationLoading}
														role='status'
													>
														<FiRefreshCw aria-hidden='true' />
														{t('Загружаем чат…', 'Loading chat…')}
													</div>
												) : turns.length ? (
													turns.map((turn) => (
														<ChatTurnMessage
															createdAt={turn.createdAt}
															initialOutputs={turn.outputs}
															inputFiles={turn.inputFiles}
															key={turn.id}
															modelLogoUrl={
																availableModels.find(
																	(model) =>
																		model.id ===
																		(turn.run?.modelId || turn.modelId),
																)?.logoUrl
															}
															modelName={turn.modelName}
															prompt={turn.prompt}
															run={turn.run}
															submissionState={turn.submissionState}
															submitError={turn.submitError}
															uploadStates={turn.uploadStates}
															onUpdate={updateTurn}
															onRetry={() => retryFailedTurn(turn)}
															retryDisabled={hasPendingTurn}
														/>
													))
												) : (
													<div className={styles.emptyChat}>
														<span>
															<RiSparkling2Fill aria-hidden='true' />
														</span>
														<h2>
															{t('Начните диалог', 'Start a conversation')}
														</h2>
														<p>
															{kind === 'image'
																? t(
																		'Опишите изображение. Следующий запрос сможет учитывать предыдущий результат.',
																		'Describe an image. The next request can use the previous result.',
																	)
																: kind === 'video'
																	? t(
																			'Опишите ролик — каждый запрос будет самостоятельной генерацией.',
																			'Describe a video — every request is generated independently.',
																		)
																	: isTool
																		? t(
																				'Загрузите одно или несколько фото — инструмент разберёт их и подготовит готовый промпт для новой фотографии. При желании добавьте свои пожелания.',
																				'Upload one or more images — the tool will analyze them and create a ready-to-use prompt for a new image. You can also add optional wishes.',
																			)
																		: t(
																				'Задайте вопрос или опишите задачу — ответ появится прямо здесь.',
																				'Ask a question or describe a task — the answer will appear here.',
																			)}
														</p>
													</div>
												)}
											</div>
										</div>
										{showScrollToBottom ? (
											<button
												aria-label={t(
													'Прокрутить к последнему сообщению',
													'Scroll to the latest message',
												)}
												className={styles.scrollToBottomButton}
												title={t('Вниз', 'Down')}
												type='button'
												onClick={smoothlyScrollThreadToBottom}
											>
												<FiChevronDown aria-hidden='true' />
											</button>
										) : null}
									</div>

									<div className={styles.composer}>
										{showToolReferencePicker ? (
											<button
												aria-controls={`ai-chat-file-input-${kind}`}
												className={styles.toolReferencePicker}
												type='button'
												onClick={() => fileInput.current?.click()}
											>
												<span className={styles.toolReferencePickerIcon}>
													<FiImage aria-hidden='true' />
												</span>
												<span>
													<strong>
														{t(
															'Добавьте минимум 1 фото',
															'Add at least 1 image',
														)}
													</strong>
													<small>
														{t(
															`Можно загрузить до ${formatImageCount(maxReferenceFiles)}`,
															`You can upload up to ${maxReferenceFiles} ${maxReferenceFiles === 1 ? 'image' : 'images'}`,
														)}
													</small>
												</span>
											</button>
										) : null}
										{referenceInputVisible && (acceptsVideo || acceptsAudio) ? (
											<div
												aria-label={t(
													'Поддерживаемые вложения',
													'Supported attachments',
												)}
												className={styles.attachmentSupportBar}
											>
												{attachmentSupportKinds.map((item) => (
													<span
														className={styles.attachmentSupportItem}
														data-kind={item.kind}
														key={item.kind}
													>
														<i aria-hidden='true'>
															{item.kind === 'video' ? (
																<FiVideo />
															) : item.kind === 'audio' ? (
																<FiMusic />
															) : item.kind === 'document' ? (
																<FiFileText />
															) : (
																<FiImage />
															)}
														</i>
														<span>
															<strong>
																{getAttachmentKindLabel(item.kind, t)}
															</strong>
															<small>
																{t('до', 'up to')} {item.max} ·{' '}
																{formatFileSize(item.maxBytes, locale)}
															</small>
														</span>
													</span>
												))}
											</div>
										) : null}
										{referenceInputVisible &&
										hasRemoteReference &&
										references.length === 0 ? (
											<div
												className={`${styles.composerAttachment} ${styles.composerRemoteAttachment}`}
											>
												<FiCheck aria-hidden='true' />
												<span>
													{kind === 'image' &&
													draft.contextEnabled &&
													hasContextImage
														? t(
																'Прикреплён последний результат этого чата',
																'The latest result from this chat is attached',
															)
														: draft.publicShareDraftToken
															? t(
																	'Прикреплено изображение из публичной работы',
																	'An image from the public work is attached',
																)
															: t(
																	'Прикреплён исходный файл генерации',
																	'The original generation file is attached',
																)}
												</span>
											</div>
										) : null}
										{references.length || missingPromptReferenceSlots > 0 ? (
											<ul
												aria-label={t(
													`Прикреплено: ${acceptsFiles ? formatFileCount(references.length) : formatImageCount(references.length)}`,
													`Attached: ${references.length} ${acceptsFiles ? (references.length === 1 ? 'file' : 'files') : references.length === 1 ? 'image' : 'images'}`,
												)}
												aria-live='polite'
												className={styles.composerAttachments}
											>
												{references.map((reference) => (
													<li
														aria-label={t(
															`Вложение ${reference.file.name}. Перетаскивайте для изменения порядка`,
															`Attachment ${reference.file.name}. Drag to reorder`,
														)}
														aria-roledescription={t(
															'перетаскиваемое вложение',
															'draggable attachment',
														)}
														className={`${styles.composerAttachmentTile} ${
															draggedReferenceId === reference.id
																? styles.composerAttachmentDragging
																: ''
														}`}
														draggable
														key={reference.id}
														tabIndex={0}
														onDragEnd={() => setDraggedReferenceId(null)}
														onDragOver={(event) => {
															if (
																!draggedReferenceId ||
																draggedReferenceId === reference.id
															)
																return;
															event.preventDefault();
															event.stopPropagation();
															event.dataTransfer.dropEffect = 'move';
														}}
														onDragStart={(event) => {
															event.stopPropagation();
															event.dataTransfer.effectAllowed = 'move';
															event.dataTransfer.setData(
																'application/x-neuroluv-reference',
																reference.id,
															);
															setDraggedReferenceId(reference.id);
														}}
														onDrop={(event) => {
															event.preventDefault();
															event.stopPropagation();
															const sourceId =
																event.dataTransfer.getData(
																	'application/x-neuroluv-reference',
																) || draggedReferenceId;
															if (sourceId)
																reorderReferences(sourceId, reference.id);
															setDraggedReferenceId(null);
														}}
														onKeyDown={(event) => {
															if (
																!event.altKey ||
																!['ArrowLeft', 'ArrowRight'].includes(event.key)
															) {
																return;
															}
															event.preventDefault();
															const currentIndex = references.findIndex(
																(item) => item.id === reference.id,
															);
															const nextIndex =
																event.key === 'ArrowLeft'
																	? Math.max(0, currentIndex - 1)
																	: Math.min(
																			references.length - 1,
																			currentIndex + 1,
																		);
															const target = references[nextIndex];
															if (target)
																reorderReferences(reference.id, target.id);
														}}
													>
														{reference.file.type.startsWith('image/') ? (
															<ImageLightbox
																alt={reference.file.name}
																fileName={reference.file.name}
																fullUrl={reference.previewUrl}
																kind='image'
																previewUrl={reference.previewUrl}
																triggerClassName={
																	styles.composerAttachmentPreview
																}
															>
																{/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
																<img
																	alt=''
																	draggable={false}
																	src={reference.previewUrl}
																/>
															</ImageLightbox>
														) : reference.file.type.startsWith('video/') ? (
															<div
																aria-label={t(
																	`Видео ${reference.file.name}`,
																	`Video ${reference.file.name}`,
																)}
																className={`${styles.composerAttachmentPreview} ${styles.composerAttachmentMedia}`}
															>
																<video
																	aria-hidden='true'
																	muted
																	playsInline
																	preload='metadata'
																	src={reference.previewUrl}
																/>
																<FiVideo aria-hidden='true' />
															</div>
														) : (
															<div
																aria-label={
																	reference.file.type.startsWith('audio/')
																		? t(
																				`Аудио ${reference.file.name}`,
																				`Audio ${reference.file.name}`,
																			)
																		: t(
																				`Файл ${reference.file.name}`,
																				`File ${reference.file.name}`,
																			)
																}
																className={`${styles.composerAttachmentPreview} ${
																	reference.file.type.startsWith('audio/')
																		? styles.composerAttachmentAudio
																		: ''
																}`}
															>
																{reference.file.type.startsWith('audio/') ? (
																	<FiMusic aria-hidden='true' />
																) : (
																	<FiFileText aria-hidden='true' />
																)}
															</div>
														)}
														<small className={styles.composerAttachmentSize}>
															{formatFileSize(reference.file.size, locale)}
														</small>
														<button
															aria-label={`${t('Удалить файл', 'Remove file')} ${reference.file.name}`}
															className={styles.composerAttachmentRemove}
															type='button'
															onClick={() => removeReference(reference.id)}
														>
															<FiX aria-hidden='true' />
														</button>
													</li>
												))}
												{Array.from(
													{ length: missingPromptReferenceSlots },
													(_, slotIndex) => {
														const referenceIndex =
															activeReferenceCount + slotIndex + 1;
														return (
															<li
																className={styles.composerAttachmentSlotItem}
																key={`prompt-reference-slot-${referenceIndex}`}
															>
																<button
																	aria-controls={`ai-chat-file-input-${kind}`}
																	aria-label={t(
																		`Добавить обязательное фото ${referenceIndex}`,
																		`Add required image ${referenceIndex}`,
																	)}
																	className={styles.composerAttachmentSlot}
																	type='button'
																	onClick={() => fileInput.current?.click()}
																>
																	<FiImage aria-hidden='true' />
																	<span>
																		{t(
																			`Фото ${referenceIndex}`,
																			`Image ${referenceIndex}`,
																		)}
																	</span>
																</button>
															</li>
														);
													},
												)}
											</ul>
										) : null}
										<input
											ref={fileInput}
											id={`ai-chat-file-input-${kind}`}
											accept={[...acceptedReferenceMimeTypes].join(',')}
											aria-required={referenceRequired}
											className={styles.visuallyHidden}
											multiple={maxReferenceFiles > 1}
											type='file'
											onChange={handleReference}
										/>
										<PromptComposerEditor
											maxLength={10_000}
											mentions={referenceMentions}
											placeholder={getComposerPlaceholder(kind, isEnglish)}
											value={draft.prompt}
											onChange={(prompt) =>
												setDraft((current) => ({
													...current,
													prompt,
												}))
											}
											onSubmit={() => chatForm.current?.requestSubmit()}
										/>
										<div className={styles.composerActions}>
											{referenceInputVisible ? (
												<button
													aria-controls={`ai-chat-file-input-${kind}`}
													aria-describedby={attachmentStatusId}
													aria-label={
														maxReferenceFiles > 1
															? t(
																	`Прикрепить ${acceptsFiles ? 'файлы' : 'изображения'}, максимум ${maxReferenceFiles}`,
																	`Attach ${acceptsFiles ? 'files' : 'images'}, up to ${maxReferenceFiles}`,
																)
															: t(
																	`Прикрепить ${acceptsFiles ? 'файл' : 'изображение'}`,
																	`Attach ${acceptsFiles ? 'a file' : 'an image'}`,
																)
													}
													className={styles.attachButton}
													type='button'
													onClick={() => fileInput.current?.click()}
												>
													<FiPaperclip aria-hidden='true' />
												</button>
											) : null}
											<div
												aria-label={getQuoteAriaLabel(
													quote,
													quoteState,
													locale,
													isEnglish,
												)}
												aria-live='polite'
												className={styles.composerPrice}
												title={
													quote?.pricing.calculation === 'metered_request'
														? t(
																'Итог зависит от длины ответа',
																'The final price depends on the response length',
															)
														: undefined
												}
											>
												{quote ? (
													<>
														<FiZap aria-hidden='true' />
														<strong>
															{quote.pricing.calculation === 'metered_request'
																? '≈ '
																: ''}
															{formatCreditNumber(
																getDisplayedQuoteCredits(quote),
																locale,
															)}
														</strong>
													</>
												) : quoteState === 'debouncing' ||
												  quoteState === 'loading' ? (
													<span
														aria-hidden='true'
														className={styles.quoteSpinner}
													/>
												) : null}
											</div>
											<span className={styles.composerShortcutHint}>
												<span>
													<kbd>Enter</kbd> — {t('отправить', 'send')}
												</span>
												<span>
													<kbd>Shift + Enter</kbd> —{' '}
													{t('новая строка', 'new line')}
												</span>
											</span>
											<button
												aria-label={t('Отправить сообщение', 'Send message')}
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
												type='submit'
											>
												{isSubmitting ? (
													<FiClock aria-hidden='true' />
												) : (
													<FiSend aria-hidden='true' />
												)}
											</button>
										</div>
										{promptVariablesMessage ? (
											<FieldMessage>{promptVariablesMessage}</FieldMessage>
										) : composerReferenceBlockMessage ? (
											<FieldMessage>
												{composerReferenceBlockMessage}
											</FieldMessage>
										) : quoteError &&
										  quoteError !== videoReferenceMinimumMessage ? (
											<FieldMessage>{quoteError}</FieldMessage>
										) : null}
										<p
											aria-atomic='true'
											aria-live='polite'
											className={styles.visuallyHidden}
											id={attachmentStatusId}
											role='status'
										>
											{attachmentStatus}
										</p>
									</div>
								</AiCard>

								{isSettingsOpen ? (
									<button
										aria-label={t('Закрыть настройки', 'Close settings')}
										className={styles.settingsBackdrop}
										type='button'
										onClick={() => setIsSettingsOpen(false)}
									/>
								) : null}

								<aside
									aria-label={t('Настройки генерации', 'Generation settings')}
									className={`${styles.settings} ${isSettingsOpen ? styles.settingsOpen : ''}`}
									id={`ai-chat-settings-${kind}`}
									ref={settingsRef}
									role={isSettingsOpen ? 'dialog' : undefined}
									aria-modal={isSettingsOpen ? true : undefined}
									tabIndex={isSettingsOpen ? -1 : undefined}
								>
									<AiCard className={styles.settingsCard}>
										<div className={styles.settingsHeading}>
											<div>
												<h2>{t('Настройки чата', 'Chat settings')}</h2>
											</div>
											<button
												aria-label={t('Закрыть настройки', 'Close settings')}
												className={styles.settingsClose}
												type='button'
												onClick={() => setIsSettingsOpen(false)}
											>
												<FiX aria-hidden='true' />
											</button>
										</div>

										<AiSelect
											compact
											disabled={Boolean(
												draft.promptId &&
												draft.promptCompatibleModelIds.length <= 1,
											)}
											id={`ai-model-family-${kind}`}
											label={t('Нейросеть', 'AI model')}
											options={modelFamilyOptions}
											value={selectedModelFamily?.key || null}
											onChange={selectModelFamily}
										/>

										<AiSelect
											compact
											disabled={Boolean(
												draft.promptId &&
												draft.promptCompatibleModelIds.length <= 1,
											)}
											id={`ai-model-version-${kind}`}
											label={t('Версия', 'Version')}
											options={modelVersionOptions}
											value={draft.modelId}
											onChange={selectModelVersion}
										/>

										{supportsContext ? (
											<label className={styles.contextToggle}>
												<span>
													<strong>
														{t('Сохранять контекст', 'Save context')}
													</strong>
													<small>
														{t(
															'Следующий ответ учтёт предыдущие сообщения этого чата.',
															'The next answer will use previous messages in this chat.',
														)}
													</small>
												</span>
												<input
													checked={draft.contextEnabled}
													disabled={isContextSaving}
													type='checkbox'
													onChange={(event) =>
														void handleContextChange(event.target.checked)
													}
												/>
												<i aria-hidden='true' />
											</label>
										) : isTool ? (
											<div className={styles.contextNotice}>
												<FiImage aria-hidden='true' />
												<p>
													<strong>
														{t('Отдельный анализ', 'Independent analysis')}
													</strong>
													<span>
														{t(
															'Инструмент анализирует только фото из текущего сообщения.',
															'The tool only analyzes images from the current message.',
														)}
													</span>
												</p>
											</div>
										) : null}

										{conversationError ? (
											<FieldMessage>{conversationError}</FieldMessage>
										) : null}

										{isTool ? (
											<DynamicToolFields
												fields={toolFields}
												values={draft.toolValues}
												onChange={(code, value) =>
													setDraft((current) => ({
														...current,
														toolValues: {
															...current.toolValues,
															[code]: value,
														},
													}))
												}
											/>
										) : null}

										{!isTool && capabilities?.acceptsNegativePrompt ? (
											<label className={styles.field}>
												<span>
													{t('Негативный промпт', 'Negative prompt')}{' '}
													<em>{t('необязательно', 'optional')}</em>
												</span>
												<textarea
													placeholder={t(
														'Что не должно появиться в результате',
														'What should not appear in the result',
													)}
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
												onChange={(patch) => {
													if (patch.outputCount !== undefined) {
														outputCountManuallySelected.current = true;
													}
													setDraft((current) => ({ ...current, ...patch }));
												}}
											/>
										) : null}
									</AiCard>
								</aside>
							</form>
						</ImageGalleryProvider>
					</AsyncState>
				</div>
			</div>
		</AiPage>
	);
}

function ChatTurnMessage({
	createdAt,
	inputFiles,
	modelLogoUrl,
	modelName,
	prompt,
	run: initialRun,
	initialOutputs,
	submissionState,
	submitError,
	uploadStates,
	onUpdate,
	onRetry,
	retryDisabled,
}: {
	createdAt: string;
	inputFiles: ChatMessageAttachment[];
	modelLogoUrl?: string | null;
	modelName: string;
	prompt: string;
	run: AiRunSummary | null;
	initialOutputs: AiRunOutput[];
	submissionState: ChatTurn['submissionState'];
	submitError?: string | null;
	uploadStates?: Record<string, AttachmentUploadState>;
	onUpdate: (run: AiRunSummary, outputs?: AiRunOutput[]) => void;
	onRetry: () => Promise<void>;
	retryDisabled: boolean;
}) {
	const { refresh } = useAiSession();
	const { locale, t } = useAiLocale();
	const [polledRun, setPolledRun] = useState<AiRunSummary | null>(null);
	const [resolvedOutputs, setResolvedOutputs] = useState<{
		runId: string;
		outputs: AiRunOutput[];
	} | null>(null);
	const [work, setWork] = useState<AiWorkDetail | null>(null);
	const [retryError, setRetryError] = useState<string | null>(null);
	const [isRetrying, setIsRetrying] = useState(false);
	const initialOutputsRef = useRef(initialOutputs);
	const run =
		initialRun && polledRun?.id === initialRun.id ? polledRun : initialRun;
	const runId = run?.id || null;
	const outputs =
		runId && resolvedOutputs?.runId === runId
			? mergeRunOutputs(initialOutputs, resolvedOutputs.outputs)
			: initialOutputs;
	const isFinished = run ? TERMINAL_RUN_STATUSES.has(run.status) : false;
	const isGenerating = Boolean(run && !isFinished);
	const showAssistant = Boolean(run) || submissionState === 'failed';
	const hasSuccessfulResult = Boolean(
		run && ['succeeded', 'partially_succeeded'].includes(run.status),
	);
	const hasMediaOutput = outputs.some(
		(output) => output.type === 'image' || output.type === 'video',
	);
	const messageCreatedAt = run?.createdAt || createdAt;
	const effectiveModelName = run?.modelName || modelName;
	const galleryScope = runId || createdAt;
	const chargedCredits = work?.chargedCredits ?? run?.chargedCredits;
	const hasChargedCredits =
		typeof chargedCredits === 'number' &&
		Number.isFinite(chargedCredits) &&
		chargedCredits >= 0;

	useEffect(() => {
		initialOutputsRef.current = initialOutputs;
	}, [initialOutputs]);

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
			if (document.visibilityState === 'hidden') {
				schedule(10_000);
				return;
			}
			try {
				const payload = await aiApiFetch<
					AiRunSummary | AiApiEnvelope<AiRunSummary>
				>(`/runs/${runId}`);
				if (!active) return;
				const nextRun = unwrapAiData(payload);
				setPolledRun(nextRun);
				onUpdate(nextRun);
				failures = 0;
				if (!TERMINAL_RUN_STATUSES.has(nextRun.status)) schedule(2_500);
			} catch (error) {
				if (!active) return;
				failures += 1;
				if (failures === 3) {
					console.warn('AI run background polling failed', {
						runId,
						message: getAiErrorMessage(error),
					});
				}
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
			{
				signal: controller.signal,
			},
		)
			.then(async (payload) => {
				const detail = unwrapAiData(payload);
				setPolledRun(detail);
				setResolvedOutputs((current) => ({
					runId: detail.id,
					outputs: mergeRunOutputs(
						current?.runId === detail.id
							? current.outputs
							: initialOutputsRef.current,
						detail.outputs,
					),
				}));
				onUpdate(detail, detail.outputs);
				if (detail.workId) {
					const workPayload = await aiApiFetch<
						AiWorkDetail | AiApiEnvelope<AiWorkDetail>
					>(`/works/${encodeURIComponent(detail.workId)}`, {
						signal: controller.signal,
					});
					setWork(unwrapAiData(workPayload));
				}
				await refresh();
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					console.warn('AI run result synchronization failed', {
						runId,
						message: getAiErrorMessage(error),
					});
				}
			});
		return () => controller.abort();
	}, [isFinished, onUpdate, refresh, runId]);

	const copyableResult = getCopyableResult(outputs, work);

	async function retry() {
		if (isRetrying || retryDisabled) return;
		setIsRetrying(true);
		setRetryError(null);
		try {
			await onRetry();
		} catch (error) {
			setRetryError(getAiErrorMessage(error));
		} finally {
			setIsRetrying(false);
		}
	}

	return (
		<article className={styles.turn}>
			<div className={styles.userMessage}>
				<div
					className={`${styles.userMessageContent} ${
						inputFiles.length && prompt ? styles.userMessageContentCombined : ''
					}`}
				>
					{inputFiles.length ? (
						<ChatMessageAttachments
							files={inputFiles}
							uploadStates={uploadStates}
						/>
					) : null}
					{prompt ? <CollapsibleUserPrompt prompt={prompt} /> : null}
				</div>
				<div className={styles.userMessageMeta}>
					<time dateTime={messageCreatedAt}>
						{formatMessageDate(messageCreatedAt, locale)}
					</time>
					<CopyMessageButton
						label={t('Скопировать запрос', 'Copy prompt')}
						text={prompt}
						tone='user'
					/>
				</div>
			</div>
			{showAssistant ? (
				<div className={styles.assistantRow}>
					<div className={styles.assistantIdentity}>
						<AiModelLogo
							label={effectiveModelName}
							logoUrl={modelLogoUrl}
							size='medium'
						/>
						<strong>{effectiveModelName}</strong>
					</div>
					<div
						aria-label={
							isGenerating
								? `${effectiveModelName} ${t('формирует ответ', 'is generating a response')}`
								: undefined
						}
						className={`${styles.assistantMessage} ${isGenerating ? styles.typingMessage : ''}`}
						role={isGenerating ? 'status' : undefined}
					>
						{isGenerating ? (
							<div aria-hidden='true' className={styles.typingIndicator}>
								<span />
								<span />
								<span />
							</div>
						) : null}
						{hasSuccessfulResult ? (
							<ChatOutputs
								chargedCredits={work?.chargedCredits ?? run?.chargedCredits}
								createdAt={{
									dateTime: messageCreatedAt,
									label: formatMessageDate(messageCreatedAt, locale),
								}}
								galleryScope={galleryScope}
								modelName={effectiveModelName}
								outputs={outputs}
								work={work}
							/>
						) : null}
						{submitError ? <FieldMessage>{submitError}</FieldMessage> : null}
						{run?.errorMessage ? (
							<FieldMessage>{run.errorMessage}</FieldMessage>
						) : null}
						{retryError ? <FieldMessage>{retryError}</FieldMessage> : null}
						{(isFinished || submissionState === 'failed') &&
						(!hasMediaOutput ||
							run?.status === 'failed' ||
							Boolean(copyableResult)) ? (
							<div className={styles.messageFooter}>
								{!hasMediaOutput ? (
									<time dateTime={messageCreatedAt}>
										{formatMessageDate(messageCreatedAt, locale)}
									</time>
								) : null}
								{hasChargedCredits && !hasMediaOutput ? (
									<span
										aria-label={`${t('Списано', 'Charged')} ${formatCredits(chargedCredits, locale)}`}
										className={styles.messageChargedCredits}
									>
										<FiZap aria-hidden='true' />
										{formatCredits(chargedCredits, locale)}
									</span>
								) : null}
								{run?.status === 'failed' ? (
									<button
										aria-label={
											isRetrying
												? t('Повторяем генерацию', 'Retrying generation')
												: t('Повторить генерацию', 'Retry generation')
										}
										className={styles.retryGenerationButton}
										disabled={isRetrying || retryDisabled}
										title={
											isRetrying
												? t('Повторяем генерацию', 'Retrying generation')
												: t('Повторить генерацию', 'Retry generation')
										}
										type='button'
										onClick={() => void retry()}
									>
										<FiRefreshCw
											aria-hidden='true'
											className={isRetrying ? styles.spinningIcon : undefined}
										/>
									</button>
								) : null}
								{copyableResult ? (
									<CopyMessageButton
										label={t('Скопировать результат', 'Copy result')}
										text={copyableResult}
									/>
								) : null}
							</div>
						) : null}
					</div>
				</div>
			) : null}
		</article>
	);
}

function ConversationHistoryTitle({ title }: { title: string }) {
	const viewportRef = useRef<HTMLElement>(null);
	const textRef = useRef<HTMLSpanElement>(null);
	const [marquee, setMarquee] = useState({ distance: 0, duration: 3 });

	useLayoutEffect(() => {
		const viewport = viewportRef.current;
		const text = textRef.current;
		if (!viewport || !text) return;

		const measure = () => {
			const distance = Math.max(
				0,
				Math.ceil(text.scrollWidth - viewport.clientWidth),
			);
			setMarquee((current) => {
				const duration = Math.max(3, Math.min(10, distance / 22));
				return current.distance === distance && current.duration === duration
					? current
					: { distance, duration };
			});
		};

		measure();
		if (typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(measure);
		observer.observe(viewport);
		observer.observe(text);
		return () => observer.disconnect();
	}, [title]);

	const style = {
		'--history-title-shift': `${marquee.distance}px`,
		'--history-title-duration': `${marquee.duration}s`,
	} as CSSProperties;

	return (
		<strong
			className={`${styles.historyTitle} ${
				marquee.distance > 0 ? styles.historyTitleOverflowing : ''
			}`}
			ref={viewportRef}
			style={style}
			title={marquee.distance > 0 ? title : undefined}
		>
			<span ref={textRef}>{title}</span>
		</strong>
	);
}

function CollapsibleUserPrompt({ prompt }: { prompt: string }) {
	const { t } = useAiLocale();
	const [expanded, setExpanded] = useState(false);
	const collapsible =
		prompt.length > COLLAPSIBLE_USER_MESSAGE_LENGTH ||
		prompt.split(/\r?\n/).length > COLLAPSIBLE_USER_MESSAGE_LINES;

	return (
		<div className={styles.userMessageBubble}>
			<p
				className={`${styles.userMessageText} ${
					collapsible && !expanded ? styles.userMessageTextCollapsed : ''
				}`}
			>
				{prompt}
			</p>
			{collapsible ? (
				<button
					aria-expanded={expanded}
					className={styles.userMessageToggle}
					type='button'
					onClick={() => setExpanded((current) => !current)}
				>
					{expanded
						? t('Свернуть', 'Show less')
						: t('Показать полностью', 'Show more')}
					<FiChevronDown
						aria-hidden='true'
						className={expanded ? styles.userMessageToggleExpanded : undefined}
					/>
				</button>
			) : null}
		</div>
	);
}

function CopyMessageButton({
	text,
	label,
	tone = 'assistant',
}: {
	text: string;
	label: string;
	tone?: 'user' | 'assistant';
}) {
	const { t } = useAiLocale();
	const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
	const resetTimer = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
		};
	}, []);

	async function copy() {
		try {
			await writeClipboardText(text);
			setState('copied');
		} catch {
			setState('error');
		}
		if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
		resetTimer.current = window.setTimeout(() => setState('idle'), 2_000);
	}

	const stateLabel =
		state === 'copied'
			? t('Скопировано', 'Copied')
			: state === 'error'
				? t('Не удалось', 'Failed')
				: t('Копировать', 'Copy');

	return (
		<button
			aria-label={state === 'idle' ? label : stateLabel}
			aria-live='polite'
			className={`${styles.copyButton} ${tone === 'user' ? styles.copyButtonUser : ''}`}
			title={state === 'idle' ? label : stateLabel}
			type='button'
			onClick={() => void copy()}
		>
			{state === 'copied' ? (
				<FiCheck aria-hidden='true' />
			) : (
				<FiCopy aria-hidden='true' />
			)}
		</button>
	);
}

function ChatMessageAttachments({
	files,
	uploadStates,
}: {
	files: ChatMessageAttachment[];
	uploadStates?: Record<string, AttachmentUploadState>;
}) {
	const { t } = useAiLocale();
	return (
		<ul
			aria-label={t('Прикреплённые файлы', 'Attached files')}
			className={styles.messageAttachments}
		>
			{files.map((file) => (
				<ChatMessageAttachmentItem
					file={file}
					key={file.id}
					uploadState={uploadStates?.[file.id]}
				/>
			))}
		</ul>
	);
}

function ChatMessageAttachmentItem({
	file,
	uploadState,
}: {
	file: ChatMessageAttachment;
	uploadState?: AttachmentUploadState;
}) {
	const { locale, t } = useAiLocale();
	const metadataPortrait =
		file.width && file.height ? Number(file.height) > Number(file.width) : null;
	const [measuredPortrait, setMeasuredPortrait] = useState<boolean | null>(
		null,
	);
	const isPortrait = metadataPortrait ?? measuredPortrait ?? false;
	const isImage = Boolean(
		file.mimeType?.startsWith('image/') && file.previewUrl,
	);
	const isVideo = Boolean(
		file.mimeType?.startsWith('video/') && file.previewUrl,
	);
	const isAudio = Boolean(file.mimeType?.startsWith('audio/'));

	const uploadStateClass =
		uploadState === 'uploading'
			? styles.messageAttachmentUploading
			: uploadState === 'uploaded'
				? styles.messageAttachmentUploaded
				: uploadState === 'failed'
					? styles.messageAttachmentFailed
					: '';
	const label =
		file.name ||
		(isImage
			? t('Изображение', 'Image')
			: isVideo
				? t('Видео', 'Video')
				: isAudio
					? t('Аудио', 'Audio')
					: t('Файл', 'File'));
	const details = formatAttachmentDetails(file, locale);
	const downloadHref = file.downloadUrl || file.previewUrl;
	const content = (
		<>
			{isImage ? (
				// eslint-disable-next-line @next/next/no-img-element -- signed or local private URL
				<img
					alt=''
					src={file.previewUrl || undefined}
					onLoad={(event) =>
						setMeasuredPortrait(
							event.currentTarget.naturalHeight >
								event.currentTarget.naturalWidth,
						)
					}
				/>
			) : isVideo ? (
				<span className={styles.messageAttachmentMediaIcon}>
					<FiVideo aria-hidden='true' />
				</span>
			) : isAudio ? (
				<span
					className={`${styles.messageAttachmentIcon} ${styles.messageAttachmentAudioIcon}`}
				>
					<FiMusic aria-hidden='true' />
				</span>
			) : (
				<span className={styles.messageAttachmentIcon}>
					<FiPaperclip aria-hidden='true' />
				</span>
			)}
			<span className={styles.messageAttachmentText}>
				<strong>{label}</strong>
				{details ? <small>{details}</small> : null}
			</span>
		</>
	);

	return (
		<li
			className={`${styles.messageAttachmentItem} ${isImage ? styles.messageAttachmentImage : ''} ${
				isImage && isPortrait ? styles.messageAttachmentPortrait : ''
			} ${uploadStateClass}`}
		>
			{file.assetAvailable !== false && file.previewUrl && isImage ? (
				<ImageLightbox
					alt={label}
					characteristics={details}
					downloadUrl={downloadHref}
					fileName={label}
					fullUrl={isImage ? downloadHref || file.previewUrl : file.previewUrl}
					kind='image'
					previewUrl={file.previewUrl}
					triggerClassName={styles.messageAttachmentPreview}
				>
					{content}
				</ImageLightbox>
			) : file.assetAvailable !== false && downloadHref ? (
				<a
					className={styles.messageAttachmentPreview}
					href={downloadHref}
					rel='noreferrer'
					target='_blank'
				>
					{content}
				</a>
			) : (
				<div className={styles.messageAttachmentPreview}>{content}</div>
			)}
			{uploadState ? (
				<span
					aria-label={
						uploadState === 'uploading'
							? t(`Загружается ${label}`, `Uploading ${label}`)
							: uploadState === 'uploaded'
								? t(`Загружено ${label}`, `Uploaded ${label}`)
								: t(
										`Не удалось загрузить ${label}`,
										`Failed to upload ${label}`,
									)
					}
					className={styles.messageAttachmentUploadStatus}
					role='status'
				>
					{uploadState === 'uploading' ? (
						<FiRefreshCw aria-hidden='true' />
					) : uploadState === 'uploaded' ? (
						<FiCheck aria-hidden='true' />
					) : (
						<FiX aria-hidden='true' />
					)}
				</span>
			) : null}
			{file.assetAvailable !== false &&
			downloadHref &&
			uploadState !== 'uploading' &&
			uploadState !== 'failed' ? (
				<a
					aria-label={`${t('Скачать файл', 'Download file')} ${label}`}
					className={styles.messageAttachmentDownload}
					download={label}
					href={downloadHref}
					title={t('Скачать файл', 'Download file')}
				>
					<FiDownload aria-hidden='true' />
				</a>
			) : null}
		</li>
	);
}

function getCopyableResult(
	outputs: AiRunOutput[],
	work: AiWorkDetail | null,
): string {
	const workOutputs = work?.outputs || [];
	const source: Array<AiRunOutput | AiWorkOutput> = workOutputs.length
		? workOutputs
		: outputs;
	return source
		.filter(
			(output) =>
				output.type === 'text' &&
				!output.heldForReview &&
				!output.deletedAt &&
				!('deletedByRetention' in output && output.deletedByRetention),
		)
		.map((output) => output.text?.trim() || '')
		.filter(Boolean)
		.join('\n\n');
}

function ChatOutputs({
	outputs,
	work,
	galleryScope,
	modelName,
	chargedCredits,
	createdAt,
}: {
	outputs: AiRunOutput[];
	work: AiWorkDetail | null;
	galleryScope: string;
	modelName: string;
	chargedCredits?: number | null;
	createdAt?: {
		dateTime: string;
		label: string;
	} | null;
}) {
	const workOutputs = work?.outputs || [];
	if (!outputs.length && !workOutputs.length) {
		return null;
	}
	const source: Array<AiRunOutput | AiWorkOutput> = workOutputs.length
		? workOutputs
		: outputs;
	const imageOutputs = source.filter(
		(output) => output.type === 'image' && Boolean(getOutputMediaUrl(output)),
	);
	const otherOutputs = source.filter(
		(output) => output.type !== 'image' || !getOutputMediaUrl(output),
	);

	return (
		<div className={styles.outputList}>
			{imageOutputs.length > 1 ? (
				<ChatImageCarousel
					chargedCredits={chargedCredits}
					createdAt={createdAt}
					galleryScope={galleryScope}
					items={imageOutputs.map((output, index) => {
						const media = getOutputMediaUrl(output)!;
						return {
							id: 'id' in output ? String(output.id) : String(index),
							url:
								output.outputUrl ||
								('url' in output ? output.url : null) ||
								media,
							previewUrl: output.previewUrl,
							downloadUrl: output.downloadUrl,
							copyUrl: output.copyUrl,
							width: output.width,
							height: output.height,
							aspectRatio: output.aspectRatio,
							fileName: getImageFileName(output),
						};
					})}
					modelName={modelName}
				/>
			) : imageOutputs[0] ? (
				<ChatOutput
					chargedCredits={chargedCredits}
					createdAt={createdAt}
					galleryId={`${galleryScope}:output:0`}
					modelName={modelName}
					output={imageOutputs[0]}
				/>
			) : null}
			{otherOutputs.map((output, index) => (
				<ChatOutput
					chargedCredits={chargedCredits}
					createdAt={createdAt}
					galleryId={`${galleryScope}:output:${imageOutputs.length + index}`}
					key={`${galleryScope}:output:${imageOutputs.length + index}`}
					modelName={modelName}
					output={output}
				/>
			))}
		</div>
	);
}

function ChatOutput({
	output,
	galleryId,
	modelName,
	chargedCredits,
	createdAt,
}: {
	output: AiRunOutput | AiWorkOutput;
	galleryId: string;
	modelName: string;
	chargedCredits?: number | null;
	createdAt?: {
		dateTime: string;
		label: string;
	} | null;
}) {
	const { t } = useAiLocale();
	if (output.heldForReview) {
		return (
			<FieldMessage tone='notice'>
				{t(
					'Результат ожидает проверки модерации.',
					'The result is awaiting moderation.',
				)}
			</FieldMessage>
		);
	}
	if (output.type === 'text' && output.text) {
		const citations = getOutputCitations(output.data);
		return (
			<div className={styles.textOutput}>
				<AiMarkdown>{output.text}</AiMarkdown>
				{citations.length ? (
					<div className={styles.citationList}>
						<strong>{t('Источники', 'Sources')}</strong>
						<ol>
							{citations.map((citation) => (
								<li key={citation.url}>
									<a
										href={citation.url}
										rel='noopener noreferrer'
										target='_blank'
									>
										<span>{citation.title}</span>
										<FiExternalLink aria-hidden='true' />
									</a>
								</li>
							))}
						</ol>
					</div>
				) : null}
			</div>
		);
	}
	const media = getOutputMediaUrl(output);
	if (output.type === 'image' && media) {
		const originalUrl =
			output.outputUrl || ('url' in output ? output.url : null) || media;
		return (
			<ChatImageOutput
				alt={t('Результат генерации', 'Generation result')}
				aspectRatio={output.aspectRatio}
				chargedCredits={chargedCredits}
				copyUrl={output.copyUrl}
				createdAt={createdAt}
				downloadUrl={output.downloadUrl}
				fileName={getImageFileName(output)}
				galleryId={galleryId}
				height={output.height}
				modelName={modelName}
				previewUrl={output.previewUrl}
				url={originalUrl}
				width={output.width}
			/>
		);
	}
	if (output.type === 'video' && media) {
		return (
			<ChatVideoOutput
				aspectRatio={output.aspectRatio}
				chargedCredits={chargedCredits}
				createdAt={createdAt}
				height={output.height}
				url={media}
				width={output.width}
			/>
		);
	}
	if (
		('deletedByRetention' in output && output.deletedByRetention) ||
		output.deletedAt
	) {
		return (
			<p className={styles.emptyOutput}>
				{t(
					'Файл удалён по сроку хранения.',
					'The file was deleted after its retention period.',
				)}
			</p>
		);
	}
	return (
		<p className={styles.emptyOutput}>
			{t(
				'Результат доступен на странице работы.',
				'The result is available on the work page.',
			)}
		</p>
	);
}

function ChatVideoOutput({
	aspectRatio,
	chargedCredits,
	createdAt,
	height,
	url,
	width,
}: {
	aspectRatio?: string | null;
	chargedCredits?: number | null;
	createdAt?: {
		dateTime: string;
		label: string;
	} | null;
	height?: number | null;
	url: string;
	width?: number | null;
}) {
	const { locale } = useAiLocale();
	const [measuredSize, setMeasuredSize] = useState<MediaSize | null>(null);
	const metadataSize = useMemo<MediaSize | null>(() => {
		const normalizedWidth = normalizeMediaDimension(width);
		const normalizedHeight = normalizeMediaDimension(height);
		return normalizedWidth && normalizedHeight
			? { width: normalizedWidth, height: normalizedHeight }
			: null;
	}, [height, width]);
	const characteristics = formatMediaCharacteristics(
		metadataSize || measuredSize,
		aspectRatio,
	);
	const showCredits =
		typeof chargedCredits === 'number' &&
		Number.isFinite(chargedCredits) &&
		chargedCredits >= 0;

	return (
		<figure className={styles.videoOutputRoot}>
			<video
				className={styles.videoOutput}
				controls
				muted
				playsInline
				preload='metadata'
				src={url}
				onLoadedMetadata={(event) => {
					if (metadataSize) return;
					const video = event.currentTarget;
					if (video.videoWidth > 0 && video.videoHeight > 0) {
						setMeasuredSize({
							width: video.videoWidth,
							height: video.videoHeight,
						});
					}
				}}
			/>
			{createdAt || characteristics || showCredits ? (
				<figcaption className={styles.videoOutputMeta}>
					{createdAt ? (
						<time dateTime={createdAt.dateTime}>{createdAt.label}</time>
					) : null}
					{characteristics ? <span>{characteristics}</span> : null}
					{showCredits ? (
						<span className={styles.videoCreditUsage}>
							<FiZap aria-hidden='true' />
							{formatCredits(chargedCredits, locale)}
						</span>
					) : null}
				</figcaption>
			) : null}
		</figure>
	);
}

function getOutputCitations(data: unknown): AiCitation[] {
	if (
		!data ||
		typeof data !== 'object' ||
		Array.isArray(data) ||
		!('citations' in data)
	) {
		return [];
	}
	const citations = (data as { citations?: unknown }).citations;
	if (!Array.isArray(citations)) return [];

	const normalized = new Map<string, AiCitation>();
	for (const value of citations) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
		const citation = value as { title?: unknown; url?: unknown };
		if (typeof citation.url !== 'string' || !isSafeExternalUrl(citation.url))
			continue;
		const title =
			typeof citation.title === 'string' && citation.title.trim()
				? citation.title.trim()
				: citation.url;
		normalized.set(citation.url, { title, url: citation.url });
	}
	return [...normalized.values()].slice(0, 20);
}

function isSafeExternalUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

function getOutputMediaUrl(output: AiRunOutput | AiWorkOutput): string | null {
	return (
		('outputUrl' in output ? output.outputUrl || output.previewUrl : null) ||
		('url' in output ? output.url : null) ||
		null
	);
}

type ResolvedModelPresentation = {
	family: string;
	variant: string;
	sort: number;
};

type ModelFamily = {
	key: string;
	label: string;
	firstIndex: number;
	entries: Array<{
		model: AiPublicModel;
		presentation: ResolvedModelPresentation;
		sourceIndex: number;
	}>;
};

const MODEL_FAMILY_FALLBACKS: Array<{
	family: string;
	identityPattern: RegExp;
	namePattern: RegExp;
}> = [
	{
		family: 'Nano Banana',
		identityPattern: /nano[\s_-]*banana/i,
		namePattern: /^(?:google\s+)?nano[\s_-]*banana(?:\s+image)?/i,
	},
	{
		family: 'GPT Image',
		identityPattern: /gpt[\s_-]*image/i,
		namePattern: /^(?:openai\s+)?gpt[\s_-]*image/i,
	},
	{
		family: 'ChatGPT',
		identityPattern: /(?:chat)?gpt/i,
		namePattern: /^(?:openai\s+)?(?:chat)?gpt/i,
	},
	{
		family: 'Gemini',
		identityPattern: /gemini/i,
		namePattern: /^(?:google\s+)?gemini/i,
	},
	{
		family: 'Claude',
		identityPattern: /claude/i,
		namePattern: /^(?:anthropic\s+)?claude/i,
	},
	{
		family: 'Sora',
		identityPattern: /sora/i,
		namePattern: /^(?:openai\s+)?sora/i,
	},
	{
		family: 'Veo',
		identityPattern: /\bveo[\s_-]*\d?/i,
		namePattern: /^(?:google\s+)?veo/i,
	},
	{
		family: 'Kling',
		identityPattern: /kling/i,
		namePattern: /^(?:kuaishou\s+)?kling/i,
	},
	{
		family: 'Grok',
		identityPattern: /grok/i,
		namePattern: /^(?:xai\s+)?grok/i,
	},
	{
		family: 'DeepSeek',
		identityPattern: /deep[\s_-]*seek/i,
		namePattern: /^deep[\s_-]*seek/i,
	},
];

function createModelFamilies(models: AiPublicModel[]): ModelFamily[] {
	const groups = new Map<string, ModelFamily>();

	models.forEach((model, sourceIndex) => {
		const presentation = resolveModelPresentation(model, sourceIndex);
		const groupKey = normalizeModelFamilyKey(presentation.family);
		const group = groups.get(groupKey);
		const entry = { model, presentation, sourceIndex };
		if (group) {
			group.entries.push(entry);
		} else {
			groups.set(groupKey, {
				key: groupKey,
				label: presentation.family,
				firstIndex: sourceIndex,
				entries: [entry],
			});
		}
	});

	return [...groups.values()]
		.sort((left, right) => left.firstIndex - right.firstIndex)
		.map((group) => ({
			...group,
			entries: [...group.entries].sort(
				(left, right) =>
					left.presentation.sort - right.presentation.sort ||
					left.sourceIndex - right.sourceIndex,
			),
		}));
}

function resolveRequestedModel(
	models: AiPublicModel[],
	requestedSlug: string,
	kind: GenerationChatKind,
): AiPublicModel | undefined {
	const normalizedSlug = requestedSlug.toLocaleLowerCase('en-US');
	const exactModel = models.find(
		(model) =>
			model.id === requestedSlug ||
			model.slug.toLocaleLowerCase('en-US') === normalizedSlug,
	);
	if (exactModel) return exactModel;

	const family = createModelFamilies(models).find(
		(candidate) =>
			getModelFamilyRouteSlug(candidate.label, kind) === normalizedSlug,
	);
	return (
		family?.entries.find(({ model }) => model.available)?.model ||
		family?.entries[0]?.model
	);
}

function getCreatePathKind(
	kind: GenerationChatKind,
): 'photo' | 'text' | 'video' {
	if (kind === 'image') return 'photo';
	if (kind === 'video') return 'video';
	return 'text';
}

function getModelFamilyRouteSlug(
	familyLabel: string,
	kind: GenerationChatKind,
): string {
	const normalized = familyLabel
		.trim()
		.toLocaleLowerCase('en-US')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	if (kind === 'image') {
		if (normalized === 'grok' || normalized === 'grok-imagine-image') {
			return 'grok-imagine';
		}
		if (normalized === 'wan') return 'wan-image';
	}

	if (kind === 'video') {
		if (normalized === 'grok' || normalized === 'grok-imagine') {
			return 'grok-imagine-video';
		}
		if (normalized === 'wan') return 'wan-video';
	}

	return normalized || 'model';
}

function createModelVersionOptions(
	family: ModelFamily | null,
	isEnglish: boolean,
): AiSelectOption<string>[] {
	if (!family) return [];

	return family.entries.map(({ model, presentation }) => ({
		value: model.id,
		label: presentation.variant,
		selectedLabel: presentation.variant,
		visual: <AiModelLogo label={model.name} logoUrl={model.logoUrl} />,
		...(model.freeAllowance
			? {
					badge: (
						<FreeAllowanceBadge
							isEnglish={isEnglish}
							remaining={model.freeAllowance.remaining}
							total={model.freeAllowance.total}
						/>
					),
				}
			: {}),
		...(model.available
			? {}
			: {
					description:
						model.unavailableReason?.trim() ||
						(isEnglish ? 'Temporarily unavailable' : 'Временно недоступна'),
				}),
		disabled: !model.available,
	}));
}

function summarizeFamilyFreeAllowance(family: ModelFamily): {
	remaining: number;
	total: number;
} | null {
	const allowances = family.entries.flatMap(({ model }) =>
		model.freeAllowance ? [model.freeAllowance] : [],
	);
	if (!allowances.length) return null;
	return allowances.reduce(
		(summary, allowance) => ({
			remaining: summary.remaining + allowance.remaining,
			total: summary.total + allowance.total,
		}),
		{ remaining: 0, total: 0 },
	);
}

function FreeAllowanceBadge({
	isEnglish,
	remaining,
	total,
}: {
	isEnglish: boolean;
	remaining: number;
	total: number;
}) {
	const label = isEnglish
		? `${remaining} of ${total} free generations left`
		: `Осталось бесплатно: ${remaining} из ${total}`;
	return (
		<span
			aria-label={label}
			className={styles.freeAllowanceBadge}
			title={label}
		>
			<FiGift aria-hidden='true' />
			<span>{remaining}</span>
		</span>
	);
}

function resolveModelPresentation(
	model: AiPublicModel,
	sourceIndex: number,
): ResolvedModelPresentation {
	const fallback = inferModelPresentation(model);
	const explicitSort = model.presentation?.sort;
	return {
		family: model.presentation?.family?.trim() || fallback.family,
		variant: model.presentation?.variant?.trim() || fallback.variant,
		sort:
			typeof explicitSort === 'number' && Number.isFinite(explicitSort)
				? explicitSort
				: sourceIndex,
	};
}

function inferModelPresentation(
	model: AiPublicModel,
): Pick<ResolvedModelPresentation, 'family' | 'variant'> {
	const name = model.name.trim() || model.slug.trim() || 'Модель';
	const identity = `${name} ${model.slug}`;
	const knownFamily = MODEL_FAMILY_FALLBACKS.find(({ identityPattern }) =>
		identityPattern.test(identity),
	);

	if (knownFamily) {
		const nameVariant = cleanModelVariant(
			name.replace(knownFamily.namePattern, ''),
		);
		const slugLeaf = model.slug.split('/').pop() || model.slug;
		const slugVariant = cleanModelVariant(
			slugLeaf.replace(knownFamily.identityPattern, ''),
		);
		return {
			family: knownFamily.family,
			variant: nameVariant || slugVariant || 'Основная версия',
		};
	}

	const versionMatch = name.match(
		/\b(?:v(?:er(?:sion)?)?[\s._-]*)?\d+(?:[._-]\d+)*(?:\s.*)?$/i,
	);
	if (versionMatch?.index && versionMatch.index > 0) {
		const family = cleanModelVariant(name.slice(0, versionMatch.index));
		const variant = cleanModelVariant(versionMatch[0]);
		if (family && variant) return { family, variant };
	}

	const slugLeaf = cleanModelVariant(model.slug.split('/').pop() || '');
	return {
		family: name,
		variant:
			slugLeaf &&
			normalizeModelFamilyKey(slugLeaf) !== normalizeModelFamilyKey(name)
				? slugLeaf
				: 'Основная версия',
	};
}

function cleanModelVariant(value: string): string {
	return value
		.replace(/^[\s\-—–:·/()]+/, '')
		.replace(/[\s\-—–:·/()]+$/, '')
		.replace(/[_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function normalizeModelFamilyKey(value: string): string {
	return (
		value
			.toLocaleLowerCase('ru-RU')
			.replace(/[^\p{L}\p{N}]+/gu, '-')
			.replace(/^-+|-+$/g, '') || 'model'
	);
}

function getAutomaticVideoModes(
	modes: readonly VideoModeCapability[] | undefined,
): {
	text: VideoModeCapability;
	frame: VideoModeCapability;
} | null {
	if (modes?.length !== 2) return null;

	const text = modes.find(
		(mode) =>
			mode.operation === 'text_to_video' &&
			mode.minReferenceFiles === 0 &&
			mode.maxReferenceFiles === 0,
	);
	const frame = modes.find(
		(mode) =>
			mode.operation === 'image_to_video' &&
			mode.imageInput === 'frame_images' &&
			mode.minReferenceFiles > 0 &&
			mode.maxReferenceFiles > 0,
	);

	return text && frame ? { text, frame } : null;
}

function shouldShowVideoModeSelector(
	modes: readonly VideoModeCapability[] | undefined,
): boolean {
	return Boolean(modes && modes.length > 1 && !getAutomaticVideoModes(modes));
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
	const { t } = useAiLocale();
	if (!model) return null;
	const { capabilities } = model;
	const fields: React.ReactNode[] = [];
	const videoModes = capabilities.videoModes;
	if (videoModes && shouldShowVideoModeSelector(videoModes)) {
		const selectedVideoMode =
			videoModes.find((mode) => mode.code === draft.videoMode) || videoModes[0];
		const modeUsesFiles =
			selectedVideoMode?.imageInput === 'input_references' &&
			capabilities.acceptedMimeTypes?.some(
				(mimeType) => !mimeType.startsWith('image/'),
			);
		const referenceHint =
			selectedVideoMode && selectedVideoMode.minReferenceFiles > 0
				? t(
						`Прикрепите минимум ${modeUsesFiles ? formatFileCount(selectedVideoMode.minReferenceFiles) : formatImageCount(selectedVideoMode.minReferenceFiles)}, максимум ${modeUsesFiles ? formatFileCount(selectedVideoMode.maxReferenceFiles) : formatImageCount(selectedVideoMode.maxReferenceFiles)}`,
						`Attach at least ${selectedVideoMode.minReferenceFiles} ${modeUsesFiles ? (selectedVideoMode.minReferenceFiles === 1 ? 'file' : 'files') : selectedVideoMode.minReferenceFiles === 1 ? 'image' : 'images'} and up to ${selectedVideoMode.maxReferenceFiles}`,
					)
				: null;

		fields.push(
			<div className={styles.capabilityFieldGroup} key='video-mode'>
				<OptionField
					id='video-mode'
					label={t('Режим', 'Mode')}
					optionLabel={(value) => getVideoModeLabel(String(value), t)}
					value={draft.videoMode}
					values={videoModes.map((mode) => mode.code)}
					onChange={(videoMode) => onChange({ videoMode })}
				/>
				{referenceHint ? (
					<p className={styles.videoReferenceHint}>{referenceHint}</p>
				) : null}
			</div>,
		);
	}
	const reasoning = capabilities.reasoning;
	if (reasoning && reasoning.modes.length > 1) {
		fields.push(
			<OptionField
				id='reasoning-mode'
				key='reasoning-mode'
				label={t('Размышление', 'Reasoning')}
				optionLabel={(value) => getReasoningModeLabel(String(value), t)}
				value={draft.reasoningMode}
				values={reasoning.modes}
				onChange={(reasoningMode) => onChange({ reasoningMode })}
			/>,
		);
	}
	if (capabilities.aspectRatios?.length) {
		fields.push(
			<OptionField
				id='aspect-ratio'
				key='aspect'
				label={t('Формат кадра', 'Aspect ratio')}
				optionLabel={(value) => getAspectRatioLabel(value, t)}
				optionDescription={(value) => getAspectRatioDescription(value, t)}
				optionVisual={(value) => <AspectRatioVisual ratio={String(value)} />}
				value={draft.aspectRatio}
				values={capabilities.aspectRatios}
				onChange={(aspectRatio) => onChange({ aspectRatio })}
			/>,
		);
	}

	if (capabilities.durations?.length) {
		fields.push(
			model.modality === 'video' ? (
				<DurationField
					key='duration'
					value={draft.duration}
					values={capabilities.durations}
					onChange={(duration) => onChange({ duration })}
				/>
			) : (
				<OptionField
					id='duration'
					key='duration'
					label={t('Длительность, сек.', 'Duration, sec.')}
					value={draft.duration}
					values={capabilities.durations}
					onChange={(duration) => onChange({ duration })}
				/>
			),
		);
	}
	if (capabilities.resolutions?.length) {
		fields.push(
			<OptionField
				disabled={
					model.modality === 'image' &&
					new Set(capabilities.resolutions).size === 1
				}
				id='resolution'
				key='resolution'
				label={t('Разрешение', 'Resolution')}
				value={draft.resolution}
				values={capabilities.resolutions}
				onChange={(resolution) => onChange({ resolution })}
			/>,
		);
	}
	if (capabilities.qualities?.length) {
		fields.push(
			<OptionField
				disabled={
					model.modality === 'image' &&
					new Set(capabilities.qualities).size === 1
				}
				id='quality'
				key='quality'
				label={t('Детализация', 'Detail')}
				optionLabel={(value) => getDetailLabel(value, t)}
				value={draft.quality}
				values={capabilities.qualities}
				onChange={(quality) => onChange({ quality })}
			/>,
		);
	}
	if (capabilities.backgrounds?.length) {
		fields.push(
			<OptionField
				id='background'
				key='background'
				label={t('Фон', 'Background')}
				optionLabel={(value) => getBackgroundLabel(value, t)}
				value={draft.background}
				values={capabilities.backgrounds}
				onChange={(background) => onChange({ background })}
			/>,
		);
	}
	if (capabilities.acceptsSound) {
		fields.push(
			<label className={styles.contextToggle} key='sound'>
				<span>
					<strong>{t('Аудио', 'Audio')}</strong>
				</span>
				<input
					checked={draft.sound}
					type='checkbox'
					onChange={(event) => onChange({ sound: event.target.checked })}
				/>
				<i aria-hidden='true' />
			</label>,
		);
	}
	const outputCounts = capabilities.outputCounts ?? [];
	const supportsMultipleOutputs = outputCounts.some((count) => count > 1);
	const countField = supportsMultipleOutputs ? (
		<CountStepper
			value={draft.outputCount}
			values={outputCounts}
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

function getVideoModeLabel(
	value: string,
	t: (russian: string, english: string) => string,
): string {
	const labels: Record<string, [string, string]> = {
		text_to_video: ['Текст → видео', 'Text → video'],
		image_to_video: ['Кадр → видео', 'Image → video'],
		reference_to_video: ['Референсы → видео', 'References → video'],
	};
	const label = labels[value];
	return label ? t(label[0], label[1]) : value;
}

function getReasoningModeLabel(
	value: string,
	t: (russian: string, english: string) => string,
): string {
	const labels: Record<string, [string, string]> = {
		none: ['Без размышления', 'No reasoning'],
		auto: ['Автоматически', 'Automatic'],
		minimal: ['Минимальное', 'Minimal'],
		low: ['Низкое', 'Low'],
		medium: ['Среднее', 'Medium'],
		high: ['Высокое', 'High'],
		xhigh: ['Очень высокое', 'Very high'],
		max: ['Максимальное', 'Maximum'],
	};
	const label = labels[value];
	return label ? t(label[0], label[1]) : value;
}

function DurationField({
	value,
	values,
	onChange,
}: {
	value: string;
	values: number[];
	onChange: (value: string) => void;
}) {
	const { isEnglish, t } = useAiLocale();
	const allowedValues = [...new Set(values)]
		.filter((item) => Number.isFinite(item) && item > 0)
		.sort((left, right) => left - right);
	if (!allowedValues.length) return null;

	const requestedValue = Number(value);
	const requestedIndex = allowedValues.indexOf(requestedValue);
	const currentIndex = requestedIndex >= 0 ? requestedIndex : 0;
	const currentValue = allowedValues[currentIndex];
	const labelId = 'generation-duration-label';
	const durationTicks = getDurationTicks(allowedValues);

	return (
		<div className={styles.durationField}>
			<div className={styles.durationHeader}>
				<span id={labelId}>{t('Длительность', 'Duration')}</span>
				<output htmlFor='generation-duration'>
					{formatDuration(currentValue, isEnglish)}
				</output>
			</div>
			<input
				aria-labelledby={labelId}
				aria-valuetext={formatDuration(currentValue, isEnglish)}
				id='generation-duration'
				max={Math.max(allowedValues.length - 1, 0)}
				min={0}
				step={1}
				type='range'
				value={currentIndex}
				onChange={(event) => {
					const nextValue = allowedValues[Number(event.target.value)];
					if (nextValue !== undefined) onChange(String(nextValue));
				}}
			/>
			<div aria-hidden='true' className={styles.durationTicks}>
				{durationTicks.map((tick) => (
					<span
						data-edge={
							tick.index === 0
								? 'start'
								: tick.index === allowedValues.length - 1
									? 'end'
									: undefined
						}
						key={tick.value}
						style={{ left: `${tick.position}%` }}
					>
						{tick.value}
					</span>
				))}
			</div>
		</div>
	);
}

function getDurationTicks(values: number[]): Array<{
	index: number;
	position: number;
	value: number;
}> {
	const allTicks = values.map((value, index) => ({
		index,
		position: values.length > 1 ? (index / (values.length - 1)) * 100 : 0,
		value,
	}));
	if (allTicks.length <= 7) return allTicks;

	const fiveSecondTicks = allTicks.filter((tick) => tick.value % 5 === 0);
	if (fiveSecondTicks.length >= 2) return fiveSecondTicks;

	const lastIndex = allTicks.length - 1;
	const sampleCount = Math.min(6, allTicks.length);
	const sampleIndexes = new Set(
		Array.from({ length: sampleCount }, (_, index) =>
			Math.round((index * lastIndex) / Math.max(sampleCount - 1, 1)),
		),
	);
	return allTicks.filter((tick) => sampleIndexes.has(tick.index));
}

function formatDuration(value: number, isEnglish = false): string {
	return `${value} ${isEnglish ? 'sec.' : 'сек.'}`;
}

function OptionField({
	disabled = false,
	id,
	label,
	value,
	values,
	optionLabel = String,
	optionDescription,
	optionVisual,
	onChange,
}: {
	disabled?: boolean;
	id: string;
	label: string;
	value: string;
	values: Array<string | number>;
	optionLabel?: (value: string | number) => string;
	optionDescription?: (value: string | number) => string | undefined;
	optionVisual?: (value: string | number) => React.ReactNode;
	onChange: (value: string) => void;
}) {
	return (
		<AiSelect
			disabled={disabled}
			id={`generation-${id}`}
			label={label}
			options={values.map((option) => ({
				value: String(option),
				label: optionLabel(option),
				description: optionDescription?.(option),
				visual: optionVisual?.(option),
			}))}
			value={value}
			onChange={onChange}
		/>
	);
}

function AspectRatioVisual({ ratio }: { ratio: string }) {
	const [widthValue, heightValue] = ratio.split(':').map(Number);
	const safeWidth =
		Number.isFinite(widthValue) && widthValue > 0 ? widthValue : 1;
	const safeHeight =
		Number.isFinite(heightValue) && heightValue > 0 ? heightValue : 1;
	const scale = Math.min(26 / safeWidth, 20 / safeHeight);
	const style = {
		width: `${Math.max(6, safeWidth * scale)}px`,
		height: `${Math.max(6, safeHeight * scale)}px`,
	} satisfies CSSProperties;

	return <span className={styles.aspectRatioVisual} style={style} />;
}

function getAspectRatioDescription(
	value: string | number,
	t: (russian: string, english: string) => string,
): string {
	const descriptions: Record<string, [string, string]> = {
		auto: ['Определится автоматически', 'Selected automatically'],
		'1:1': ['Квадрат', 'Square'],
		'16:9': ['Широкий экран', 'Widescreen'],
		'9:16': ['Истории и короткие видео', 'Stories and short video'],
		'4:3': ['Классический', 'Classic'],
		'3:4': ['Портретный классический', 'Classic portrait'],
		'5:4': ['Альбомная лента', 'Landscape feed'],
		'4:5': ['Портретная лента', 'Portrait feed'],
		'3:2': ['Альбомное фото', 'Landscape photo'],
		'2:3': ['Портретное фото', 'Portrait photo'],
		'21:9': ['Киноформат', 'Cinematic'],
		'9:21': ['Высокий киноформат', 'Tall cinematic'],
	};
	const copy = descriptions[String(value)];
	return copy
		? t(copy[0], copy[1])
		: t('Пользовательский формат', 'Custom format');
}

function getAspectRatioLabel(
	value: string | number,
	t: (russian: string, english: string) => string,
): string {
	return String(value).toLowerCase() === 'auto'
		? t('Автоматически', 'Automatic')
		: String(value);
}

function getDetailLabel(
	value: string | number,
	t: (russian: string, english: string) => string,
): string {
	const normalized = String(value);
	const labels: Record<string, [string, string]> = {
		auto: ['Автоматическая', 'Automatic'],
		basic: ['Базовая', 'Basic'],
		draft: ['Черновая', 'Draft'],
		low: ['Низкая', 'Low'],
		medium: ['Средняя', 'Medium'],
		standard: ['Стандартная', 'Standard'],
		high: ['Высокая', 'High'],
		hd: ['HD', 'HD'],
		ultra: ['Максимальная', 'Ultra'],
	};
	const label = labels[normalized.toLowerCase()];
	return label ? t(label[0], label[1]) : normalized;
}

function getBackgroundLabel(
	value: string | number,
	t: (russian: string, english: string) => string,
): string {
	const labels: Record<string, [string, string]> = {
		auto: ['Автоматически', 'Automatic'],
		opaque: ['Непрозрачный', 'Opaque'],
		transparent: ['Прозрачный', 'Transparent'],
	};
	const label = labels[String(value).toLowerCase()];
	return label ? t(label[0], label[1]) : String(value);
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
	const { t } = useAiLocale();
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
			<span id='generation-output-count-label'>
				{t('Количество', 'Quantity')}
			</span>
			<div
				aria-labelledby='generation-output-count-label'
				className={styles.countStepper}
				role='group'
			>
				<button
					aria-label={t(
						'Уменьшить количество результатов',
						'Decrease result count',
					)}
					disabled={!canDecrease}
					type='button'
					onClick={() => onChange(String(allowedValues[currentIndex - 1]))}
				>
					<FiMinus aria-hidden='true' />
				</button>
				<output aria-live='polite'>{resolvedValue}</output>
				<button
					aria-label={t(
						'Увеличить количество результатов',
						'Increase result count',
					)}
					disabled={!canIncrease}
					type='button'
					onClick={() => onChange(String(allowedValues[currentIndex + 1]))}
				>
					<FiPlus aria-hidden='true' />
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
			{fields
				.filter((field) => field.type !== 'file')
				.map((field) => {
					const storedValue = values[field.code];
					const storedSelectValueSupported =
						field.type !== 'select' ||
						storedValue === undefined ||
						(field.options || []).some(
							(option) => String(option.value) === String(storedValue),
						);
					const current =
						(storedSelectValueSupported ? storedValue : undefined) ??
						field.defaultValue ??
						(field.type === 'select' ? field.options?.[0]?.value : '') ??
						'';
					if (field.type === 'boolean') {
						return (
							<label className={styles.contextToggle} key={field.code}>
								<span>
									<strong>{field.label}</strong>
									{field.description ? (
										<small>{field.description}</small>
									) : null}
								</span>
								<input
									checked={Boolean(current)}
									type='checkbox'
									onChange={(event) =>
										onChange(field.code, event.target.checked)
									}
								/>
								<i aria-hidden='true' />
							</label>
						);
					}
					if (field.type === 'select') {
						return (
							<AiSelect
								id={`tool-${field.code}`}
								key={field.code}
								label={field.label}
								description={field.description || undefined}
								required={field.required}
								options={(field.options || []).map((option) => ({
									value: String(option.value),
									label: option.label,
								}))}
								value={String(current)}
								onChange={(value) => onChange(field.code, value)}
							/>
						);
					}
					return (
						<label className={styles.field} key={field.code}>
							<span>{field.label}</span>
							{field.type === 'textarea' ? (
								<textarea
									placeholder={field.placeholder || ''}
									required={field.required}
									rows={3}
									value={String(current)}
									onChange={(event) => onChange(field.code, event.target.value)}
								/>
							) : (
								<input
									max={field.maximum ?? undefined}
									min={field.minimum ?? undefined}
									placeholder={field.placeholder || ''}
									required={field.required}
									type={field.type === 'number' ? 'number' : 'text'}
									value={String(current)}
									onChange={(event) =>
										onChange(
											field.code,
											field.type === 'number'
												? Number(event.target.value)
												: event.target.value,
										)
									}
								/>
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
	assumedReferenceCount = 0,
}: {
	operation: string;
	draft: Draft;
	model: AiPublicModel;
	tool: AiPublicTool | null;
	references: readonly File[];
	supportsContext: boolean;
	useConversationReference: boolean;
	assumedReferenceCount?: number;
}): QuotePayload {
	const requestDraft = tool
		? {
				...draft,
				toolValues: filterToolValues(draft.toolValues, visibleToolFields(tool)),
			}
		: draft;
	return {
		operation,
		modelId: model.id,
		...(draft.promptId ? { promptId: draft.promptId } : {}),
		...(tool ? { toolId: tool.id } : {}),
		...(draft.conversationId ? { conversationId: draft.conversationId } : {}),
		...(supportsContext && draft.conversationId
			? { contextEnabled: draft.contextEnabled }
			: {}),
		...(useConversationReference ? { useConversationReference: true } : {}),
		parameters: buildParameters(
			requestDraft,
			operation,
			references,
			useConversationReference,
			model.capabilities,
			assumedReferenceCount,
		),
	};
}

function filterToolValues(
	values: Readonly<Record<string, string | number | boolean>>,
	fields: readonly AiPublicTool['fields'][number][],
): Record<string, string | number | boolean> {
	const fieldsByCode = new Map(fields.map((field) => [field.code, field]));
	return Object.fromEntries(
		Object.entries(values).filter(([key, value]) => {
			const field = fieldsByCode.get(key);
			if (!field) return false;
			if (field.type !== 'select') return true;
			return (field.options || []).some(
				(option) => String(option.value) === String(value),
			);
		}),
	);
}

function visibleToolFields(tool: AiPublicTool | null): AiPublicTool['fields'] {
	if (!tool) return [];
	if (tool.code !== 'photo_to_prompt') return tool.fields;
	return [];
}

function buildParameters(
	draft: Draft,
	operation: string,
	references: readonly File[],
	useConversationReference: boolean,
	capabilities: AiPublicModel['capabilities'],
	assumedReferenceCount = 0,
) {
	const hasReference = Boolean(
		references.length ||
		assumedReferenceCount > 0 ||
		draft.publicShareDraftToken ||
		(draft.repeatRunId &&
			!draft.replaceReference &&
			REFERENCE_REQUIRED_OPERATIONS.has(operation)) ||
		useConversationReference,
	);
	return {
		prompt: draft.prompt,
		...(draft.promptId && draft.catalogPromptOverride
			? { promptOverride: true }
			: {}),
		...(draft.negativePrompt && capabilities.acceptsNegativePrompt
			? { negativePrompt: draft.negativePrompt }
			: {}),
		...(draft.aspectRatio &&
		capabilities.aspectRatios?.includes(draft.aspectRatio)
			? { aspectRatio: draft.aspectRatio }
			: {}),
		...(draft.outputCount &&
		capabilities.outputCounts?.includes(Number(draft.outputCount))
			? { count: Number(draft.outputCount) }
			: {}),
		...(draft.duration &&
		capabilities.durations?.includes(Number(draft.duration))
			? { duration: Number(draft.duration) }
			: {}),
		...(draft.resolution && capabilities.resolutions?.includes(draft.resolution)
			? { resolution: draft.resolution }
			: {}),
		...(draft.quality && capabilities.qualities?.includes(draft.quality)
			? { quality: draft.quality }
			: {}),
		...(draft.background && capabilities.backgrounds?.includes(draft.background)
			? { background: draft.background }
			: {}),
		...(draft.sound && capabilities.acceptsSound ? { sound: true } : {}),
		...(draft.reasoningMode &&
		capabilities.reasoning?.modes.includes(draft.reasoningMode)
			? { reasoningMode: draft.reasoningMode }
			: {}),
		...(draft.videoMode &&
		capabilities.videoModes?.some((mode) => mode.code === draft.videoMode)
			? { videoMode: draft.videoMode }
			: {}),
		...(hasReference
			? {
					hasReference: true,
					referenceCount: Math.max(1, references.length, assumedReferenceCount),
				}
			: {}),
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

function normalizePresetReferenceLimit(value: unknown): number {
	return typeof value === 'number' && Number.isInteger(value)
		? Math.min(PLATFORM_REFERENCE_FILE_LIMIT, Math.max(0, value))
		: 0;
}

function normalizePresetModelIds(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return [
		...new Set(
			value.filter(
				(modelId): modelId is string =>
					typeof modelId === 'string' && modelId.trim().length > 0,
			),
		),
	];
}

function selectDraftModel(draft: Draft, modelId: string): Draft {
	if (draft.promptId && draft.promptCompatibleModelIds.includes(modelId)) {
		return { ...draft, modelId };
	}
	return {
		...draft,
		modelId,
		catalogPromptOverride: false,
		promptId: null,
		promptCompatibleModelIds: [],
		promptMinimumReferenceFiles: 0,
		promptMaximumReferenceFiles: 0,
		promptTitle: '',
	};
}

function extractPromptVariables(value: string): string[] {
	return [
		...new Set(
			[...value.matchAll(/\[([^\]\n]{1,100})\]/gu)]
				.map((match) => match[1]?.trim())
				.filter((variable): variable is string => Boolean(variable)),
		),
	];
}

export function inferCarouselOutputCount(
	prompt: string,
	supportedCounts: readonly number[],
): number | null {
	const allowed = [...new Set(supportedCounts)]
		.filter((value) => Number.isInteger(value) && value > 1)
		.sort((left, right) => left - right);
	if (!allowed.length) return null;

	const requestedCounts: number[] = [];
	for (const match of prompt.matchAll(
		/(?:созда(?:й|ть)|сгенериру(?:й|йте|овать)|подготов(?:ь|ить)|generate|create|make)\s+(?:именно\s+|ровно\s+)?(\d{1,2})\s+(?:отдельн(?:ых|ые)\s+)?(?:кадр(?:а|ов)?|изображени(?:я|й)?|фото(?:графи(?:и|й))?|images?|photos?|frames?)/giu,
	)) {
		requestedCounts.push(Number(match[1]));
	}

	const frameNumbers = [
		...prompt.matchAll(/(?:^|\n)\s*(?:кадр|frame)\s*(\d{1,2})\b/giu),
	]
		.map((match) => Number(match[1]))
		.filter(Number.isFinite);
	if (frameNumbers.length > 1) requestedCounts.push(Math.max(...frameNumbers));
	if (
		!requestedCounts.length &&
		/\b(?:карусел(?:ь|и|ью)|carousel)\b/iu.test(prompt)
	) {
		requestedCounts.push(3);
	}

	const requested = requestedCounts.find((value) => value > 1 && value <= 10);
	if (!requested) return null;
	if (allowed.includes(requested)) return requested;
	return (
		[...allowed].reverse().find((value) => value <= requested) ||
		allowed[0] ||
		null
	);
}

function retryParametersToDraft(
	parameters: Record<string, unknown>,
): Partial<Draft> {
	const standardKeys = new Set([
		'prompt',
		'negativePrompt',
		'aspectRatio',
		'count',
		'duration',
		'resolution',
		'quality',
		'background',
		'sound',
		'reasoningMode',
		'videoMode',
		'promptOverride',
		'hasReference',
		'referenceCount',
		'estimatedInputTokens',
	]);
	const toolValues = Object.fromEntries(
		Object.entries(parameters).filter(
			(entry): entry is [string, string | number | boolean] =>
				!standardKeys.has(entry[0]) &&
				['string', 'number', 'boolean'].includes(typeof entry[1]),
		),
	);
	return {
		catalogPromptOverride: parameters.promptOverride === true,
		prompt: typeof parameters.prompt === 'string' ? parameters.prompt : '',
		negativePrompt:
			typeof parameters.negativePrompt === 'string'
				? parameters.negativePrompt
				: '',
		aspectRatio:
			typeof parameters.aspectRatio === 'string' ? parameters.aspectRatio : '',
		outputCount:
			typeof parameters.count === 'number' ||
			typeof parameters.count === 'string'
				? String(parameters.count)
				: '',
		duration:
			typeof parameters.duration === 'number' ||
			typeof parameters.duration === 'string'
				? String(parameters.duration)
				: '',
		resolution:
			typeof parameters.resolution === 'string' ? parameters.resolution : '',
		quality: typeof parameters.quality === 'string' ? parameters.quality : '',
		background:
			typeof parameters.background === 'string' ? parameters.background : '',
		sound: parameters.sound === true,
		reasoningMode:
			typeof parameters.reasoningMode === 'string'
				? parameters.reasoningMode
				: '',
		videoMode:
			typeof parameters.videoMode === 'string' ? parameters.videoMode : '',
		toolValues,
	};
}

function getModality(kind: GenerationChatKind): AiModelModality {
	if (kind === 'photo-to-prompt') return 'vision';
	return kind;
}

function getConversationKind(kind: GenerationChatKind): AiConversationKind {
	if (kind === 'photo-to-prompt') return 'text';
	return kind;
}

function getGenerationPath(
	kind: GenerationChatKind,
	initialModelSlug?: string,
): string {
	const pathname =
		kind === 'image'
			? '/ai/create/photo'
			: kind === 'photo-to-prompt'
				? '/ai/tools/photo-to-prompt'
				: `/ai/create/${kind}`;

	if (!initialModelSlug) return pathname;
	return kind === 'photo-to-prompt'
		? `${pathname}?model=${encodeURIComponent(initialModelSlug)}`
		: `${pathname}/${encodeURIComponent(initialModelSlug)}`;
}

function getModelSlugFromGenerationPath(
	pathname: string,
	kind: GenerationChatKind,
): string | undefined {
	if (kind === 'photo-to-prompt') return undefined;
	const prefix = `/ai/create/${getCreatePathKind(kind)}/`;
	if (!pathname.startsWith(prefix)) return undefined;
	const slug = pathname.slice(prefix.length);
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : undefined;
}

function getCreateTitle(kind: GenerationChatKind, isEnglish = false): string {
	const titles: Record<GenerationChatKind, [string, string]> = {
		image: ['Генерация изображений', 'Image generation'],
		video: ['Генерация видео', 'Video generation'],
		text: ['Генерация текста', 'Text generation'],
		'photo-to-prompt': ['Промпт из фотографии', 'Prompt from photo'],
	};
	return titles[kind][isEnglish ? 1 : 0];
}

function getComposerPlaceholder(
	kind: GenerationChatKind,
	isEnglish = false,
): string {
	const placeholders: Record<GenerationChatKind, [string, string]> = {
		image: [
			'Опишите изображение, стиль, свет и важные детали…',
			'Describe the image, style, light and key details…',
		],
		video: [
			'Опишите сцену, движение камеры и атмосферу…',
			'Describe the scene, camera movement and atmosphere…',
		],
		text: ['Напишите сообщение…', 'Write a message…'],
		'photo-to-prompt': [
			'Например: измени одежду на классическую',
			'For example: change the outfit to a classic style',
		],
	};
	return placeholders[kind][isEnglish ? 1 : 0];
}

function getToolMessage(
	values: Record<string, string | number | boolean>,
	isEnglish = false,
): string {
	const valuesText = Object.values(values)
		.filter((value) => value !== '')
		.join(' · ');
	const title = isEnglish ? 'Prompt from photo' : 'Промпт из фотографии';
	return valuesText
		? `${title} · ${valuesText}`
		: isEnglish
			? 'Create prompt from photo'
			: 'Получить промпт из фотографии';
}

function toChatTurn(
	turn: NonNullable<AiConversation['turns']>[number],
): ChatTurn {
	return {
		id: turn.run.id,
		sequence: turn.sequence ?? turn.run.sequence,
		run: turn.run,
		prompt: turn.userText,
		outputs: turn.outputs,
		inputFiles: turn.inputFiles || [],
		createdAt: turn.run.createdAt,
		modelId: turn.run.modelId || '',
		modelName: turn.run.modelName,
		submissionState: 'active',
	};
}

function mergeConversationTurns(
	current: ChatTurn[],
	synchronized: ChatTurn[],
): ChatTurn[] {
	const currentByRunId = new Map(
		current
			.filter((turn): turn is ChatTurn & { run: AiRunSummary } =>
				Boolean(turn.run),
			)
			.map((turn) => [turn.run.id, turn]),
	);
	const synchronizedRunIds = new Set(
		synchronized.flatMap((turn) => (turn.run ? [turn.run.id] : [])),
	);
	const merged = synchronized.map((turn) => {
		if (!turn.run) return turn;
		const existing = currentByRunId.get(turn.run.id);
		if (!existing?.run) return turn;

		const keepExistingTerminalRun =
			TERMINAL_RUN_STATUSES.has(existing.run.status) &&
			!TERMINAL_RUN_STATUSES.has(turn.run.status);
		return {
			...existing,
			...turn,
			run: keepExistingTerminalRun ? existing.run : turn.run,
			prompt: turn.prompt.trim() ? turn.prompt : existing.prompt,
			outputs: mergeRunOutputs(existing.outputs, turn.outputs),
			inputFiles: mergeMessageAttachments(existing.inputFiles, turn.inputFiles),
			sequence: turn.sequence ?? turn.run.sequence ?? existing.sequence,
			modelId: turn.modelId || existing.modelId,
			modelName: turn.modelName || existing.modelName,
			submitError: turn.submitError ?? existing.submitError,
		};
	});
	const localOnlyTurns = current.filter(
		(turn) => !turn.run || !synchronizedRunIds.has(turn.run.id),
	);

	return [...merged, ...localOnlyTurns].sort(compareChatTurns);
}

function compareChatTurns(left: ChatTurn, right: ChatTurn): number {
	const leftSequence = left.sequence ?? left.run?.sequence ?? null;
	const rightSequence = right.sequence ?? right.run?.sequence ?? null;
	if (
		leftSequence !== null &&
		rightSequence !== null &&
		leftSequence !== rightSequence
	) {
		return leftSequence - rightSequence;
	}

	const leftTime = Date.parse(left.createdAt);
	const rightTime = Date.parse(right.createdAt);
	if (
		Number.isFinite(leftTime) &&
		Number.isFinite(rightTime) &&
		leftTime !== rightTime
	) {
		return leftTime - rightTime;
	}
	if (leftSequence !== null && rightSequence === null) return -1;
	if (leftSequence === null && rightSequence !== null) return 1;
	return left.id.localeCompare(right.id);
}

function mergeRunOutputs(
	current: readonly AiRunOutput[],
	incoming: readonly AiRunOutput[],
): AiRunOutput[] {
	if (!incoming.length) return [...current];
	const currentById = new Map(current.map((output) => [output.id, output]));
	const incomingIds = new Set(incoming.map((output) => output.id));
	const merged = incoming.map((output) => {
		const existing = currentById.get(output.id);
		if (!existing) return output;
		return {
			...existing,
			...output,
			text: output.text ?? existing.text,
			data: output.data ?? existing.data,
			mimeType: output.mimeType ?? existing.mimeType,
			sizeBytes: output.sizeBytes ?? existing.sizeBytes,
			width: output.width ?? existing.width,
			height: output.height ?? existing.height,
			aspectRatio: output.aspectRatio ?? existing.aspectRatio,
			// Signed media URLs can be regenerated on every polling response. Keeping
			// the already rendered URL prevents the browser from reloading the same
			// image or video on every background synchronization.
			outputUrl: existing.outputUrl ?? output.outputUrl,
			previewUrl: existing.previewUrl ?? output.previewUrl,
			downloadUrl: existing.downloadUrl ?? output.downloadUrl,
			copyUrl: existing.copyUrl ?? output.copyUrl,
			url: existing.url ?? output.url,
		};
	});
	const missingCurrent = current.filter(
		(output) => !incomingIds.has(output.id),
	);
	return [...merged, ...missingCurrent].sort(
		(left, right) => left.index - right.index,
	);
}

function mergeMessageAttachments(
	current: readonly ChatMessageAttachment[],
	incoming: readonly ChatMessageAttachment[],
): ChatMessageAttachment[] {
	if (!incoming.length) return [...current];
	const currentById = new Map(current.map((file) => [file.id, file]));
	const consumedCurrentIds = new Set<string>();
	const merged = incoming.map((file, index) => {
		const existing = currentById.get(file.id) ?? current[index];
		if (!existing) return file;
		consumedCurrentIds.add(existing.id);
		return {
			...existing,
			...file,
			name: file.name || existing.name,
			mimeType: file.mimeType || existing.mimeType,
			sizeBytes: file.sizeBytes ?? existing.sizeBytes,
			width: file.width ?? existing.width,
			height: file.height ?? existing.height,
			durationMs: file.durationMs ?? existing.durationMs,
			previewUrl: existing.previewUrl ?? file.previewUrl,
			downloadUrl: existing.downloadUrl ?? file.downloadUrl,
		};
	});
	return [
		...merged,
		...current.filter((file) => !consumedCurrentIds.has(file.id)),
	];
}

function conversationVersion(conversation: AiConversation): string {
	return `${conversation.id}:${conversation.updatedAt}`;
}

function getConversationTitle(message: string, fallback: string): string {
	const normalized = message.replace(/\s+/g, ' ').trim();
	if (!normalized) return fallback;
	if (normalized.length <= 72) return normalized;
	return `${normalized.slice(0, 69).trimEnd()}…`;
}

function formatConversationDate(value: string, locale = 'ru-RU'): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime()))
		return locale === 'en-US' ? 'Recently' : 'Недавно';
	const now = new Date();
	const isToday =
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate();
	if (isToday) {
		return `${locale === 'en-US' ? 'Today' : 'Сегодня'}, ${date.toLocaleTimeString(
			locale,
			{
				hour: '2-digit',
				minute: '2-digit',
			},
		)}`;
	}
	return date.toLocaleDateString(locale, {
		day: 'numeric',
		month: 'short',
		...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
	});
}

function formatMessageDate(value: string, locale = 'ru-RU'): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime()))
		return locale === 'en-US' ? 'Unknown date' : 'Дата неизвестна';
	return date.toLocaleString(locale, {
		day: '2-digit',
		month: '2-digit',
		year: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function getQuoteAriaLabel(
	quote: AiQuote | null,
	state: 'idle' | 'debouncing' | 'loading' | 'success' | 'error',
	locale = 'ru-RU',
	isEnglish = false,
): string {
	if (quote) {
		const label =
			quote.pricing.calculation === 'metered_request'
				? isEnglish
					? 'Estimated price'
					: 'Примерная цена'
				: isEnglish
					? 'Price'
					: 'Цена';
		return `${label}: ${formatCredits(getDisplayedQuoteCredits(quote), locale)}`;
	}
	if (state === 'debouncing' || state === 'loading')
		return isEnglish ? 'Calculating price' : 'Цена рассчитывается';
	if (state === 'error')
		return isEnglish
			? 'Unable to calculate price'
			: 'Не удалось рассчитать цену';
	return isEnglish ? 'Price is not available yet' : 'Цена пока недоступна';
}

function getDisplayedQuoteCredits(quote: AiQuote): number {
	return quote.pricing.calculation === 'metered_request'
		? quote.estimatedCredits
		: quote.reserveCredits;
}

function formatFileSize(bytes: number, locale = 'ru-RU'): string {
	if (bytes < 1024 * 1024)
		return `${Math.ceil(bytes / 1024)} ${locale === 'en-US' ? 'KB' : 'КБ'}`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} ${locale === 'en-US' ? 'MB' : 'МБ'}`;
}

function getAcceptedFileTypesLabel(mimeTypes: ReadonlySet<string>): string {
	const labels = new Set<string>();
	mimeTypes.forEach((mimeType) => {
		const labelByMimeType: Record<string, string> = {
			'application/pdf': 'PDF',
			'image/jpeg': 'JPG',
			'image/png': 'PNG',
			'image/webp': 'WebP',
				'video/mp4': 'MP4',
				'video/mpeg': 'MPEG',
				'video/quicktime': 'MOV',
				'video/webm': 'WebM',
			'video/x-matroska': 'MKV',
			'audio/mpeg': 'MP3',
			'audio/wav': 'WAV',
			'audio/x-wav': 'WAV',
			'audio/aac': 'AAC',
			'audio/mp4': 'M4A',
			'audio/ogg': 'OGG',
			'audio/flac': 'FLAC',
		};
		labels.add(labelByMimeType[mimeType] || mimeType);
	});
	return [...labels].join(', ');
}

function toLocalMessageAttachment(
	reference: PendingReference,
): ChatMessageAttachment {
	return {
		id: reference.id,
		role: 'reference',
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

function toUploadedMessageAttachment(
	reference: PendingReference,
	upload: AiUploadResult | undefined,
): ChatMessageAttachment {
	if (!upload) return toLocalMessageAttachment(reference);

	return {
		id: upload.id,
		role: 'reference',
		name: upload.name || reference.file.name,
		mimeType: upload.mimeType || reference.file.type || null,
		sizeBytes: upload.sizeBytes || String(reference.file.size),
		width: upload.width,
		height: upload.height,
		durationMs: null,
		assetAvailable: true,
		previewUrl: upload.previewUrl,
		downloadUrl: upload.downloadUrl,
		deletedAt: null,
	};
}

function formatAttachmentDetails(
	file: AiMessageAttachment,
	locale = 'ru-RU',
): string {
	const details: string[] = [];
	const typeLabel = getMimeTypeLabel(file.mimeType);
	if (typeLabel) details.push(typeLabel);
	if (file.width && file.height)
		details.push(`${file.width} × ${file.height} px`);
	const bytes = Number(file.sizeBytes);
	if (Number.isFinite(bytes) && bytes > 0)
		details.push(formatFileSize(bytes, locale));
	return details.join(' · ');
}

type AttachmentKind = 'audio' | 'document' | 'image' | 'video';

function getAttachmentKind(mimeType: string): AttachmentKind {
	if (mimeType.startsWith('audio/')) return 'audio';
	if (mimeType.startsWith('video/')) return 'video';
	if (mimeType.startsWith('image/')) return 'image';
	return 'document';
}

function mimeSetAcceptsKind(
	mimeTypes: ReadonlySet<string>,
	kind: AttachmentKind,
): boolean {
	return [...mimeTypes].some(
		(mimeType) => getAttachmentKind(mimeType) === kind,
	);
}

function getMimeTypeLabel(mimeType: string | null | undefined): string | null {
	if (!mimeType) return null;
	const labels: Record<string, string> = {
		'application/pdf': 'PDF',
		'video/mp4': 'MP4',
		'video/mpeg': 'MPEG',
		'video/quicktime': 'MOV',
		'video/webm': 'WebM',
		'video/x-matroska': 'MKV',
		'audio/mpeg': 'MP3',
		'audio/wav': 'WAV',
		'audio/x-wav': 'WAV',
		'audio/aac': 'AAC',
		'audio/mp4': 'M4A',
		'audio/ogg': 'OGG',
		'audio/flac': 'FLAC',
	};
	return labels[mimeType] || null;
}

function getAttachmentKindLabel(
	kind: AttachmentKind,
	t: (ru: string, en: string) => string,
): string {
	const labels: Record<AttachmentKind, [string, string]> = {
		audio: ['Аудио', 'Audio'],
		document: ['Документы', 'Documents'],
		image: ['Изображения', 'Images'],
		video: ['Видео', 'Video'],
	};
	return t(...labels[kind]);
}

function getImageFileName(output: AiRunOutput | AiWorkOutput): string {
	const extensionByMimeType: Record<string, string> = {
		'image/avif': 'avif',
		'image/gif': 'gif',
		'image/heic': 'heic',
		'image/heif': 'heif',
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/tiff': 'tiff',
		'image/webp': 'webp',
	};
	const extension = extensionByMimeType[output.mimeType || ''] || 'image';
	return `neuroluv-${output.id}.${extension}`;
}

function remapReferencePromptTags(
	prompt: string,
	template: string | undefined,
	previousReferences: readonly PendingReference[],
	nextReferences: readonly PendingReference[],
): string {
	if (
		!template?.includes('{index}') ||
		!prompt ||
		previousReferences.length === 0
	) {
		return prompt;
	}

	const placeholders = new Map<string, string>();
	let remapped = prompt;
	previousReferences.forEach((reference, index) => {
		const previousTag = template.replace('{index}', String(index + 1));
		const placeholder = `\uE000${reference.id}\uE001`;
		placeholders.set(reference.id, placeholder);
		remapped = remapped.replace(
			new RegExp(escapeReferenceTag(previousTag), 'giu'),
			placeholder,
		);
	});

	placeholders.forEach((placeholder, referenceId) => {
		const nextIndex = nextReferences.findIndex(
			(reference) => reference.id === referenceId,
		);
		const nextTag =
			nextIndex >= 0 ? template.replace('{index}', String(nextIndex + 1)) : '';
		remapped = remapped.replaceAll(placeholder, nextTag);
	});

	return remapped;
}

function escapeReferenceTag(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatImageCount(count: number): string {
	const absolute = Math.abs(count);
	const lastTwoDigits = absolute % 100;
	const lastDigit = absolute % 10;
	const noun =
		lastTwoDigits >= 11 && lastTwoDigits <= 14
			? 'изображений'
			: lastDigit === 1
				? 'изображение'
				: lastDigit >= 2 && lastDigit <= 4
					? 'изображения'
					: 'изображений';
	return `${count} ${noun}`;
}

function formatFileCount(count: number): string {
	const absolute = Math.abs(count);
	const lastTwoDigits = absolute % 100;
	const lastDigit = absolute % 10;
	const noun =
		lastTwoDigits >= 11 && lastTwoDigits <= 14
			? 'файлов'
			: lastDigit === 1
				? 'файл'
				: lastDigit >= 2 && lastDigit <= 4
					? 'файла'
					: 'файлов';
	return `${count} ${noun}`;
}

function getFileFingerprint(file: File): string {
	return [file.name, file.type, file.size, file.lastModified].join(':');
}

function hasFileTransfer(data: DataTransfer): boolean {
	return (
		data.files.length > 0 ||
		Array.from(data.types).includes('Files') ||
		Array.from(data.items).some((item) => item.kind === 'file')
	);
}

function getDataTransferFiles(data: DataTransfer | null): File[] {
	if (!data) return [];
	const itemFiles = Array.from(data.items)
		.filter((item) => item.kind === 'file')
		.map((item) => item.getAsFile())
		.filter((file): file is File => file !== null);
	return itemFiles.length > 0 ? itemFiles : Array.from(data.files);
}

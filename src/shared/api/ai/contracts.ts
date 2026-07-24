export type AiApiProblem = {
	type?: string;
	title: string;
	status: number;
	detail?: string;
	code?: string;
	correlationId?: string;
	errors?: Record<string, string[]>;
};

export type AiNavigationItem = {
	id: string | number;
	label: string;
	ariaLabel?: string | null;
	href: string;
	icon?: string | null;
	sort?: number | null;
	children?: AiNavigationItem[];
};

export type AiNavigationResponse = {
	projectName: string;
	data: AiNavigationItem[];
};

export type AiFooterNavigationResponse = {
	data: AiNavigationItem[];
};

export type AiPageMetadata = {
	path: string;
	siteName?: string | null;
	title?: string | null;
	heading?: string | null;
	content?: string | null;
	seoTitle?: string | null;
	seoDescription?: string | null;
	noindex: boolean;
	imageUrl?: string | null;
};

export type AiUser = {
	id: string;
	displayName: string;
	email?: string | null;
	avatarUrl?: string | null;
	locale?: 'ru-RU' | 'en-US';
};

export type AiWalletSummary = {
	availableCredits: number;
	reservedCredits: number;
	lockedCredits: number;
	creditsName: string;
};

export type AiSession = {
	authenticated: boolean;
	user: AiUser | null;
	wallet: AiWalletSummary | null;
};

export type AiModelModality = 'text' | 'image' | 'video' | 'vision';

export type AiModelCapabilities = {
	operations: string[];
	aspectRatios?: string[];
	outputCounts?: number[];
	durations?: number[];
	resolutions?: string[];
	qualities?: string[];
	acceptsReference?: boolean;
	acceptsNegativePrompt?: boolean;
	acceptsSound?: boolean;
	supportsContext?: boolean;
	maxUploadBytes?: number;
	maxReferenceFiles?: number;
	referencePromptTag?: string;
	reasoning?: {
		modes: string[];
		defaultMode: string;
		mandatory: boolean;
	};
	videoModes?: Array<{
		code: string;
		operation: 'text_to_video' | 'image_to_video';
		imageInput?: 'frame_images' | 'input_references';
		minReferenceFiles: number;
		maxReferenceFiles: number;
	}>;
};

export type AiPublicModel = {
	id: string;
	slug: string;
	name: string;
	description?: string | null;
	logoUrl?: string | null;
	modality: AiModelModality;
	capabilities: AiModelCapabilities;
	presentation?: {
		family?: string | null;
		variant?: string | null;
		sort?: number | null;
	} | null;
	available: boolean;
	unavailableReason?: string | null;
};

export type AiQuoteRequest = {
	operation: string;
	modelId: string;
	promptId?: number;
	toolId?: string;
	parameters: Record<string, unknown>;
};

export type AiQuote = {
	quoteId: string;
	normalizedParameters: Record<string, unknown>;
	supported: boolean;
	minimumCredits: number;
	estimatedCredits: number;
	maximumCredits: number;
	reserveCredits: number;
	creditsName: string;
	expiresAt: string;
	unavailableReasons: string[];
	pricing: {
		unit: string;
		calculation: 'fixed_request' | 'metered_request' | 'variable';
	};
};

export type AiRunStatus =
	| 'queued'
	| 'processing'
	| 'succeeded'
	| 'partially_succeeded'
	| 'failed'
	| 'cancelled';

export type AiRunSummary = {
	id: string;
	conversationId?: string | null;
	sequence?: number | null;
	contextEnabled?: boolean;
	contextEpoch?: string | null;
	workId?: string | null;
	status: AiRunStatus;
	title: string;
	prompt?: string | null;
	modality: AiModelModality;
	modelId?: string | null;
	modelName: string;
	createdAt: string;
	progress?: number | null;
	queuePosition?: number | null;
	reservedCredits: number;
	chargedCredits?: number | null;
	errorMessage?: string | null;
};

export type AiRetryPreset = {
	runId: string;
	operation: string;
	modelId: string;
	promptId?: number | null;
	toolId?: string | null;
	parameters: Record<string, unknown>;
	hasInputReference: boolean;
};

export type AiMessageAttachment = {
	id: string;
	role: string;
	name?: string | null;
	mimeType?: string | null;
	sizeBytes?: string | null;
	width?: number | null;
	height?: number | null;
	durationMs?: number | null;
	assetAvailable: boolean;
	previewUrl?: string | null;
	downloadUrl?: string | null;
	deletedAt?: string | null;
};

export type AiUploadResult = {
	id: string;
	name: string;
	mimeType: string;
	sizeBytes: string;
	width: number | null;
	height: number | null;
	previewUrl: string;
	downloadUrl: string;
	expiresAt: string;
};

export type AiRunDetail = AiRunSummary & {
	operation: string;
	modelId: string;
	hasInputReference: boolean;
	inputFiles: AiMessageAttachment[];
	retryPreset: AiRetryPreset;
	outputs: AiRunOutput[];
};

export type AiConversationKind = 'text' | 'image' | 'video';

export type AiConversationTurn = {
	run: AiRunSummary;
	userText: string;
	inputFiles: AiMessageAttachment[];
	outputs: AiRunOutput[];
};

export type AiConversation = {
	id: string;
	title: string;
	kind: AiConversationKind;
	contextEnabled: boolean;
	status: 'active' | 'archived' | 'deleted';
	createdAt: string;
	updatedAt: string;
	turns?: AiConversationTurn[];
};

export type AiRunOutput = {
	id: string;
	index: number;
	type: 'text' | 'image' | 'video' | string;
	text?: string | null;
	data?: unknown;
	moderationStatus?: string | null;
	heldForReview: boolean;
	fileAvailable?: boolean;
	assetAvailable?: boolean;
	mimeType?: string | null;
	sizeBytes?: string | null;
	width?: number | null;
	height?: number | null;
	aspectRatio?: string | null;
	outputUrl?: string | null;
	previewUrl?: string | null;
	downloadUrl?: string | null;
	copyUrl?: string | null;
	url?: string | null;
	deletedAt?: string | null;
};

export type AiCitation = {
	title: string;
	url: string;
};

export type AiPage<T> = {
	data: T[];
	page: number;
	pageSize: number;
	total: number;
	hasMore: boolean;
};

export type AiPromptCard = {
	id: string;
	slug: string;
	title: string;
	excerpt?: string | null;
	imageUrl?: string | null;
	modality: AiModelModality;
	modelNames: string[];
	category?: string | null;
	access: 'free' | 'subscription';
	favorite: boolean;
	seoNoindex: boolean;
	seoNofollow: boolean;
};

export type AiWorkSummary = {
	id: string;
	title: string;
	modality: AiModelModality;
	status: AiRunStatus | 'expired';
	model?: {
		id: string;
		name: string;
	};
	previewUrl?: string | null;
	outputUrl?: string | null;
	favorite: boolean;
	shared: boolean;
	createdAt: string;
};

export type AiSubscriptionState = {
	active: boolean;
	planName?: string | null;
	periodEndsAt?: string | null;
	autoRenew?: boolean;
};

export type AiPlan = {
	id: string;
	name: string;
	description?: string | null;
	amountMinor: number;
	currency: string;
	credits: number;
	interval: 'week' | 'month' | 'three_months' | 'year' | 'custom';
	intervalLabel: string;
	priceSuffix: string;
	features: string[];
	recurringAvailable: boolean;
	badge?: string | null;
};

export type AiTopupPackage = {
	id: string;
	name: string;
	amountMinor: number;
	currency: string;
	credits: number;
	eligible: boolean;
	ineligibleReason?: string | null;
};

export type AiPromoQuote = {
	code: string;
	baseAmountMinor: number;
	discountMinor: number;
	finalAmountMinor: number;
	bonusCredits: number;
	currency: string;
};

export type AiBalancePage = {
	wallet: AiWalletSummary;
	subscription: AiSubscriptionState;
	plans: AiPlan[];
	topups: AiTopupPackage[];
};

export type AiApiEnvelope<T> = {
	data: T;
};

export type AiAuthProvider = {
	code: string;
	label: string;
	available: boolean;
	registrationAccess?: 'open' | 'telegram_allowlist' | 'disabled';
	authorizationUrl?: string | null;
	unavailableReason?: string | null;
};

export type AiToolFieldOption = {
	value: string | number | boolean;
	label: string;
};

export type AiToolField = {
	code: string;
	label: string;
	description?: string | null;
	defaultValue?: string | number | boolean | null;
	type: 'text' | 'textarea' | 'select' | 'number' | 'boolean' | 'file';
	required: boolean;
	placeholder?: string | null;
	minimum?: number | null;
	maximum?: number | null;
	options?: AiToolFieldOption[];
};

export type AiPublicTool = {
	id: string;
	code: string;
	slug: string;
	name: string;
	description?: string | null;
	modality: AiModelModality;
	available: boolean;
	unavailableReason?: string | null;
	modelIds: string[];
	fields: AiToolField[];
};

export type AiPromptDetail = AiPromptCard & {
	description?: string | null;
	seoTitle?: string | null;
	seoDescription?: string | null;
	promptTemplate: string;
	defaultAspectRatio?: string | null;
	minimumReferenceFiles: number;
	maximumReferenceFiles: number;
	allowReferenceUpload: boolean;
	allowUserPromptEdit: boolean;
	variablesSchema?: {
		fields?: Array<{
			code: string;
			label: string;
			type?: 'text' | 'textarea' | 'number' | 'select';
			required?: boolean;
			placeholder?: string | null;
			templateToken?: string | null;
			options?: AiToolFieldOption[];
		}>;
	} | null;
	compatibleModelIds: string[];
};

export type AiPromptCatalog = AiPage<AiPromptCard> & {
	filters?: {
		categories?: Array<{ value: string; label: string }>;
		modelIds?: string[];
	};
};

export type AiWorkDetail = AiWorkSummary & {
	runId?: string | null;
	operation?: string | null;
	photoToPromptMode?: 'photo' | 'video' | 'style' | 'repeat' | null;
	prompt?: string | null;
	negativePrompt?: string | null;
	outputs?: AiWorkOutput[];
	outputUrl?: string | null;
	textContent?: string | null;
	downloadUrl?: string | null;
	modelName?: string | null;
	operationLabel?: string | null;
	chargedCredits?: number | null;
	fileDeletedAt?: string | null;
	shareSlug?: string | null;
	hasInputReference?: boolean;
};

export type AiWorkOutput = {
	id: string;
	index: number;
	type: 'text' | 'image' | 'video' | string;
	text?: string | null;
	data?: unknown;
	mimeType?: string | null;
	sizeBytes?: string | null;
	width?: number | null;
	height?: number | null;
	aspectRatio?: string | null;
	moderationStatus?: string | null;
	heldForReview: boolean;
	assetAvailable: boolean;
	deletedByRetention: boolean;
	outputUrl?: string | null;
	previewUrl?: string | null;
	downloadUrl?: string | null;
	copyUrl?: string | null;
	deletedAt?: string | null;
};

export type AiHistoryItem = {
	id: string;
	kind: 'run' | 'ledger' | 'payment' | 'refund';
	title: string;
	prompt?: string | null;
	description?: string | null;
	status: string;
	createdAt: string;
	modelName?: string | null;
	providerName?: string | null;
	creditsDelta?: number | null;
	amountMinor?: number | null;
	currency?: string | null;
	runId?: string | null;
	workId?: string | null;
	receiptUrl?: string | null;
	receiptReference?: string | null;
	receiptStatus?: AiReceiptRegistrationStatus | null;
};

export type AiReceiptRegistrationStatus =
	| 'canceled'
	| 'not_requested'
	| 'pending'
	| 'succeeded'
	| 'unknown'
	| 'unsupported';

export type AiPaymentProvider = {
	id: string;
	code: string;
	name: string;
	description?: string | null;
	currencies: string[];
	recurringAvailable: boolean;
	available: boolean;
	unavailableReason?: string | null;
};

export type AiBillingProducts = {
	subscription: AiSubscriptionState;
	plans: AiPlan[];
	topups: AiTopupPackage[];
	paymentProviders: AiPaymentProvider[];
};

export type AiPaymentSummary = {
	id: string;
	title: string;
	status: 'pending' | 'succeeded' | 'failed' | 'refunded' | string;
	amountMinor: number;
	currency: string;
	createdAt: string;
	receiptUrl?: string | null;
	receiptReference?: string | null;
	receiptStatus?: AiReceiptRegistrationStatus | null;
};

export type AiUserProfile = {
	id: string;
	displayName: string;
	email?: string | null;
	telegramUsername?: string | null;
	avatarUrl?: string | null;
	language?: string | null;
	marketingConsent?: boolean;
	productUpdates?: boolean;
	authMethods: {
		emailPassword: boolean;
		emailVerified: boolean;
		emailTwoFactorEnabled: boolean;
		telegram: boolean;
	};
};

export type AiTwoFactorRequired = {
	requiresTwoFactor: true;
	challengeId: string;
	destinationHint: string;
};

export type AiReferralPayout = {
	id: string;
	amountMinor: number;
	currency: string;
	method: 'bank' | 'crypto';
	status: string;
	createdAt: string;
};

export type AiReferralStats = {
	code: string;
	referralUrl: string;
	attributionDays: number;
	clicks: number;
	registrations: number;
	firstPayments: number;
	pendingAmountMinor: number;
	availableAmountMinor: number;
	paidAmountMinor: number;
	currency: string;
	minimumPayoutMinor: number;
	referrerPercent?: number | null;
	referredBonusPercent?: number | null;
	holdDays?: number | null;
	payoutMethods?: Array<'bank' | 'crypto'>;
	promptAuthorRewardGenerations: number;
	promptAuthorRewardCredits: number;
	payouts: AiReferralPayout[];
};

export type AiFaqItem = {
	id: string | number;
	question: string;
	answer: string;
	category?: string | null;
	sort?: number | null;
};

export type AiPublicShare = {
	slug: string;
	title: string;
	modality: AiModelModality;
	modelId?: string | null;
	modelName?: string | null;
	createdAt: string;
	previewUrl?: string | null;
	outputUrl?: string | null;
	textContent?: string | null;
	downloadUrl?: string | null;
	expired?: boolean;
	disclosure: {
		promptIncluded: boolean;
		negativePromptIncluded: boolean;
		sourceReferenceIncluded: boolean;
	};
	prompt?: string | null;
	negativePrompt?: string | null;
	remixSupported: boolean;
	remixUnavailableReason?: string | null;
};

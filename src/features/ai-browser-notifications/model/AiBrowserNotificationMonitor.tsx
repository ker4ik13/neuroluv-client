'use client';

import { useEffect, useRef, useState } from 'react';
import { useAiLocale } from '@/features/ai-locale';
import { useAiSession } from '@/features/ai-session';
import {
	type AiApiEnvelope,
	aiApiFetch,
	type AiPage,
	type AiPaymentSummary,
	type AiPublicModel,
	type AiRunDetail,
	type AiRunSummary,
	type AiUserProfile,
} from '@/shared/api/ai';
import {
	AI_BROWSER_NOTIFICATIONS_CHANGE_EVENT,
	AI_PAYMENT_UPDATED_EVENT,
	AI_RUN_UPDATED_EVENT,
	browserNotificationsSupported,
	forgetPendingPayment,
	readPendingPayment,
} from './browserNotifications';
import { browserPushSubscriptionActive } from './browserPush';

const RUN_POLL_INTERVAL_MS = 20_000;
const PAYMENT_POLL_INTERVAL_MS = 30_000;
const PENDING_PAYMENT_POLL_INTERVAL_MS = 2_500;
const TERMINAL_RUN_STATUSES = new Set([
	'succeeded',
	'partially_succeeded',
	'failed',
	'cancelled',
]);
const SUCCESS_PAYMENT_STATUSES = new Set(['paid', 'succeeded']);
const TERMINAL_PAYMENT_STATUSES = new Set([
	'canceled',
	'cancelled',
	'expired',
	'failed',
	'refunded',
]);

export function AiBrowserNotificationMonitor() {
	const { locale } = useAiLocale();
	const { session, refresh: refreshSession } = useAiSession();
	const [enabled, setEnabled] = useState(false);
	const enabledRef = useRef(false);
	const pushActiveRef = useRef(false);

	useEffect(() => {
		enabledRef.current = enabled;
	}, [enabled]);

	useEffect(() => {
		if (!session.authenticated) return;

		let active = true;
		void aiApiFetch<AiUserProfile | AiApiEnvelope<AiUserProfile>>('/profile')
			.then(async (payload) => {
				if (!active) return;
				const profile = unwrapData(payload);
				const nextEnabled =
					Boolean(profile.preferences?.browserNotifications) &&
						browserNotificationsSupported() &&
						Notification.permission === 'granted';
				const pushActive = nextEnabled
					? await browserPushSubscriptionActive().catch(() => false)
					: false;
				if (!active) return;
				pushActiveRef.current = pushActive;
				setEnabled(nextEnabled);
			})
			.catch(() => undefined);

		const onPreferenceChange = (event: Event) => {
			const detail = (
				event as CustomEvent<{ enabled?: unknown; pushActive?: unknown }>
			).detail;
			pushActiveRef.current = detail?.pushActive === true;
			setEnabled(
				detail?.enabled === true &&
					browserNotificationsSupported() &&
					Notification.permission === 'granted',
			);
		};
		window.addEventListener(
			AI_BROWSER_NOTIFICATIONS_CHANGE_EVENT,
			onPreferenceChange,
		);
		return () => {
			active = false;
			window.removeEventListener(
				AI_BROWSER_NOTIFICATIONS_CHANGE_EVENT,
				onPreferenceChange,
			);
		};
	}, [session.authenticated]);

	useEffect(() => {
		if (!session.authenticated || !enabled) return;

		let active = true;
		let timer: number | null = null;
		const knownStatuses = new Map<string, string>();
		const monitorStartedAt = Date.now();

		const schedule = () => {
			if (!active) return;
			timer = window.setTimeout(() => void poll(), RUN_POLL_INTERVAL_MS);
		};
		const poll = async () => {
			timer = null;
			if (!active) return;
			try {
				const payload = await aiApiFetch<
					AiPage<AiRunSummary> | AiApiEnvelope<AiPage<AiRunSummary>>
				>('/runs?page=1&pageSize=30');
				if (!active) return;
				const runs = unwrapData(payload).data;

				for (const run of runs) {
					const previousStatus = knownStatuses.get(run.id);
					const isRecentNewRun =
						!previousStatus &&
						Number.isFinite(Date.parse(run.createdAt)) &&
						Date.parse(run.createdAt) >=
							monitorStartedAt - RUN_POLL_INTERVAL_MS;
					const justFinished =
						TERMINAL_RUN_STATUSES.has(run.status) &&
						(previousStatus
							? !TERMINAL_RUN_STATUSES.has(previousStatus)
							: isRecentNewRun);

					if (justFinished) {
						if (!pushActiveRef.current) void notifyRun(run, locale);
						window.dispatchEvent(
							new CustomEvent(AI_RUN_UPDATED_EVENT, { detail: run }),
						);
					}
					knownStatuses.set(run.id, run.status);
				}
			} catch {
				// A notification poll is best effort and must never affect the page.
			} finally {
				schedule();
			}
		};

		void poll();
		return () => {
			active = false;
			if (timer !== null) window.clearTimeout(timer);
		};
	}, [enabled, locale, session.authenticated]);

	useEffect(() => {
		if (!session.authenticated) return;

		let active = true;
		let timer: number | null = null;
		const knownStatuses = new Map<string, string>();
		const monitorStartedAt = Date.now();

		const schedule = () => {
			if (!active) return;
			const delay = readPendingPayment()
				? PENDING_PAYMENT_POLL_INTERVAL_MS
				: PAYMENT_POLL_INTERVAL_MS;
			timer = window.setTimeout(() => void poll(), delay);
		};
		const poll = async () => {
			timer = null;
			if (!active) return;
			const pendingPayment = readPendingPayment();
			if (!pendingPayment && !enabledRef.current) {
				schedule();
				return;
			}

			try {
				const payload = await aiApiFetch<
					AiPage<AiPaymentSummary> | AiApiEnvelope<AiPage<AiPaymentSummary>>
				>('/billing/payments?page=1&pageSize=20');
				if (!active) return;
				const payments = unwrapData(payload).data;

				for (const payment of payments) {
					const previousStatus = knownStatuses.get(payment.id);
					const isExpected = pendingPayment?.paymentId === payment.id;
					const isRecentNewPayment =
						!previousStatus &&
						Number.isFinite(Date.parse(payment.createdAt)) &&
						Date.parse(payment.createdAt) >=
							monitorStartedAt - PAYMENT_POLL_INTERVAL_MS;
					const justPaid =
						SUCCESS_PAYMENT_STATUSES.has(payment.status) &&
						(isExpected ||
							(previousStatus
								? !SUCCESS_PAYMENT_STATUSES.has(previousStatus)
								: isRecentNewPayment));

					if (justPaid) {
						forgetPendingPayment(payment.id);
						notifyPayment(
							payment,
							locale,
							enabledRef.current && !pushActiveRef.current,
						);
						window.dispatchEvent(
							new CustomEvent(AI_PAYMENT_UPDATED_EVENT, {
								detail: payment,
							}),
						);
						void refreshSession();
					} else if (
						isExpected &&
						TERMINAL_PAYMENT_STATUSES.has(payment.status)
					) {
						forgetPendingPayment(payment.id);
						window.dispatchEvent(
							new CustomEvent(AI_PAYMENT_UPDATED_EVENT, {
								detail: payment,
							}),
						);
					}
					knownStatuses.set(payment.id, payment.status);
				}
			} catch {
				// The webhook and the next poll remain the source of truth.
			} finally {
				schedule();
			}
		};

		void poll();
		return () => {
			active = false;
			if (timer !== null) window.clearTimeout(timer);
		};
	}, [enabled, locale, refreshSession, session.authenticated]);

	return null;
}

async function notifyRun(run: AiRunSummary, locale: string): Promise<void> {
	const succeeded =
		run.status === 'succeeded' || run.status === 'partially_succeeded';
	const assets = await loadRunNotificationAssets(run);
	const title =
		run.modelName || (locale === 'en-US' ? 'AI model' : 'Нейросеть');
	const fallback =
		locale === 'en-US'
			? succeeded
				? 'Your result is ready'
				: 'Open the chat for details'
			: succeeded
				? 'Результат готов'
				: 'Откройте чат, чтобы посмотреть подробности';
	const href =
		succeeded && run.workId ? `/ai/works/${run.workId}` : chatHref(run);
	const body = succeeded
		? run.modality === 'text'
			? assets.responseText || fallback
			: run.prompt || fallback
		: run.errorMessage || fallback;
	// macOS and iOS often omit the optional notification `image`. For successful
	// image runs, also use the result in the visible `icon` media slot.
	const icon =
		succeeded && run.modality === 'image' && assets.image
			? assets.image
			: assets.icon;

	await showNotificationOnce(`run:${run.id}:${run.status}`, title, {
		body,
		href,
		icon,
		image: succeeded ? assets.image : null,
	});
}

async function loadRunNotificationAssets(run: AiRunSummary): Promise<{
	icon: string | null;
	image: string | null;
	responseText: string | null;
}> {
	const [detailPayload, modelsPayload] = await Promise.all([
		aiApiFetch<AiRunDetail | AiApiEnvelope<AiRunDetail>>(
			`/runs/${encodeURIComponent(run.id)}`,
		).catch(() => null),
		aiApiFetch<AiPublicModel[] | AiApiEnvelope<AiPublicModel[]>>(
			`/catalog/models?modality=${encodeURIComponent(run.modality)}`,
			{ csrf: false },
		).catch(() => null),
	]);
	const detail = detailPayload ? unwrapData(detailPayload) : null;
	const models = modelsPayload ? unwrapData(modelsPayload) : [];
	const model = models.find((candidate) => candidate.id === run.modelId);
	const imageOutput = detail?.outputs.find(
		(output) =>
			output.type === 'image' &&
			output.assetAvailable !== false &&
			Boolean(output.previewUrl || output.outputUrl || output.url),
	);
	const textOutput = detail?.outputs.find(
		(output) => output.type === 'text' && Boolean(output.text?.trim()),
	);

	return {
		icon: model?.logoUrl || null,
		image:
			imageOutput?.previewUrl ||
			imageOutput?.outputUrl ||
			imageOutput?.url ||
			null,
		responseText: textOutput?.text?.trim() || null,
	};
}

function notifyPayment(
	payment: AiPaymentSummary,
	locale: string,
	enabled: boolean,
): void {
	if (!enabled) return;
	void showNotificationOnce(
		`payment:${payment.id}:paid`,
		locale === 'en-US' ? 'Payment credited' : 'Оплата зачислена',
		{
			body:
				locale === 'en-US'
					? 'Your balance and subscription have been updated'
					: 'Баланс и подписка уже обновлены',
			href: '/ai/balance',
		},
	);
}

function chatHref(run: AiRunSummary): string {
	const kind =
		run.modality === 'video'
			? 'video'
			: run.modality === 'image'
				? 'photo'
				: 'text';
	const conversation = run.conversationId
		? `?conversation=${encodeURIComponent(run.conversationId)}`
		: '';
	return `/ai/create/${kind}${conversation}`;
}

async function showNotificationOnce(
	key: string,
	title: string,
	input: {
		body: string;
		href: string;
		icon?: string | null;
		image?: string | null;
	},
): Promise<void> {
	if (
		!browserNotificationsSupported() ||
		Notification.permission !== 'granted' ||
		!claimNotification(key)
	) {
		return;
	}

	try {
		if ('serviceWorker' in navigator) {
			const registration = await navigator.serviceWorker.register(
				'/ai-notifications-sw.js',
				{ scope: '/' },
			);
			await registration.showNotification(title, {
				badge: '/favicon-96x96.png',
				body: input.body.slice(0, 400),
				data: { href: input.href },
				icon: input.icon || '/web-app-manifest-192x192.png',
				...(input.image ? { image: input.image } : {}),
				tag: key,
			});
			return;
		}
	} catch {
		// Desktop browsers can still use the Notification constructor fallback.
	}

	try {
		const notification = new Notification(title, {
			body: input.body.slice(0, 400),
			icon: input.icon || '/web-app-manifest-192x192.png',
			...(input.image ? { image: input.image } : {}),
			tag: key,
		});
		notification.onclick = () => {
			window.focus();
			window.location.assign(input.href);
			notification.close();
		};
	} catch {
		// Permission can be revoked outside the application at any time.
	}
}

function claimNotification(key: string): boolean {
	const storageKey = 'neuroluv-ai:browser-notification-history';
	const now = Date.now();
	try {
		const parsed = JSON.parse(
			window.localStorage.getItem(storageKey) || '{}',
		) as Record<string, number>;
		if (typeof parsed[key] === 'number') return false;
		const entries = Object.entries({ ...parsed, [key]: now })
			.filter(([, timestamp]) => now - timestamp < 30 * 24 * 60 * 60_000)
			.sort((left, right) => right[1] - left[1])
			.slice(0, 200);
		window.localStorage.setItem(
			storageKey,
			JSON.stringify(Object.fromEntries(entries)),
		);
		return true;
	} catch {
		return true;
	}
}

function unwrapData<T>(payload: T | AiApiEnvelope<T>): T {
	return payload &&
		typeof payload === 'object' &&
		'data' in payload &&
		Object.keys(payload).length === 1
		? (payload as AiApiEnvelope<T>).data
		: (payload as T);
}

'use client';

import { aiApiFetch } from '@/shared/api/ai';
import { browserNotificationsSupported } from './browserNotifications';

const SERVICE_WORKER_URL = '/ai-notifications-sw.js';
const SERVICE_WORKER_SCOPE = '/';

type BrowserPushConfig = {
	enabled: boolean;
	publicKey: string | null;
};

export async function enableBrowserPushOnDevice(): Promise<void> {
	if (!browserNotificationsSupported()) {
		throw new Error('Этот браузер не поддерживает Web Push');
	}

	const config = await aiApiFetch<BrowserPushConfig>(
		'/notifications/browser-push/config',
		{ csrf: false },
	);
	if (!config.enabled || !config.publicKey) {
		throw new Error('Web Push пока не настроен на сервере');
	}

	const permission =
		Notification.permission === 'granted'
			? 'granted'
			: await Notification.requestPermission();
	if (permission !== 'granted') {
		throw new Error(
			'Разрешите уведомления для neuroluv.ru в настройках браузера',
		);
	}

	const registration = await navigator.serviceWorker.register(
		SERVICE_WORKER_URL,
		{ scope: SERVICE_WORKER_SCOPE },
	);
	await navigator.serviceWorker.ready;

	let subscription = await registration.pushManager.getSubscription();
	if (
		subscription &&
		!applicationServerKeyMatches(subscription, config.publicKey)
	) {
		await removeServerSubscription(subscription.endpoint);
		await subscription.unsubscribe();
		subscription = null;
	}

	let created = false;
	if (!subscription) {
		subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: decodeBase64Url(config.publicKey),
		});
		created = true;
	}

	const serialized = subscription.toJSON();
	if (
		typeof serialized.endpoint !== 'string' ||
		typeof serialized.keys?.auth !== 'string' ||
		typeof serialized.keys?.p256dh !== 'string'
	) {
		if (created) await subscription.unsubscribe();
		throw new Error('Браузер вернул неполную Push-подписку');
	}

	try {
		await aiApiFetch('/notifications/browser-push/subscriptions', {
			method: 'POST',
			body: {
				endpoint: serialized.endpoint,
				expirationTime: serialized.expirationTime ?? null,
				keys: {
					auth: serialized.keys.auth,
					p256dh: serialized.keys.p256dh,
				},
			},
		});
	} catch (error) {
		if (created) await subscription.unsubscribe();
		throw error;
	}
}

export async function disableBrowserPushOnDevice(): Promise<void> {
	if (!browserNotificationsSupported()) return;
	const registration =
		await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
	const subscription = await registration?.pushManager.getSubscription();
	if (!subscription) return;

	await removeServerSubscription(subscription.endpoint);
	await subscription.unsubscribe();
}

export async function browserPushSubscriptionActive(): Promise<boolean> {
	if (
		!browserNotificationsSupported() ||
		Notification.permission !== 'granted'
	) {
		return false;
	}
	const registration =
		await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
	return Boolean(await registration?.pushManager.getSubscription());
}

async function removeServerSubscription(endpoint: string): Promise<void> {
	try {
		await aiApiFetch('/notifications/browser-push/subscriptions', {
			method: 'DELETE',
			body: { endpoint },
		});
	} catch {
		// The browser subscription is still removed locally. A later 404/410 from
		// the push service revokes a stale server record automatically.
	}
}

function applicationServerKeyMatches(
	subscription: PushSubscription,
	publicKey: string,
): boolean {
	const current = subscription.options.applicationServerKey;
	if (!current) return false;
	return encodeBase64Url(new Uint8Array(current)) === publicKey;
}

function decodeBase64Url(value: string): ArrayBuffer {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalized.padEnd(
		normalized.length + ((4 - (normalized.length % 4)) % 4),
		'=',
	);
	const decoded = window.atob(padded);
	const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
	return bytes.buffer;
}

function encodeBase64Url(value: Uint8Array): string {
	let binary = '';
	for (const byte of value) binary += String.fromCharCode(byte);
	return window
		.btoa(binary)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

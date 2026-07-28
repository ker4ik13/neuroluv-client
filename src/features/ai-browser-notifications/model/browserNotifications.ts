export const AI_BROWSER_NOTIFICATIONS_CHANGE_EVENT =
	'neuroluv-ai:browser-notifications-change';
export const AI_PAYMENT_UPDATED_EVENT = 'neuroluv-ai:payment-updated';
export const AI_RUN_UPDATED_EVENT = 'neuroluv-ai:run-updated';

const PENDING_PAYMENT_STORAGE_KEY = 'neuroluv-ai:pending-payment';

export type PendingPayment = {
	createdAt: string;
	paymentId: string;
};

export function rememberPendingPayment(paymentId: string): void {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(
		PENDING_PAYMENT_STORAGE_KEY,
		JSON.stringify({ createdAt: new Date().toISOString(), paymentId }),
	);
}

export function readPendingPayment(): PendingPayment | null {
	if (typeof window === 'undefined') return null;
	const raw = window.localStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as Partial<PendingPayment>;
		if (
			typeof parsed.paymentId !== 'string' ||
			!/^[0-9a-f-]{36}$/i.test(parsed.paymentId) ||
			typeof parsed.createdAt !== 'string' ||
			!Number.isFinite(Date.parse(parsed.createdAt)) ||
			Date.now() - Date.parse(parsed.createdAt) > 24 * 60 * 60_000
		) {
			throw new Error('invalid pending payment');
		}
		return { createdAt: parsed.createdAt, paymentId: parsed.paymentId };
	} catch {
		window.localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
		return null;
	}
}

export function forgetPendingPayment(paymentId: string): void {
	if (readPendingPayment()?.paymentId === paymentId) {
		window.localStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
	}
}

export function broadcastBrowserNotificationsPreference(
	enabled: boolean,
	pushActive?: boolean,
): void {
	if (typeof window === 'undefined') return;
	window.dispatchEvent(
		new CustomEvent(AI_BROWSER_NOTIFICATIONS_CHANGE_EVENT, {
			detail: { enabled, pushActive },
		}),
	);
}

export function browserNotificationsSupported(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.isSecureContext &&
		'Notification' in window &&
		'serviceWorker' in navigator &&
		'PushManager' in window
	);
}

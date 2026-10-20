'use client';

export const COOKIE_NOTICE_KEY = 'neuroluv:cookie-notice:v1';
export const NOTICE_HISTORY_KEY = 'neuroluv:notice-history:v1';
const STORAGE_EVENT = 'neuroluv-notices-storage';
const memory = new Map<string, string>();
let warned = false;
let fallbackSession = '';

export function readNoticeStorage(key: string): string | null {
	if (typeof window === 'undefined') return null;
	if (memory.has(key)) return memory.get(key) ?? null;
	try {
		return window.localStorage.getItem(key);
	} catch {
		return memory.get(key) ?? null;
	}
}

export function writeNoticeStorage(key: string, value: string): void {
	try {
		window.localStorage.setItem(key, value);
		memory.delete(key);
	} catch {
		memory.set(key, value);
		if (!warned)
			console.warn(
				'[Site notices] Browser storage unavailable; preferences last for this page only.',
			);
		warned = true;
	}
	window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function resetNoticeStorage(): void {
	for (const key of [COOKIE_NOTICE_KEY, NOTICE_HISTORY_KEY]) {
		memory.delete(key);
		try {
			window.localStorage.removeItem(key);
		} catch {
			/* In-memory reset still works. */
		}
	}
	window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function subscribeNoticeStorage(listener: () => void): () => void {
	const storageChanged = (event: StorageEvent) => {
		if (event.key) memory.delete(event.key);
		else memory.clear();
		listener();
	};
	window.addEventListener('storage', storageChanged);
	window.addEventListener(STORAGE_EVENT, listener);
	return () => {
		window.removeEventListener('storage', storageChanged);
		window.removeEventListener(STORAGE_EVENT, listener);
	};
}

export function noticeSessionId(): string {
	try {
		const key = 'neuroluv:notice-session';
		const existing = sessionStorage.getItem(key);
		if (existing) return existing;
		const id = crypto.randomUUID();
		sessionStorage.setItem(key, id);
		return id;
	} catch {
		fallbackSession ||= `${Date.now()}-${Math.random().toString(36).slice(2)}`;
		return fallbackSession;
	}
}

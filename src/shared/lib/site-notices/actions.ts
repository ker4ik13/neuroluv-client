'use client';

export const OPEN_MODAL_EVENT = 'neuroluv-open-modal';
export const COOKIE_SETTINGS_EVENT = 'neuroluv-cookie-settings';

/** May be called from any interactive component, independently of its page. */
export function openSiteModal(key: string): void {
	window.dispatchEvent(new CustomEvent(OPEN_MODAL_EVENT, { detail: key }));
}

export function openCookieSettings(): void {
	window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
}

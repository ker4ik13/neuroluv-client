'use client';

import { useEffect } from 'react';

let activeLockCount = 0;
let restoreDocumentStyles: (() => void) | null = null;
let activeViewportLockCount = 0;
let restoreViewportLock: (() => void) | null = null;

const SCROLL_KEYS = new Set([
	' ',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'ArrowUp',
	'End',
	'Home',
	'PageDown',
	'PageUp',
]);
const NAVIGATION_KEYS = new Set([
	' ',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'ArrowUp',
	'End',
	'Home',
]);

function lockDocumentScroll(): () => void {
	const root = document.documentElement;
	const body = document.body;
	const previousRootOverflow = root.style.overflow;
	const previousRootOverscrollBehavior = root.style.overscrollBehavior;
	const previousBodyOverflow = body.style.overflow;
	const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
	const previousBodyPaddingRight = body.style.paddingRight;
	const scrollbarWidth = window.innerWidth - root.clientWidth;

	if (scrollbarWidth > 0) {
		const computedPaddingRight =
			Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
		body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
	}

	root.style.overflow = 'hidden';
	root.style.overscrollBehavior = 'none';
	body.style.overflow = 'hidden';
	body.style.overscrollBehavior = 'none';

	return () => {
		root.style.overflow = previousRootOverflow;
		root.style.overscrollBehavior = previousRootOverscrollBehavior;
		body.style.overflow = previousBodyOverflow;
		body.style.overscrollBehavior = previousBodyOverscrollBehavior;
		body.style.paddingRight = previousBodyPaddingRight;
	};
}

export function useBodyScrollLock(isLocked: boolean): void {
	useEffect(() => {
		if (!isLocked) {
			return;
		}

		activeLockCount += 1;

		if (activeLockCount === 1) {
			restoreDocumentStyles = lockDocumentScroll();
		}

		return () => {
			activeLockCount = Math.max(0, activeLockCount - 1);

			if (activeLockCount === 0) {
				restoreDocumentStyles?.();
				restoreDocumentStyles = null;
			}
		};
	}, [isLocked]);
}

function isEditableTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable ||
			target instanceof HTMLInputElement ||
			target instanceof HTMLSelectElement ||
			target instanceof HTMLTextAreaElement)
	);
}

function isNavigationKeyTarget(
	target: EventTarget | null,
	key: string,
): boolean {
	return (
		target instanceof HTMLElement &&
		NAVIGATION_KEYS.has(key) &&
		Boolean(target.closest('[data-viewport-scroll-lock-navigation]'))
	);
}

/**
 * Freezes the current viewport without changing document overflow. This keeps
 * sticky hover navigation geometrically stable while its dropdown is open.
 */
function lockViewportScroll(): () => void {
	const root = document.documentElement;
	const body = document.body;
	const lockedScrollX = window.scrollX;
	const lockedScrollY = window.scrollY;
	const previousRootOverscrollBehavior = root.style.overscrollBehavior;
	const previousRootScrollBehavior = root.style.scrollBehavior;
	const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
	let restoreFrame: number | null = null;

	root.style.overscrollBehavior = 'none';
	root.style.scrollBehavior = 'auto';
	body.style.overscrollBehavior = 'none';

	function preventScroll(event: Event) {
		event.preventDefault();
	}

	function preventKeyboardScroll(event: KeyboardEvent) {
		if (
			event.defaultPrevented ||
			event.ctrlKey ||
			event.metaKey ||
			event.altKey ||
			!SCROLL_KEYS.has(event.key) ||
			isEditableTarget(event.target) ||
			isNavigationKeyTarget(event.target, event.key)
		) {
			return;
		}

		event.preventDefault();
	}

	function restoreLockedPosition() {
		if (
			restoreFrame !== null ||
			(window.scrollX === lockedScrollX && window.scrollY === lockedScrollY)
		) {
			return;
		}

		restoreFrame = window.requestAnimationFrame(() => {
			restoreFrame = null;
			window.scrollTo(lockedScrollX, lockedScrollY);
		});
	}

	document.addEventListener('wheel', preventScroll, { passive: false });
	document.addEventListener('touchmove', preventScroll, { passive: false });
	document.addEventListener('keydown', preventKeyboardScroll, true);
	window.addEventListener('scroll', restoreLockedPosition, { passive: true });

	return () => {
		if (restoreFrame !== null) {
			window.cancelAnimationFrame(restoreFrame);
		}

		document.removeEventListener('wheel', preventScroll);
		document.removeEventListener('touchmove', preventScroll);
		document.removeEventListener('keydown', preventKeyboardScroll, true);
		window.removeEventListener('scroll', restoreLockedPosition);
		root.style.overscrollBehavior = previousRootOverscrollBehavior;
		root.style.scrollBehavior = previousRootScrollBehavior;
		body.style.overscrollBehavior = previousBodyOverscrollBehavior;
	};
}

export function useViewportScrollLock(isLocked: boolean): void {
	useEffect(() => {
		if (!isLocked) {
			return;
		}

		activeViewportLockCount += 1;

		if (activeViewportLockCount === 1) {
			restoreViewportLock = lockViewportScroll();
		}

		return () => {
			activeViewportLockCount = Math.max(0, activeViewportLockCount - 1);

			if (activeViewportLockCount === 0) {
				restoreViewportLock?.();
				restoreViewportLock = null;
			}
		};
	}, [isLocked]);
}

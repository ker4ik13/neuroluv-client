'use client';

import { useEffect } from 'react';

let activeLockCount = 0;
let restoreDocumentStyles: (() => void) | null = null;

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

'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

declare global {
	interface Window {
		__neuroluvTrackMatomoPage?: () => void;
	}
}

export function MatomoRouteTracker() {
	const pathname = usePathname();
	const query = useSearchParams().toString();
	useEffect(() => {
		// Read the committed DOM title; the bridge also deduplicates hydration and Strict Mode.
		const frame = window.requestAnimationFrame(() =>
			window.__neuroluvTrackMatomoPage?.(),
		);
		return () => window.cancelAnimationFrame(frame);
	}, [pathname, query]);
	return null;
}

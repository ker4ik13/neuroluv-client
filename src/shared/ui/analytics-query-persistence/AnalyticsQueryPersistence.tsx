'use client';

import { useEffect } from 'react';
import { preserveAnalyticsQueryInUrl } from '@/shared/lib/analytics/tracking-query';

export function AnalyticsQueryPersistence() {
	useEffect(() => {
		const originalPushState = window.history.pushState;
		const originalReplaceState = window.history.replaceState;

		window.history.pushState = function pushState(
			data: unknown,
			unused: string,
			url?: string | URL | null,
		) {
			return originalPushState.call(
				this,
				data,
				unused,
				preserveAnalyticsQueryInUrl(url, window.location.href),
			);
		};

		window.history.replaceState = function replaceState(
			data: unknown,
			unused: string,
			url?: string | URL | null,
		) {
			return originalReplaceState.call(
				this,
				data,
				unused,
				preserveAnalyticsQueryInUrl(url, window.location.href),
			);
		};

		function preserveAnchorQuery(event: Event) {
			const target = event.target;

			if (!(target instanceof Element)) {
				return;
			}

			const anchor = target.closest('a[href]');

			if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download')) {
				return;
			}

			const nextHref = preserveAnalyticsQueryInUrl(
				anchor.href,
				window.location.href,
			);

			if (typeof nextHref === 'string' && nextHref !== anchor.href) {
				anchor.href = nextHref;
			}
		}

		document.addEventListener('pointerdown', preserveAnchorQuery, true);
		document.addEventListener('click', preserveAnchorQuery, true);

		return () => {
			window.history.pushState = originalPushState;
			window.history.replaceState = originalReplaceState;
			document.removeEventListener('pointerdown', preserveAnchorQuery, true);
			document.removeEventListener('click', preserveAnchorQuery, true);
		};
	}, []);

	return null;
}

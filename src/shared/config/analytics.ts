import {
	buildMatomoBootstrap,
	DEFAULT_MATOMO_SITE_ID,
	DEFAULT_MATOMO_URL,
} from '@/shared/lib/analytics/matomo';
import {
	ATTRIBUTION_QUERY_PARAMETER_NAMES,
	METRIKA_ROUTE_QUERY_PARAMETER_NAMES,
} from '@/shared/lib/analytics/tracking-query';
import {
	DEFAULT_YANDEX_METRIKA_COUNTER_ID,
	resolveYandexMetrikaCounterId,
} from '@/shared/lib/analytics/yandex-metrika';

// These are public tracker settings, not dashboard/API credentials.
export const MATOMO_ORIGIN = new URL(DEFAULT_MATOMO_URL).origin;
export const MATOMO_BOOTSTRAP = buildMatomoBootstrap(
	{ url: DEFAULT_MATOMO_URL, siteId: DEFAULT_MATOMO_SITE_ID },
	ATTRIBUTION_QUERY_PARAMETER_NAMES,
	METRIKA_ROUTE_QUERY_PARAMETER_NAMES,
);

export const YANDEX_METRIKA_ID = resolveYandexMetrikaCounterId(
	process.env.YANDEX_METRIKA_ID,
	process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID,
	DEFAULT_YANDEX_METRIKA_COUNTER_ID,
);

const ATTRIBUTION_QUERY_PARAMETERS = new Set([
	'_openstat',
	'dclid',
	'fbclid',
	'from',
	'gbraid',
	'gclid',
	'msclkid',
	'ttclid',
	'wbraid',
	'yclid',
	'ymclid',
	'yqrid',
	'ysclid',
	'yzclid',
]);

const ANALYTICS_DIAGNOSTIC_QUERY_PARAMETERS = new Set(['_ym_debug']);

export function isAttributionQueryParameter(name: string): boolean {
	const normalizedName = name.toLowerCase();

	return (
		normalizedName.startsWith('utm_') ||
		normalizedName.startsWith('openstat_') ||
		ATTRIBUTION_QUERY_PARAMETERS.has(normalizedName)
	);
}

export function shouldPreserveAnalyticsQueryParameter(name: string): boolean {
	return (
		isAttributionQueryParameter(name) ||
		ANALYTICS_DIAGNOSTIC_QUERY_PARAMETERS.has(name.toLowerCase())
	);
}

export function getAttributionSearchParams(
	search: string | URLSearchParams,
): URLSearchParams {
	const source =
		typeof search === 'string' ? new URLSearchParams(search) : search;
	const result = new URLSearchParams();

	source.forEach((value, key) => {
		if (isAttributionQueryParameter(key)) {
			result.append(key, value);
		}
	});

	return result;
}

export function buildAttributionUrl(
	origin: string,
	pathname: string,
	search: string | URLSearchParams,
): string {
	const normalizedPathname = pathname.startsWith('/')
		? pathname
		: `/${pathname}`;
	const url = new URL(normalizedPathname || '/', origin);

	url.search = getAttributionSearchParams(search).toString();

	return url.href;
}

export function sanitizeAnalyticsReferrer(
	referrer: string,
	currentOrigin: string,
): string {
	if (!referrer) {
		return '';
	}

	try {
		const referrerUrl = new URL(referrer);
		const currentUrl = new URL(currentOrigin);

		if (!isNeuroluvSameSite(referrerUrl, currentUrl)) {
			return referrerUrl.href;
		}

		return buildAttributionUrl(
			referrerUrl.origin,
			referrerUrl.pathname,
			referrerUrl.search,
		);
	} catch {
		return '';
	}
}

function isNeuroluvSameSite(left: URL, right: URL): boolean {
	if (left.origin === right.origin) {
		return true;
	}

	return (
		isNeuroluvHostname(left.hostname) && isNeuroluvHostname(right.hostname)
	);
}

function isNeuroluvHostname(hostname: string): boolean {
	return hostname === 'neuroluv.ru' || hostname.endsWith('.neuroluv.ru');
}

const DEFAULT_DIRECTUS_URL = 'https://admin.neuroluv.ru';

export function resolveDirectusUrl(configuredUrl: string | undefined): string {
	let url: URL;
	try {
		url = new URL(configuredUrl?.trim() || DEFAULT_DIRECTUS_URL);
	} catch {
		throw new Error('NEXT_PUBLIC_DIRECTUS_URL must be an absolute HTTP(S) URL');
	}
	if (
		!['http:', 'https:'].includes(url.protocol) ||
		url.username ||
		url.password ||
		url.search ||
		url.hash
	) {
		throw new Error(
			'NEXT_PUBLIC_DIRECTUS_URL must be an HTTP(S) URL without credentials, query or fragment',
		);
	}
	return url.toString().replace(/\/+$/, '');
}

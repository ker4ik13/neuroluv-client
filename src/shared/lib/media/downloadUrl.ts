export function resolveMediaDownloadUrl(
	href: string,
	apiUrl: string,
	publicAssetOrigins: readonly string[],
): string {
	if (href.startsWith('blob:')) return href;
	try {
		const url = new URL(href.startsWith('/') ? `${apiUrl}${href}` : href);
		const base = new URL(apiUrl);
		const publicAssetId = url.pathname.match(
			/^\/assets\/([a-f0-9-]{36})$/iu,
		)?.[1];
		if (publicAssetId && publicAssetOrigins.includes(url.origin)) {
			return `${apiUrl}/media/catalog/${publicAssetId}/download`;
		}
		const path = url.pathname.slice(base.pathname.length);
		const allowedPath =
			path.startsWith('/media/') ||
			/^\/public\/shares\/[^/]+\/(?:download|content|preview)$/iu.test(path) ||
			/^\/public\/shares\/[^/]+\/references\/[a-f0-9-]{36}\/download$/iu.test(
				path,
			);
		return url.origin === base.origin &&
			url.pathname.startsWith(`${base.pathname}/`) &&
			allowedPath
			? url.toString()
			: '#';
	} catch {
		return '#';
	}
}

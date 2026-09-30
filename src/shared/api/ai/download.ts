import { AI_API_URL } from '@/shared/config/ai';
import { saveMediaBlob } from '@/shared/lib/dom/saveMediaBlob';
import { AiApiError, aiApiFetch } from './client';

export function resolveAiMediaUrl(href: string): string {
	if (href.startsWith('blob:')) return href;
	try {
		const url = new URL(href.startsWith('/') ? `${AI_API_URL}${href}` : href);
		const base = new URL(AI_API_URL);
		return url.origin === base.origin &&
			url.pathname.startsWith(`${base.pathname}/media/`)
			? url.toString()
			: '#';
	} catch {
		return '#';
	}
}

export async function downloadAiMedia(
	href: string,
	filename?: string,
): Promise<void> {
	let blob: Blob;
	let downloadName = filename;
	if (href.startsWith('blob:')) {
		const response = await fetch(href);
		if (!response.ok) throw new Error('Local media unavailable');
		blob = await response.blob();
	} else {
		const resolved = resolveAiMediaUrl(href);
		if (resolved === '#') {
			throw new AiApiError({
				title: 'Обновите страницу и повторите скачивание',
				status: 410,
				code: 'media_download_link_expired',
			});
		}
		const url = new URL(resolved);
		const base = new URL(AI_API_URL);
		downloadName = url.searchParams.get('filename') || downloadName;
		const path = `${url.pathname.slice(base.pathname.length)}${url.search}`;
		blob = await aiApiFetch<Blob>(path, {
			csrf: false,
			responseType: 'blob',
			timeoutMs: 180_000,
		});
	}
	saveMediaBlob(blob, downloadName || 'neuroluv-media');
}

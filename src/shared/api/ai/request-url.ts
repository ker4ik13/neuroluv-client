import { AI_API_URL } from '@/shared/config/ai';

export function getAiRequestUrl(path: string): string {
	// The existing Next development rewrite keeps browser API requests same-origin.
	// Production URLs and protected media validation are intentionally unchanged.
	const base =
		process.env.NODE_ENV === 'development' && typeof window !== 'undefined'
			? '/v1'
			: AI_API_URL;
	return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

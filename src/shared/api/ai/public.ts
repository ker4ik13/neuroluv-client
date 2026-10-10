import 'server-only';
import { AI_API_URL } from '@/shared/config/ai';
import type {
	AiApiEnvelope,
	AiBillingProducts,
	AiFaqItem,
	AiPageMetadata,
	AiPlan,
	AiPromptCatalog,
	AiPromptDetail,
	AiPublicShare,
} from './contracts';

const PUBLIC_FETCH_TIMEOUT_MS = 3_000;

export async function getAiPublicPlans(): Promise<AiPlan[]> {
	// Anonymous request: never cache a user's wallet, promo code or subscription.
	const products = await fetchAiPublic<AiBillingProducts>('/billing/products', {
		revalidateSeconds: 300,
		throwOnError: true,
	});
	return products?.plans ?? [];
}

type PublicFetchOptions = {
	revalidateSeconds?: number;
	throwOnError?: boolean;
};

export async function getAiPublicPromptCatalog(
	pageSize: 12 | 24 = 12,
): Promise<AiPromptCatalog | null> {
	return fetchAiPublic<AiPromptCatalog>(
		`/catalog/prompts?page=1&pageSize=${pageSize}&sort=newest`,
		{ revalidateSeconds: 300, throwOnError: true },
	);
}

export async function getAiPublicPrompt(
	slug: string,
): Promise<AiPromptDetail | null> {
	const payload = await fetchAiPublic<AiApiEnvelope<AiPromptDetail>>(
		`/catalog/prompts/${encodeURIComponent(slug)}`,
		{ revalidateSeconds: 300, throwOnError: true },
	);

	return payload?.data ?? null;
}

export async function getAiPageMetadata(
	path: string,
	locale: 'ru-RU' | 'en-US' = 'ru-RU',
): Promise<AiPageMetadata | null> {
	const payload = await fetchAiPublic<AiApiEnvelope<AiPageMetadata>>(
		`/catalog/page?path=${encodeURIComponent(path)}&locale=${encodeURIComponent(locale)}`,
	);
	return payload?.data ?? null;
}

export async function hasAiPublicPrompts(): Promise<boolean> {
	const catalog = await fetchAiPublic<AiPromptCatalog>(
		'/catalog/prompts?page=1&pageSize=1',
	);
	return Boolean(catalog && catalog.total > 0);
}

export async function hasAiPublicFaq(): Promise<boolean> {
	const faq = await fetchAiPublic<AiApiEnvelope<AiFaqItem[]>>('/catalog/faq');
	return Boolean(faq?.data.length);
}

export async function getAiIndexablePromptSlugs(): Promise<string[]> {
	const slugs: string[] = [];

	for (let page = 1; page <= 100; page += 1) {
		const catalog = await fetchAiPublic<AiPromptCatalog>(
			`/catalog/prompts?page=${page}&pageSize=100&sort=newest`,
			{ revalidateSeconds: 300 },
		);

		if (!catalog) break;
		slugs.push(
			...catalog.data
				.filter((prompt) => !prompt.seoNoindex)
				.map((prompt) => prompt.slug),
		);
		if (!catalog.hasMore) break;
	}

	return [...new Set(slugs)];
}

export async function getAiPublicShare(
	slug: string,
): Promise<{ data: AiPublicShare | null; status: number | null }> {
	try {
		const response = await fetch(
			`${AI_API_URL}/public/shares/${encodeURIComponent(slug)}`,
			{
				headers: { accept: 'application/json' },
				cache: 'no-store',
				signal: AbortSignal.timeout(PUBLIC_FETCH_TIMEOUT_MS),
			},
		);

		if (!response.ok) return { data: null, status: response.status };
		const payload = (await response.json()) as
			AiPublicShare | AiApiEnvelope<AiPublicShare>;
		return {
			data:
				'data' in payload && Object.keys(payload).length === 1
					? payload.data
					: (payload as AiPublicShare),
			status: response.status,
		};
	} catch {
		return { data: null, status: null };
	}
}

async function fetchAiPublic<T>(
	path: string,
	options: PublicFetchOptions = {},
): Promise<T | null> {
	try {
		const response = await fetch(`${AI_API_URL}${path}`, {
			headers: { accept: 'application/json' },
			next: { revalidate: options.revalidateSeconds ?? 60 },
			signal: AbortSignal.timeout(PUBLIC_FETCH_TIMEOUT_MS),
		});

		if (!response.ok) {
			if (options.throwOnError && response.status !== 404) {
				throw new Error(
					`AI public request failed with status ${response.status}`,
				);
			}

			return null;
		}
		return (await response.json()) as T;
	} catch (error) {
		if (options.throwOnError) {
			throw error;
		}

		return null;
	}
}

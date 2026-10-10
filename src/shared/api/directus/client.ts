import { DIRECTUS_TOKEN, DIRECTUS_URL } from '@/shared/config/directus';
import {
	type DirectusRequestOptions,
	type DirectusSearchQuery,
	executeDirectusRequest,
} from './transport';

export { DirectusApiError } from './transport';
export type { DirectusRequestOptions, DirectusSearchQuery } from './transport';

export async function directusRequest<T>(
	path: string,
	options: DirectusRequestOptions = {},
): Promise<T> {
	return executeDirectusRequest<T>({
		baseUrl: DIRECTUS_URL,
		authToken: options.token ?? DIRECTUS_TOKEN,
		method: 'GET',
		options,
		path,
	});
}

export async function directusSearch<T>(
	collection: string,
	query: DirectusSearchQuery,
	options: DirectusRequestOptions = {},
): Promise<T> {
	if (!/^[a-z0-9_]+$/i.test(collection)) {
		throw new TypeError(`Invalid Directus collection: ${collection}`);
	}
	return executeDirectusRequest<T>({
		baseUrl: DIRECTUS_URL,
		authToken: options.token ?? DIRECTUS_TOKEN,
		body: JSON.stringify({ query }),
		method: 'SEARCH',
		options,
		path: `/items/${collection}`,
	});
}

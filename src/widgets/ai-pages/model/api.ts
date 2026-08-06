'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAiLocale, withAiLocale } from '@/features/ai-locale';
import {
	type AiApiEnvelope,
	AiApiError,
	aiApiFetch,
	aiApiFetchCached,
	invalidateAiApiCache,
	readAiApiCache,
} from '@/shared/api/ai';

export type ResourceState<T> = {
	data: T | null;
	error: string | null;
	errorStatus: number | null;
	isLoading: boolean;
	reload: () => void;
	refresh: () => Promise<T | null>;
	update: (updater: (current: T | null) => T | null) => void;
};

type ResourceOptions<T> = {
	cacheTtlMs?: number;
	merge?: (current: T | null, incoming: T) => T;
	revalidateInitial?: boolean;
};

const resourceRefreshControllers = new WeakMap<
	object,
	AbortController
>();

export function unwrapAiData<T>(payload: T | AiApiEnvelope<T>): T {
	if (
		typeof payload === 'object' &&
		payload !== null &&
		'data' in payload &&
		Object.keys(payload).length === 1
	) {
		return (payload as AiApiEnvelope<T>).data;
	}

	return payload as T;
}

export function useAiResource<T>(
	path: string | null,
	initialData: T | null = null,
	options: ResourceOptions<T> = {},
): ResourceState<T> {
	const { locale } = useAiLocale();
	const localizedPath = path ? withAiLocale(path, locale) : null;
	const cacheTtlMs = options.cacheTtlMs ?? 0;
	const merge = options.merge;
	const revalidateInitial = options.revalidateInitial ?? false;
	const cachedPayload =
		localizedPath && cacheTtlMs > 0
			? readAiApiCache<T | AiApiEnvelope<T>>(localizedPath)
			: undefined;
	const cachedData =
		cachedPayload === undefined ? undefined : unwrapAiData(cachedPayload);
	const resolvedInitialData = initialData ?? cachedData ?? null;
	const [data, setData] = useState<T | null>(resolvedInitialData);
	const [error, setError] = useState<string | null>(null);
	const [errorStatus, setErrorStatus] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState(
		Boolean(localizedPath) && resolvedInitialData === null,
	);
	const [requestVersion, setRequestVersion] = useState(0);
	const hasData = useRef(resolvedInitialData !== null);
	const mergeRef = useRef(merge);

	useEffect(() => {
		mergeRef.current = merge;
	}, [merge]);

	const reload = useCallback(() => {
		if (localizedPath && cacheTtlMs > 0) invalidateAiApiCache(localizedPath);
		setRequestVersion((current) => current + 1);
	}, [cacheTtlMs, localizedPath]);
	const update = useCallback((updater: (current: T | null) => T | null) => {
		setData(updater);
	}, []);
	const refresh = async () => {
		if (!localizedPath) return null;

		resourceRefreshControllers.get(hasData)?.abort();
		const controller = new AbortController();
		resourceRefreshControllers.set(hasData, controller);
		try {
			const payload = await aiApiFetch<T | AiApiEnvelope<T>>(localizedPath, {
				signal: controller.signal,
			});
			if (controller.signal.aborted) return null;
			hasData.current = true;
			const incoming = unwrapAiData(payload);
			setData((current) =>
				mergeRef.current ? mergeRef.current(current, incoming) : incoming,
			);
			setError(null);
			setErrorStatus(null);
			return incoming;
		} catch (requestError) {
			if (controller.signal.aborted) return null;
			if (!hasData.current) {
				setError(getAiErrorMessage(requestError));
				setErrorStatus(
					requestError instanceof AiApiError
						? requestError.problem.status
						: null,
					);
			}
			return null;
		} finally {
			if (resourceRefreshControllers.get(hasData) === controller) {
				resourceRefreshControllers.delete(hasData);
			}
		}
	};

	useEffect(() => {
		const abortRefresh = () => {
			resourceRefreshControllers.get(hasData)?.abort();
			resourceRefreshControllers.delete(hasData);
		};
		abortRefresh();

		if (!localizedPath) {
			return;
		}
		if (
			initialData !== null &&
			requestVersion === 0 &&
			!revalidateInitial
		) {
			return abortRefresh;
		}

		const controller = new AbortController();
		let active = true;

		queueMicrotask(() => {
			if (active) {
				if (!hasData.current) setIsLoading(true);
				setError(null);
				setErrorStatus(null);
			}
		});

		const request =
			cacheTtlMs > 0
				? aiApiFetchCached<T | AiApiEnvelope<T>>(localizedPath, cacheTtlMs)
				: aiApiFetch<T | AiApiEnvelope<T>>(localizedPath, {
						signal: controller.signal,
					});

		request
			.then((payload) => {
				if (active) {
					hasData.current = true;
					const incoming = unwrapAiData(payload);
					setData((current) =>
						mergeRef.current ? mergeRef.current(current, incoming) : incoming,
					);
				}
			})
			.catch((requestError: unknown) => {
				if (!active || controller.signal.aborted) {
					return;
				}

				setError(getAiErrorMessage(requestError));
				setErrorStatus(
					requestError instanceof AiApiError
						? requestError.problem.status
						: null,
				);
			})
			.finally(() => {
				if (active) {
					setIsLoading(false);
				}
			});

		return () => {
			active = false;
			controller.abort();
			abortRefresh();
		};
	}, [
		cacheTtlMs,
		initialData,
		localizedPath,
		requestVersion,
		revalidateInitial,
	]);

	return { data, error, errorStatus, isLoading, reload, refresh, update };
}

export function getAiErrorMessage(error: unknown): string {
	if (error instanceof AiApiError) {
		if (
			error.problem.code === 'service_unavailable' ||
			error.problem.code === 'request_timeout'
		) {
			return error.problem.title;
		}
		return error.problem.detail || error.problem.title;
	}

	return error instanceof Error
		? error.message
		: 'Произошла неизвестная ошибка';
}

export function toQueryString(
	values: Record<string, string | number | undefined>,
): string {
	const query = new URLSearchParams();

	Object.entries(values).forEach(([key, value]) => {
		if (value !== undefined && value !== '') {
			query.set(key, String(value));
		}
	});

	const serialized = query.toString();
	return serialized ? `?${serialized}` : '';
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type AiApiEnvelope, AiApiError, aiApiFetch } from '@/shared/api/ai';

export type ResourceState<T> = {
	data: T | null;
	error: string | null;
	errorStatus: number | null;
	isLoading: boolean;
	reload: () => void;
	update: (updater: (current: T | null) => T | null) => void;
};

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

export function useAiResource<T>(path: string | null, initialData: T | null = null): ResourceState<T> {
	const [data, setData] = useState<T | null>(initialData);
	const [error, setError] = useState<string | null>(null);
	const [errorStatus, setErrorStatus] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState(Boolean(path) && initialData === null);
	const [requestVersion, setRequestVersion] = useState(0);
	const hasData = useRef(initialData !== null);

	const reload = useCallback(() => {
		setRequestVersion((current) => current + 1);
	}, []);
	const update = useCallback((updater: (current: T | null) => T | null) => {
		setData(updater);
	}, []);

	useEffect(() => {
		if (!path) {
			return;
		}
		if (initialData !== null && requestVersion === 0) {
			return;
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

		aiApiFetch<T | AiApiEnvelope<T>>(path, { signal: controller.signal })
			.then((payload) => {
				if (active) {
					hasData.current = true;
					setData(unwrapAiData(payload));
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
		};
	}, [initialData, path, requestVersion]);

	return { data, error, errorStatus, isLoading, reload, update };
}

export function getAiErrorMessage(error: unknown): string {
	if (error instanceof AiApiError) {
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

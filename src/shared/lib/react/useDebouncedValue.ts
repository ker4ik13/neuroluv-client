'use client';

import { useEffect, useState } from 'react';

export function useDebouncedValue<Value>(value: Value, delayMs: number): Value {
	const [debouncedValue, setDebouncedValue] = useState(value);
	const normalizedDelay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0;

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setDebouncedValue(value);
		}, normalizedDelay);

		return () => window.clearTimeout(timeoutId);
	}, [normalizedDelay, value]);

	return debouncedValue;
}

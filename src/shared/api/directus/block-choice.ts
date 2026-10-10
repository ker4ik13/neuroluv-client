export function normalizeBlockChoice<const T extends string>(
	value: string | null | undefined,
	choices: readonly T[],
	fallback: T,
): T {
	return choices.find((choice) => choice === value) || fallback;
}

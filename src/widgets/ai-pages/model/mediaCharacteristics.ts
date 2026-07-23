export type MediaSize = {
	width: number;
	height: number;
};

const STANDARD_ASPECT_RATIOS = [
	{ label: '9:16', value: 9 / 16 },
	{ label: '2:3', value: 2 / 3 },
	{ label: '3:4', value: 3 / 4 },
	{ label: '4:5', value: 4 / 5 },
	{ label: '1:1', value: 1 },
	{ label: '5:4', value: 5 / 4 },
	{ label: '4:3', value: 4 / 3 },
	{ label: '3:2', value: 3 / 2 },
	{ label: '16:9', value: 16 / 9 },
	{ label: '21:9', value: 21 / 9 },
] as const;

export function normalizeMediaDimension(
	value: number | null | undefined,
): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		return null;
	}

	return Math.round(value);
}

export function formatMediaCharacteristics(
	size: MediaSize | null,
	configuredAspectRatio?: string | null,
): string | null {
	if (!size) return null;

	const normalizedConfiguredRatio = normalizeAspectRatio(configuredAspectRatio);
	if (normalizedConfiguredRatio) {
		return `${size.width} × ${size.height} px · ${normalizedConfiguredRatio}`;
	}

	const ratio = size.width / size.height;
	const aspectRatio = STANDARD_ASPECT_RATIOS.reduce((closest, candidate) =>
		Math.abs(Math.log(ratio / candidate.value)) <
		Math.abs(Math.log(ratio / closest.value))
			? candidate
			: closest,
	);
	return `${size.width} × ${size.height} px · ${aspectRatio.label}`;
}

function normalizeAspectRatio(value: string | null | undefined): string | null {
	if (!value) return null;
	const match = value.trim().match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/u);
	if (!match) return null;
	const width = Number(match[1]);
	const height = Number(match[2]);
	return width > 0 && height > 0 ? `${match[1]}:${match[2]}` : null;
}

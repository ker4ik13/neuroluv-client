/** Material blocks use a read-only SEARCH body, not an oversized GET target. */
export function buildMaterialDetailQuery(
	fields: string,
	slug: string,
	previewEnabled = false,
) {
	return {
		fields: fields.split(',').filter(Boolean),
		limit: 1,
		filter: {
			...(previewEnabled ? {} : { status: { _eq: 'published' } }),
			slug: { _eq: slug },
		},
	};
}

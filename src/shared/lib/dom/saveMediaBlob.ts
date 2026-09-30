export function saveMediaBlob(blob: Blob, filename: string): void {
	if (
		!blob.size ||
		(/(?:xml|json|html)/iu.test(blob.type) && !blob.type.startsWith('image/'))
	) {
		throw new Error('Invalid media download');
	}
	const objectUrl = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = objectUrl;
	const extension = (
		{
			'image/png': 'png',
			'image/jpeg': 'jpg',
			'image/webp': 'webp',
			'image/gif': 'gif',
			'image/avif': 'avif',
			'image/svg+xml': 'svg',
		} as Record<string, string>
	)[blob.type];
	anchor.download =
		extension && !/\.[a-z0-9]{1,8}$/iu.test(filename)
			? `${filename}.${extension}`
			: filename;
	anchor.style.display = 'none';
	document.body.append(anchor);
	try {
		anchor.click();
	} finally {
		anchor.remove();
		// Safari may consume the object URL asynchronously after the click.
		setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
	}
}

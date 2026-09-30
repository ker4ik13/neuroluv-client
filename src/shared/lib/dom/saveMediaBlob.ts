export function saveMediaBlob(blob: Blob, filename: string): void {
	if (!blob.size || /(?:xml|json|html)/iu.test(blob.type)) {
		throw new Error('Invalid media download');
	}
	const objectUrl = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = objectUrl;
	anchor.download = filename;
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

/** Empty WYSIWYG paragraphs are editor spacing, not readable content. */
export function normalizeRichTextSpacing(html: string): string {
	return html.replace(
		/<pre\b[^>]*>[\s\S]*?<\/pre>|<code\b[^>]*>[\s\S]*?<\/code>|<p\b[^>]*>(?:\s|&nbsp;|\u00a0|<br\s*\/?\s*>)*<\/p>/gi,
		(match) => (/^<(?:pre|code)\b/i.test(match) ? match : ''),
	);
}

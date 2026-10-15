/** Prefer an editor's description, but never announce an uploaded file's name. */
export function getImageAlt(
	...candidates: Array<string | null | undefined>
): string {
	for (const candidate of candidates) {
		const text = candidate?.replace(/\s+/gu, ' ').trim();
		if (text && !isTechnicalImageTitle(text)) return text;
	}

	return 'Иллюстрация к материалу';
}

function isTechnicalImageTitle(text: string): boolean {
	return (
		/\.(?:avif|bmp|gif|heic|ico|jpe?g|png|svg|tiff?|webp|mp4|webm|mov)(?:\s*\(\d+\))?$/iu.test(
			text,
		) ||
		/^(?:https?:|data:|blob:|\/)/iu.test(text) ||
		/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu.test(text) ||
		/^[\da-f]{24,}$/iu.test(text) ||
		/^\d[\d\s_.-]*$/u.test(text) ||
		/^(?:image|img|dsc|dscn|pxl|photo|picture|screenshot|untitled|изображение|фото|скриншот)(?:[\s_().-]*\d[\d\s_().:-]*)?$/iu.test(
			text,
		) ||
		/^(?:chat\s*gpt\s*image|generated\s*image|gemini\s*generated\s*image|whatsapp\s*image|telegram\s*photo)\b/iu.test(
			text,
		) ||
		/^(?:hero|cta|промпт|карточка|статья|новость|преимущество|иллюстрация(?: к (?:материалу|статье|новости|промпту))?)$/iu.test(
			text,
		)
	);
}

const HTML_TOKENS =
	/<!--[\s\S]*?-->|<(script|style|pre|code)\b[^>]*>[\s\S]*?<\/\1\s*>|<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]\s*>|<\/?[a-z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/gi;
const VOID_TAGS = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]);

/** Add contextual alternatives to WYSIWYG images without rewriting the HTML. */
export function normalizeImageAlts(
	html: string,
	contextTitle?: string,
): string {
	let heading = contextTitle;
	const ancestors: Array<{ tag: string; hidden: boolean; caption?: string }> =
		[];

	return html.replace(HTML_TOKENS, (token, _rawTag: string, offset: number) => {
		if (/^<!--|^<(?:script|style|pre|code)\b/i.test(token)) return token;
		if (/^<h[1-6]\b/i.test(token)) {
			heading = plainText(token);
			return token;
		}
		const tag = /^<\/?([a-z][\w:-]*)/i.exec(token)?.[1]?.toLowerCase();
		if (!tag) return token;
		if (token.startsWith('</')) {
			const index = ancestors.findLastIndex((ancestor) => ancestor.tag === tag);
			if (index !== -1) ancestors.length = index;
			return token;
		}

		const attributes = readAttributes(token);
		const hidden =
			ancestors.some((ancestor) => ancestor.hidden) ||
			attributes.get('aria-hidden')?.value === 'true' ||
			attributes.has('hidden') ||
			attributes.has('inert');
		if (tag !== 'img') {
			if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(token)) {
				const figure =
					tag === 'figure'
						? html.slice(offset + token.length).split(/<\/figure\s*>/i, 1)[0]
						: undefined;
				const caption = figure?.match(
					/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption\s*>/i,
				)?.[1];
				ancestors.push({
					tag,
					hidden,
					caption: caption ? plainText(caption) : undefined,
				});
			}
			return token;
		}

		const decorative =
			hidden ||
			/^(?:none|presentation)$/i.test(attributes.get('role')?.value || '');
		const currentAlt = attributes.get('alt');
		const caption = ancestors.findLast((ancestor) => ancestor.caption)?.caption;
		const alt = decorative
			? ''
			: getImageAlt(
					currentAlt?.value,
					attributes.get('title')?.value,
					caption,
					heading,
					contextTitle,
				);
		if (currentAlt?.value === alt) return token;
		const attribute = ` alt="${escapeAttribute(alt)}"`;
		return currentAlt
			? token.slice(0, currentAlt.start) +
					attribute +
					token.slice(currentAlt.end)
			: token.replace(/\s*\/?>$/, (ending: string) => attribute + ending);
	});
}

function readAttributes(tag: string) {
	const attributes = new Map<
		string,
		{ value: string; start: number; end: number }
	>();
	const pattern =
		/\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
	for (const match of tag.matchAll(pattern)) {
		attributes.set(match[1].toLowerCase(), {
			value: decodeEntities(match[2] ?? match[3] ?? match[4] ?? ''),
			start: match.index,
			end: match.index + match[0].length,
		});
	}
	return attributes;
}

function plainText(html: string): string {
	return decodeEntities(html.replace(/<[^>]*>/g, ' '))
		.replace(/\s+/gu, ' ')
		.trim();
}

function decodeEntities(text: string): string {
	const named: Record<string, string> = {
		amp: '&',
		quot: '"',
		apos: "'",
		lt: '<',
		gt: '>',
		nbsp: ' ',
		mdash: '—',
		ndash: '–',
		hellip: '…',
		laquo: '«',
		raquo: '»',
	};
	return text.replace(
		/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp|mdash|ndash|hellip|laquo|raquo);/gi,
		(entity, name: string) => {
			if (!name.startsWith('#')) return named[name.toLowerCase()] || entity;
			const code =
				name[1]?.toLowerCase() === 'x'
					? parseInt(name.slice(2), 16)
					: parseInt(name.slice(1), 10);
			return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
				? String.fromCodePoint(code)
				: entity;
		},
	);
}

function escapeAttribute(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

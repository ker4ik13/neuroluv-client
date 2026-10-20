import type {
	CookieAcknowledgement,
	CookieSettings,
	NoticeHistory,
	SiteNotice,
} from './types';

/** Stable content revision: editing a title or buttons permits a new display. */
export function contentRevision(value: unknown): string {
	const text = JSON.stringify(value) ?? '';
	let hash = 2166136261;
	for (let index = 0; index < text.length; index++) {
		hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
	}
	return (hash >>> 0).toString(36);
}

export function noticeRevision(notice: SiteNotice): string {
	return contentRevision([
		notice.version,
		notice.title,
		notice.text,
		notice.badge,
		notice.benefits,
		notice.footnote,
		notice.image,
		notice.buttons,
	]);
}

export function cookieRevision(settings: CookieSettings): string {
	return contentRevision([
		settings.version,
		settings.title,
		settings.text,
		settings.policyUrl,
		settings.policyLabel,
		settings.acceptLabel,
	]);
}

export function currentCookieAcknowledgement(
	raw: string | null,
	revision: string,
): CookieAcknowledgement | null {
	try {
		const choice: unknown = JSON.parse(raw || 'null');
		if (
			choice &&
			typeof choice === 'object' &&
			'revision' in choice &&
			choice.revision === revision &&
			'at' in choice &&
			typeof choice.at === 'number' &&
			Number.isFinite(choice.at)
		)
			return choice as CookieAcknowledgement;
	} catch {
		/* Invalid/stale storage shows the information notice again. */
	}
	return null;
}

export function parseNoticeHistory(raw: string | null): NoticeHistory {
	try {
		const parsed: unknown = JSON.parse(raw || '{}');
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
			return {};
		return Object.fromEntries(
			Object.entries(parsed).filter(
				([, entry]) =>
					entry &&
					typeof entry === 'object' &&
					typeof entry.revision === 'string' &&
					typeof entry.at === 'number' &&
					Number.isFinite(entry.at) &&
					typeof entry.session === 'string',
			),
		);
	} catch {
		return {};
	}
}

export function matchesNoticePath(pathname: string, pattern: string): boolean {
	const path = pathname.replace(/\/+$/, '') || '/';
	const rule = pattern.trim().replace(/\/+$/, '') || '/';
	if (!rule.startsWith('/') || rule.includes('?') || rule.includes('#'))
		return false;
	if (rule === '/*') return true;
	if (rule.endsWith('/*') && path === rule.slice(0, -2)) return true;
	const expression = rule
		.split('*')
		.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
		.join('.*');
	return new RegExp(`^${expression}$`).test(path);
}

export function isWorkspacePath(path: string): boolean {
	return /^\/ai\/(?:auth|create|balance|profile|works|history|share|tools|referrals)(?:\/|$)|^\/ai\/prompts\/[^/]+/.test(
		path,
	);
}

export function isNoticeEligible(
	notice: SiteNotice,
	path: string,
	now: number,
): boolean {
	if (!notice.allowWorkspace && isWorkspacePath(path)) return false;
	if (notice.startsAt && Date.parse(notice.startsAt) > now) return false;
	if (notice.endsAt && Date.parse(notice.endsAt) <= now) return false;
	return (
		notice.includePaths.some((pattern) => matchesNoticePath(path, pattern)) &&
		!notice.excludePaths.some((pattern) => matchesNoticePath(path, pattern))
	);
}

export function noticeTriggerReached(
	notice: SiteNotice,
	seconds: number,
	screens: number,
	mobile: boolean,
): boolean {
	const delay = seconds >= notice.delaySeconds;
	const scroll =
		screens >= (mobile ? notice.scrollMobile : notice.scrollDesktop);
	switch (notice.trigger) {
		case 'delay':
			return delay;
		case 'scroll':
			return scroll;
		case 'either':
			return delay || scroll;
		case 'both':
			return delay && scroll;
		default:
			return false;
	}
}

export function canRepeatNotice(
	notice: SiteNotice,
	history: NoticeHistory,
	session: string,
	now: number,
): boolean {
	const previous = history[notice.id];
	if (!previous || previous.revision !== noticeRevision(notice)) return true;
	if (notice.frequency === 'session') return previous.session !== session;
	if (notice.frequency === 'days')
		return now - previous.at >= notice.repeatDays * 86400000;
	return false;
}

export function safeNoticeUrl(value: unknown): string {
	if (typeof value !== 'string') return '';
	const url = value.trim();
	if (/[\u0000-\u0020\\]/u.test(url) || url.startsWith('//')) return '';
	return /^(?:\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(url) ? url : '';
}

export function modalHref(id: string): string {
	return `#modal=${encodeURIComponent(id)}`;
}

/** Existing CMS buttons can target a selected modal without a dummy URL. */
export function noticeButtonHref(button: {
	modal?: string | null;
	url?: string | null;
}): string {
	return button.modal ? modalHref(button.modal) : safeNoticeUrl(button.url);
}

export function modalFromHash(hash: string): string | null {
	if (!hash.startsWith('#modal=')) return null;
	try {
		return decodeURIComponent(hash.slice(7)) || null;
	} catch {
		return null;
	}
}

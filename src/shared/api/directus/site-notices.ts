import { directusRequest, directusSearch } from '@/shared/api/directus/client';
import { buildDirectusAssetUrl } from '@/shared/config/directus';
import { getImageAlt } from '@/shared/lib/media/image-alt';
import { safeNoticeUrl } from '@/shared/lib/site-notices/policy';
import {
	type CookieSettings,
	DEFAULT_COOKIE_SETTINGS,
	type NoticeButton,
	type SiteNotice,
	type SiteNoticesConfig,
} from '@/shared/lib/site-notices/types';

type RecordData = Record<string, unknown>;
const NOTICE_FIELDS = [
	'id',
	'key',
	'kind',
	'title',
	'text',
	'badge',
	'benefits',
	'footnote',
	'image.id',
	'image.title',
	'image.type',
	'image.width',
	'image.height',
	'image.modified_on',
	'image_alt',
	'buttons.id',
	'buttons.sort',
	'buttons.label',
	'buttons.action',
	'buttons.url',
	'buttons.modal',
	'buttons.variant',
	'buttons.new_tab',
	'trigger',
	'delay_seconds',
	'scroll_desktop',
	'scroll_mobile',
	'include_paths',
	'exclude_paths',
	'allow_workspace',
	'priority',
	'frequency',
	'repeat_days',
	'version',
	'starts_at',
	'ends_at',
];
const COOKIE_FIELDS = [
	'enabled',
	'title',
	'text',
	'policy_url',
	'policy_label',
	'accept_label',
	'version',
];

function object(value: unknown): RecordData {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as RecordData)
		: {};
}
function text(value: unknown, fallback = ''): string {
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
function strings(value: unknown, fallback: string[] = []): string[] {
	return Array.isArray(value)
		? value
				.filter((item): item is string => typeof item === 'string')
				.map((s) => s.trim())
				.filter(Boolean)
		: fallback;
}
function number(value: unknown, fallback: number, min = 0): number {
	const parsed = value === null || value === '' ? NaN : Number(value);
	return Number.isFinite(parsed) ? Math.max(min, parsed) : fallback;
}
function choice<T extends string>(
	value: unknown,
	allowed: readonly T[],
	fallback: T,
): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}
function date(value: unknown): string | null {
	return typeof value === 'string' && Number.isFinite(Date.parse(value))
		? value
		: null;
}

function normalizeButton(value: unknown): NoticeButton | null {
	const item = object(value);
	const label = text(item.label);
	const action = choice(item.action, ['link', 'modal', 'close'], 'link');
	const href = safeNoticeUrl(item.url);
	const modal = text(item.modal);
	if (!label || (action === 'link' && !href) || (action === 'modal' && !modal))
		return null;
	return {
		id: String(item.id),
		label,
		action,
		href,
		modal,
		variant: choice(item.variant, ['primary', 'secondary', 'ghost'], 'primary'),
		newTab: item.new_tab === true,
	};
}

export function normalizeSiteNotice(value: unknown): SiteNotice | null {
	const item = object(value);
	const title = text(item.title);
	const key = text(item.key);
	if (
		!title ||
		!key ||
		!item.id ||
		!['modal', 'floating'].includes(String(item.kind))
	)
		return null;
	const image = object(item.image);
	const buttons = Array.isArray(item.buttons)
		? [...item.buttons]
				.sort((a, b) => number(object(a).sort, 0) - number(object(b).sort, 0))
				.map(normalizeButton)
				.filter((b): b is NoticeButton => b !== null)
		: [];
	return {
		id: String(item.id),
		key,
		kind: item.kind as SiteNotice['kind'],
		title,
		text: text(item.text),
		badge: text(item.badge),
		benefits: strings(item.benefits),
		footnote: text(item.footnote),
		image: image.id
			? {
					url: buildDirectusAssetUrl(String(image.id), {
						type: text(image.type),
					}),
					alt: getImageAlt(text(item.image_alt), text(image.title), title),
					width: number(image.width, 0) || null,
					height: number(image.height, 0) || null,
				}
			: null,
		buttons,
		trigger: choice(
			item.trigger,
			['manual', 'delay', 'scroll', 'either', 'both'],
			'manual',
		),
		delaySeconds: number(item.delay_seconds, 20),
		scrollDesktop: number(item.scroll_desktop, 2),
		scrollMobile: number(item.scroll_mobile, 2),
		includePaths: strings(item.include_paths, ['/*']),
		excludePaths: strings(item.exclude_paths),
		allowWorkspace: item.allow_workspace === true,
		priority: number(item.priority, 0),
		frequency: choice(
			item.frequency,
			['version', 'session', 'days'],
			'version',
		),
		repeatDays: number(item.repeat_days, 7, 1),
		version: `${text(item.version, '1')}:${text(image.modified_on)}`,
		startsAt: date(item.starts_at),
		endsAt: date(item.ends_at),
	};
}

export function normalizeCookieSettings(value: unknown): CookieSettings {
	const item = object(value);
	return {
		enabled: item.enabled !== false,
		title: text(item.title, DEFAULT_COOKIE_SETTINGS.title),
		text: text(item.text, DEFAULT_COOKIE_SETTINGS.text),
		policyUrl:
			safeNoticeUrl(item.policy_url) || DEFAULT_COOKIE_SETTINGS.policyUrl,
		policyLabel: text(item.policy_label, DEFAULT_COOKIE_SETTINGS.policyLabel),
		acceptLabel: text(item.accept_label, DEFAULT_COOKIE_SETTINGS.acceptLabel),
		version: text(item.version, '1'),
	};
}

export async function getSiteNotices(
	strict = false,
): Promise<SiteNoticesConfig> {
	const results = await Promise.allSettled([
		directusSearch<unknown[]>(
			'site_notices',
			{
				fields: NOTICE_FIELDS,
				filter: { status: { _eq: 'published' } },
				sort: ['-priority', 'id'],
				limit: -1,
			},
			{ next: { revalidate: 30 } },
		),
		directusRequest<unknown>(
			`/items/site_cookie_settings?fields=${COOKIE_FIELDS.join(',')}`,
			{ next: { revalidate: 30 } },
		),
	]);
	if (strict && results.some((result) => result.status === 'rejected'))
		throw new Error('Site notices configuration unavailable');
	for (const result of results)
		if (result.status === 'rejected')
			console.warn(
				'[Site notices] CMS configuration unavailable; safe defaults used.',
				{ status: result.reason?.status || 'network' },
			);
	const notices =
		results[0].status === 'fulfilled' && Array.isArray(results[0].value)
			? results[0].value
					.map(normalizeSiteNotice)
					.filter((n): n is SiteNotice => n !== null)
			: [];
	return {
		notices,
		cookies: normalizeCookieSettings(
			results[1].status === 'fulfilled' ? results[1].value : null,
		),
	};
}

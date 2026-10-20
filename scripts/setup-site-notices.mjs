import { mkdtemp, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

try {
	process.loadEnvFile(process.env.NOTICES_ENV_FILE || '.env');
} catch (error) {
	if (error.code !== 'ENOENT') throw error;
}
const base = (
	process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://admin.neuroluv.ru'
).replace(/\/+$/, '');
const token =
	process.env.DIRECTUS_TOKEN || process.env.PROD_DIRECTUS_CODEX_TOKEN;
if (!token)
	throw new Error(
		'An administrator Directus token is required in the environment.',
	);
const apply = process.argv.includes('--apply');
async function request(path, body, method = 'POST') {
	const response = await fetch(base + path, {
		method: body === undefined ? 'GET' : method,
		headers: {
			authorization: `Bearer ${token}`,
			...(body === undefined ? {} : { 'content-type': 'application/json' }),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
		signal: AbortSignal.timeout(30000),
	});
	const json = await response.json().catch(() => null);
	if (!response.ok)
		throw new Error(
			`Directus ${path}: ${response.status} (${json?.errors?.[0]?.extensions?.code || 'request failed'})`,
		);
	return json?.data;
}
const all = await request('/collections');
const names = new Set(all.map((item) => item.collection));
const heroFields = await request('/fields/hero_buttons');
console.log(
	JSON.stringify({
		origin: new URL(base).origin,
		mode: apply ? 'apply' : 'dry-run',
		add: [
			'site_engagement',
			'site_notices',
			'site_notice_buttons',
			'site_cookie_settings',
		].filter((name) => !names.has(name)),
		heroModalFieldExists: heroFields.some((field) => field.field === 'modal'),
	}),
);
if (!apply) process.exit(0);
const backup = await mkdtemp(
	join(dirname(process.cwd()), '.site-notices-schema-backup-'),
);
await writeFile(
	join(backup, 'before.json'),
	JSON.stringify(
		{
			at: new Date().toISOString(),
			collections: all.filter((c) =>
				/site_notices|site_notice_buttons|site_cookie_settings|hero_buttons/.test(
					c.collection,
				),
			),
			heroFields,
		},
		null,
		2,
	),
	{ mode: 0o600 },
);

const choices = (entries) => entries.map(([value, text]) => ({ value, text }));
function field(field, type, label, options = {}) {
	const {
		defaultValue,
		required = false,
		interface: control = 'input',
		values,
		note,
		group,
		...rest
	} = options;
	return {
		field,
		type,
		schema: {
			is_nullable: !required,
			...(defaultValue === undefined ? {} : { default_value: defaultValue }),
		},
		meta: {
			translations: [{ language: 'ru-RU', translation: label }],
			interface: control,
			required,
			...(values ? { options: { choices: choices(values) } } : {}),
			...(note ? { note } : {}),
			...(group ? { group } : {}),
			...rest,
		},
	};
}
const uuid = () => ({
	field: 'id',
	type: 'uuid',
	schema: { is_primary_key: true },
	meta: { special: ['uuid'], hidden: true, readonly: true, interface: 'input' },
});
const list = (key, title, defaults, note) =>
	field(key, 'json', title, {
		interface: 'tags',
		special: ['cast-json'],
		defaultValue: JSON.stringify(defaults),
		note,
	});
const alias = (key, title) => ({
	field: key,
	type: 'alias',
	meta: {
		interface: 'group-detail',
		special: ['alias', 'no-data', 'group'],
		translations: [{ language: 'ru-RU', translation: title }],
		options: { start: 'open' },
	},
});
async function collection(collection, title, icon, fields, extra = {}) {
	if (names.has(collection)) return;
	await request('/collections', {
		collection,
		schema: fields ? {} : null,
		meta: {
			icon,
			group:
				collection === 'site_engagement' ? 'group_settings' : 'site_engagement',
			translations: [{ language: 'ru-RU', translation: title }],
			...extra,
		},
		...(fields ? { fields } : {}),
	});
	names.add(collection);
}
await collection(
	'site_engagement',
	'Всплывающие блоки и cookies',
	'notifications_active',
);
await collection(
	'site_notices',
	'Модалки и плавающие CTA',
	'web_asset',
	[
		uuid(),
		field('status', 'string', 'Статус', {
			interface: 'select-dropdown',
			defaultValue: 'draft',
			values: [
				['draft', 'Черновик'],
				['published', 'Опубликовано'],
			],
			required: true,
		}),
		field('name', 'string', 'Название в админке', { required: true }),
		field('key', 'string', 'Ключ для ручного открытия', {
			required: true,
			note: 'Латиница и дефисы, например club-offer. Ссылки вида #modal=club-offer открывают это окно с любой страницы.',
		}),
		field('kind', 'string', 'Формат', {
			interface: 'select-dropdown',
			required: true,
			defaultValue: 'modal',
			values: [
				['modal', 'Модальное окно'],
				['floating', 'Карточка снизу справа'],
			],
		}),
		alias('content_group', 'Содержимое'),
		field('title', 'string', 'Заголовок', {
			required: true,
			group: 'content_group',
		}),
		field('text', 'text', 'Текст', {
			interface: 'input-multiline',
			group: 'content_group',
			note: 'Абзацы разделяются переносом строки.',
		}),
		field('badge', 'string', 'Небольшой акцент / бейдж', {
			group: 'content_group',
		}),
		list(
			'benefits',
			'Короткие преимущества',
			[],
			'Необязательный список с галочками.',
		),
		field('footnote', 'text', 'Примечание под текстом', {
			interface: 'input-multiline',
		}),
		field('image', 'uuid', 'Фото сверху', {
			interface: 'file-image',
			special: ['file'],
			group: 'content_group',
			note: 'Используйте публичное изображение, не приватные AI-файлы.',
		}),
		field('image_alt', 'string', 'Описание фото (alt)', {
			group: 'content_group',
		}),
		{
			field: 'buttons',
			type: 'alias',
			meta: {
				interface: 'list-o2m',
				special: ['o2m'],
				group: 'content_group',
				translations: [{ language: 'ru-RU', translation: 'Кнопки снизу' }],
				options: { template: '{{label}}' },
			},
		},
		alias('rules_group', 'Автоматический показ'),
		field('trigger', 'string', 'Условие показа', {
			interface: 'select-dropdown',
			defaultValue: 'manual',
			group: 'rules_group',
			values: [
				['manual', 'Только вручную'],
				['delay', 'Через заданное время'],
				['scroll', 'После прокрутки экранов'],
				['either', 'Время ИЛИ прокрутка'],
				['both', 'Время И прокрутка'],
			],
		}),
		field('delay_seconds', 'integer', 'Время на странице, секунд', {
			interface: 'input',
			defaultValue: 20,
			group: 'rules_group',
		}),
		field('scroll_desktop', 'float', 'Сколько экранов прокрутить на ПК', {
			interface: 'input',
			defaultValue: 2,
			group: 'rules_group',
		}),
		field('scroll_mobile', 'float', 'Сколько экранов прокрутить на телефоне', {
			interface: 'input',
			defaultValue: 2,
			group: 'rules_group',
		}),
		list(
			'include_paths',
			'Страницы и разделы',
			['/*'],
			'Точные пути или маски: /, /articles/*, /prompts/*. Маска раздела включает его главную страницу.',
		),
		list(
			'exclude_paths',
			'Исключить страницы',
			[],
			'Эти пути имеют приоритет над списком показа.',
		),
		field('allow_workspace', 'boolean', 'Разрешить в рабочих экранах Studio', {
			interface: 'boolean',
			defaultValue: false,
			note: 'По умолчанию автопоказ запрещён в чатах, генераторе, оплате, профиле и авторизации. Ручное открытие работает везде.',
		}),
		field('priority', 'integer', 'Приоритет', {
			defaultValue: 0,
			note: 'Из подходящих блоков показывается один с наибольшим приоритетом, без очереди модалок.',
		}),
		field('starts_at', 'timestamp', 'Начать показ', { interface: 'datetime' }),
		field('ends_at', 'timestamp', 'Закончить показ', { interface: 'datetime' }),
		alias('repeat_group', 'Повторные показы'),
		field('frequency', 'string', 'Повторять', {
			interface: 'select-dropdown',
			defaultValue: 'version',
			group: 'repeat_group',
			values: [
				['version', 'Только после обновления содержимого'],
				['session', 'В новом визите / вкладке'],
				['days', 'Через указанное число дней'],
			],
		}),
		field('repeat_days', 'integer', 'Повторить через дней', {
			defaultValue: 7,
			group: 'repeat_group',
		}),
		field('version', 'string', 'Версия показа', {
			defaultValue: '1',
			group: 'repeat_group',
			note: 'Изменение заголовка, текста, фото или кнопок разрешает новый показ автоматически. Здесь можно принудительно задать новую версию.',
		}),
	],
	{
		display_template: '{{name}}',
		archive_field: 'status',
		archive_value: 'draft',
		unarchive_value: 'published',
		sort_field: 'priority',
	},
);
await collection(
	'site_notice_buttons',
	'Кнопки всплывающих блоков',
	'smart_button',
	[
		uuid(),
		field('notice', 'uuid', 'Всплывающий блок', {
			interface: 'select-dropdown-m2o',
			special: ['m2o'],
		}),
		field('sort', 'integer', 'Порядок', { defaultValue: 0 }),
		field('label', 'string', 'Текст кнопки', { required: true }),
		field('action', 'string', 'Действие', {
			interface: 'select-dropdown',
			defaultValue: 'link',
			values: [
				['link', 'Открыть ссылку'],
				['modal', 'Открыть модалку'],
				['close', 'Закрыть'],
			],
		}),
		field('url', 'string', 'Ссылка'),
		field('modal', 'uuid', 'Модалка', {
			interface: 'select-dropdown-m2o',
			special: ['m2o'],
			options: { template: '{{name}}', filter: { kind: { _eq: 'modal' } } },
		}),
		field('variant', 'string', 'Вид кнопки', {
			interface: 'select-dropdown',
			defaultValue: 'primary',
			values: [
				['primary', 'Основная'],
				['secondary', 'Вторичная'],
				['ghost', 'Контурная'],
			],
		}),
		field('new_tab', 'boolean', 'Открывать ссылку в новой вкладке', {
			interface: 'boolean',
			defaultValue: false,
		}),
	],
	{ hidden: true, sort_field: 'sort' },
);
await collection(
	'site_cookie_settings',
	'Уведомление о cookies',
	'cookie',
	[
		{
			field: 'id',
			type: 'integer',
			schema: { is_primary_key: true, has_auto_increment: true },
			meta: { hidden: true, readonly: true, interface: 'numeric' },
		},
		field('enabled', 'boolean', 'Показывать уведомление', {
			interface: 'boolean',
			defaultValue: true,
			note: 'Это информационный баннер. Закрытие или отключение баннера не отключает cookies и аналитику.',
		}),
		field('title', 'string', 'Заголовок'),
		field('text', 'text', 'Текст', { interface: 'input-multiline' }),
		field('policy_url', 'string', 'Ссылка на политику'),
		field('policy_label', 'string', 'Подпись ссылки'),
		field('accept_label', 'string', 'Кнопка закрытия'),
		field('version', 'string', 'Версия уведомления', {
			defaultValue: '1',
			note: 'Смена версии или текста показывает уведомление повторно. На работу аналитики не влияет.',
		}),
	],
	{ singleton: true },
);

const relations = await request('/relations');
async function relation(
	collection,
	field,
	related_collection,
	inverse = null,
	cascade = false,
) {
	if (relations.some((r) => r.collection === collection && r.field === field))
		return;
	await request('/relations', {
		collection,
		field,
		related_collection,
		schema: { on_delete: cascade ? 'CASCADE' : 'SET NULL' },
		meta: {
			many_collection: collection,
			many_field: field,
			one_collection: related_collection,
			one_field: inverse,
			...(inverse ? { sort_field: 'sort', one_deselect_action: 'delete' } : {}),
		},
	});
}
await relation('site_notices', 'image', 'directus_files');
await relation(
	'site_notice_buttons',
	'notice',
	'site_notices',
	'buttons',
	true,
);
await relation('site_notice_buttons', 'modal', 'site_notices');
if (!heroFields.some((f) => f.field === 'modal'))
	await request(
		'/fields/hero_buttons',
		field('modal', 'uuid', 'Открыть модалку вместо ссылки', {
			interface: 'select-dropdown-m2o',
			special: ['m2o'],
			note: 'Если выбрано окно, поле URL не используется. Окно должно быть опубликовано.',
			options: { template: '{{name}}', filter: { kind: { _eq: 'modal' } } },
		}),
	);
await relation('hero_buttons', 'modal', 'site_notices');
// A modal-only button must not require a dummy URL. Existing URL buttons keep
// their required control in the admin UI; only the database accepts null.
const heroUrl = heroFields.find((f) => f.field === 'url');
if (heroUrl)
	await request(
		'/fields/hero_buttons/url',
		{
			schema: { is_nullable: true },
			meta: {
				required: true,
				conditions: [
					...(heroUrl.meta.conditions || []).filter(
						(c) => c.name !== 'Выбрана модалка',
					),
					{
						name: 'Выбрана модалка',
						rule: { modal: { _nnull: true } },
						required: false,
						hidden: true,
					},
				],
			},
		},
		'PATCH',
	);
await request(
	'/fields/site_notices/key',
	{
		schema: { is_unique: true },
		meta: {
			validation: { key: { _regex: '^[a-z0-9][a-z0-9-]*$' } },
			validation_message:
				'Используйте латиницу, цифры и дефисы. Ключ должен быть уникальным.',
		},
	},
	'PATCH',
);

const publicPolicies = await request(
	'/policies?' +
		new URLSearchParams({
			'filter[name][_eq]': '$t:public_label',
			fields: 'id',
		}),
);
if (publicPolicies.length !== 1)
	throw new Error(
		'Expected one public policy; refusing to change permissions.',
	);
const permissions = await request(
	'/permissions?' +
		new URLSearchParams({
			'filter[policy][_eq]': publicPolicies[0].id,
			'filter[collection][_in]':
				'site_notices,site_notice_buttons,site_cookie_settings',
			fields: 'id,collection,action',
		}),
);
for (const collection of [
	'site_notices',
	'site_notice_buttons',
	'site_cookie_settings',
]) {
	if (
		permissions.some((p) => p.collection === collection && p.action === 'read')
	)
		continue;
	await request('/permissions', {
		policy: publicPolicies[0].id,
		collection,
		action: 'read',
		permissions:
			collection === 'site_notices'
				? { status: { _eq: 'published' } }
				: collection === 'site_notice_buttons'
					? { notice: { status: { _eq: 'published' } } }
					: {},
		fields: ['*'],
	});
}
const cookies = await request('/items/site_cookie_settings');
if (!cookies?.title)
	await request(
		'/items/site_cookie_settings',
		{
			enabled: true,
			title: 'Немного о cookies',
			text: 'Мы используем cookies для работы сайта, сохранения настроек и аналитики посещений. Подробнее об обработке данных — в нашей политике.',
			policy_url: '/legal/personal-data-policy',
			policy_label: 'Подробнее о данных',
			accept_label: 'Понятно',
			version: '1',
		},
		'PATCH',
	);
await request('/utils/cache/clear?system', {});
console.log(
	JSON.stringify({
		complete: true,
		backup,
		newCollections: [
			'site_notices',
			'site_notice_buttons',
			'site_cookie_settings',
		],
		examplesCreated: false,
	}),
);

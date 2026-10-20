'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useSiteNotices } from '@/features/site-notices';
import { buildDirectusAssetUrl } from '@/shared/config/directus';
import {
	DEFAULT_COOKIE_SETTINGS,
	type NoticeButton,
	type SiteNotice,
} from '@/shared/lib/site-notices/types';
import { Button, buttonClassName } from '@/shared/ui/button';
import { CatalogHeading } from '@/shared/ui/catalog-heading';
import { Container } from '@/shared/ui/container';
import styles from './page.module.scss';

const PATH = '/design-preview/notices';
const initial: SiteNotice = {
	id: 'preview-library',
	key: 'preview-library',
	kind: 'modal',
	title: 'Ваша следующая идея — уже здесь',
	text: 'Промпты для фото, видео и текста — с примерами, которые помогут начать.',
	badge: 'Библиотека Нейролюба',
	benefits: [
		'Готовые сценарии под вашу задачу',
		'Понятная инструкция к каждому промпту',
	],
	footnote: 'Это локальный пример. Он не создаёт опубликованных записей в CMS.',
	image: {
		url: buildDirectusAssetUrl('40a9a68c-6630-4af2-87fc-fafaf1987d93'),
		alt: 'Визуальная схема создания промпта: от идеи и структуры к результату',
		width: 1536,
		height: 1024,
	},
	buttons: [],
	trigger: 'manual',
	delaySeconds: 3,
	scrollDesktop: 1,
	scrollMobile: 2,
	includePaths: [PATH],
	excludePaths: [],
	allowWorkspace: false,
	priority: 10,
	frequency: 'version',
	repeatDays: 7,
	version: 'preview-1',
	startsAt: null,
	endsAt: null,
};
const buttons: NoticeButton[] = [
	{
		id: 'prompts',
		label: 'Открыть промпты',
		action: 'link',
		href: '/prompts',
		modal: '',
		variant: 'primary',
		newTab: true,
	},
	{
		id: 'close',
		label: 'Посмотрю позже',
		action: 'close',
		href: '',
		modal: '',
		variant: 'ghost',
		newTab: false,
	},
	{
		id: 'another',
		label: 'Другая модалка',
		action: 'modal',
		href: '',
		modal: 'preview-second',
		variant: 'secondary',
		newTab: false,
	},
	{
		id: 'articles',
		label: 'Полезные статьи',
		action: 'link',
		href: '/articles',
		modal: '',
		variant: 'secondary',
		newTab: true,
	},
	{
		id: 'studio',
		label: 'Перейти в Studio',
		action: 'link',
		href: '/ai',
		modal: '',
		variant: 'primary',
		newTab: true,
	},
];

export function NoticesPreview({ children }: { children: ReactNode }) {
	const { preview, openModal, openCookieSettings } = useSiteNotices();
	const pathname = usePathname();
	const [trigger, setTrigger] = useState<SiteNotice['trigger']>('manual');
	const [count, setCount] = useState(3);
	const [version, setVersion] = useState(1);
	const [cookieVersion, setCookieVersion] = useState(1);
	const [floatingEnabled, setFloatingEnabled] = useState(true);
	const config = useMemo(
		() => ({
			cookies: {
				...DEFAULT_COOKIE_SETTINGS,
				version: `preview-${cookieVersion}`,
			},
			notices: [
				{ ...initial, trigger, buttons: buttons.slice(0, count) },
				{
					...initial,
					id: 'preview-second',
					key: 'preview-second',
					title: 'Другой раздел — другое предложение',
					text: 'Эта модалка автоматически показывается только на второй странице. Вручную её можно вызвать откуда угодно.',
					includePaths: [`${PATH}/second`],
					image: null,
					badge: 'Вторая модалка',
					trigger,
					buttons: buttons.slice(0, 2),
				},
				...(floatingEnabled
					? [
							{
								...initial,
								id: 'preview-cta',
								key: 'preview-cta',
								kind: 'floating' as const,
								title:
									version === 1
										? 'Идея для вашего следующего проекта'
										: `Обновлённое предложение · ${version}`,
								text: 'Откройте подборку или узнайте больше в модальном окне.',
								badge: 'На заметку',
								benefits: [],
								footnote: '',
								includePaths: [`${PATH}/*`],
								trigger: 'delay' as const,
								delaySeconds: 1,
								buttons: [
									{
										...buttons[2],
										label: 'Подробнее',
										modal: 'preview-library',
										variant: 'primary' as const,
									},
								],
								version: String(version),
							},
						]
					: []),
			],
		}),
		[trigger, count, version, cookieVersion, floatingEnabled],
	);
	const setConfig = preview?.setConfig;
	useEffect(() => {
		setConfig?.(config);
		return () => setConfig?.(null);
	}, [config, setConfig]);
	return (
		<Container className={styles.preview}>
			<CatalogHeading
				title='Модалки, CTA и cookies'
				description='Локальная песочница. Настройки ниже действуют только здесь и не публикуют примеры в Directus.'
			/>
			<nav className={styles.row} aria-label='Страницы предпросмотра'>
				<Link
					className={buttonClassName(pathname === PATH ? 'secondary' : 'ghost')}
					href={PATH}
				>
					Первая страница
				</Link>
				<Link
					className={buttonClassName(
						pathname === `${PATH}/second` ? 'secondary' : 'ghost',
					)}
					href={`${PATH}/second`}
				>
					Вторая страница
				</Link>
			</nav>
			<section className={styles.panel} aria-labelledby='preview-controls'>
				<h2 id='preview-controls'>Проверка поведения</h2>
				<p>
					Сначала закройте cookies. Время считается только в видимой вкладке,
					пока не открыты другие окна. Прокрутка: 1 экран на ПК, 2 на телефоне.
					После смены страницы отсчёт начинается заново.
				</p>
				<div className={styles.fields}>
					<label>
						Автоматический показ
						<select
							value={trigger}
							onChange={(event) => {
								setTrigger(event.target.value as SiteNotice['trigger']);
								preview?.reset();
							}}
						>
							<option value='manual'>Выключен — только вручную</option>
							<option value='delay'>Через 3 секунды</option>
							<option value='scroll'>После прокрутки</option>
							<option value='either'>Время ИЛИ прокрутка</option>
							<option value='both'>Время И прокрутка</option>
						</select>
					</label>
					<label>
						Кнопки в первой модалке
						<select
							value={count}
							onChange={(event) => setCount(Number(event.target.value))}
						>
							{[1, 2, 3, 4, 5].map((value) => (
								<option key={value} value={value}>
									{value}
								</option>
							))}
						</select>
					</label>
					<label className={styles.checkbox}>
						<input
							type='checkbox'
							checked={floatingEnabled}
							onChange={(event) => {
								setFloatingEnabled(event.target.checked);
								preview?.reset();
							}}
						/>
						Карточка CTA снизу справа
					</label>
				</div>
				<div className={styles.row}>
					<Button onClick={() => openModal('preview-library')}>
						Открыть первую модалку
					</Button>
					<Button
						variant='secondary'
						onClick={() => openModal('preview-second')}
					>
						Открыть вторую модалку
					</Button>
					<a className={buttonClassName('ghost')} href='#modal=preview-library'>
						Открыть обычной ссылкой
					</a>
					<Button variant='ghost' onClick={openCookieSettings}>
						О cookies
					</Button>
				</div>
				<div className={styles.row}>
					<Button
						variant='secondary'
						onClick={() => setVersion((value) => value + 1)}
					>
						Поменять заголовок CTA
					</Button>
					<Button
						variant='secondary'
						onClick={() => setCookieVersion((value) => value + 1)}
					>
						Обновить версию cookies
					</Button>
					<Button variant='ghost' onClick={() => preview?.reset()}>
						Сбросить историю показа
					</Button>
				</div>
				<p className={styles.note}>
					Закрытые CTA и cookies не появляются повторно после обновления
					страницы. Измените заголовок CTA или версию cookies — они снова
					появятся. Аналитика от кнопки «Понятно» не зависит.
				</p>
			</section>
			{children}
		</Container>
	);
}

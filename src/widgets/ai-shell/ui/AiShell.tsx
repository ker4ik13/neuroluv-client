'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
	FiChevronDown,
	FiClock,
	FiHelpCircle,
	FiImage,
	FiMessageSquare,
	FiUser,
	FiVideo,
	FiZap,
} from 'react-icons/fi';
import { RiSparkling2Fill } from 'react-icons/ri';
import type { FooterData } from '@/entities/footer';
import type { NavigationLogo } from '@/entities/navigation';
import { AiBrowserNotificationMonitor } from '@/features/ai-browser-notifications';
import {
	AiLocaleProvider,
	useAiLocale,
	withAiLocale,
} from '@/features/ai-locale';
import { AiSessionProvider, useAiSession } from '@/features/ai-session';
import { AiThemeProvider } from '@/features/ai-theme';
import {
	aiApiFetch,
	aiApiFetchCached,
	type AiFooterNavigationResponse,
	type AiNavigationItem,
	type AiNavigationResponse,
} from '@/shared/api/ai';
import { formatCreditNumber, formatCredits } from '@/shared/lib/formatCredits';
import { Container } from '@/shared/ui/container';
import { SiteHeaderLogo } from '@/shared/ui/site-header-logo';
import { FooterView } from '@/widgets/footer';
import styles from './AiShell.module.scss';

const DEFAULT_PROJECT_NAME = 'Нейролюб Studio';
const CHAT_CATALOG_CACHE_TTL_MS = 5 * 60_000;

export function AiShell({
	children,
	footer,
	logo,
}: {
	children: React.ReactNode;
	footer: FooterData | null;
	logo: NavigationLogo | null;
}) {
	return (
		<AiThemeProvider>
			<AiSessionProvider>
				<AiLocaleProvider>
					<AiBrowserNotificationMonitor />
					<AiShellContent footer={footer} logo={logo}>
						{children}
					</AiShellContent>
				</AiLocaleProvider>
			</AiSessionProvider>
		</AiThemeProvider>
	);
}

function AiShellContent({
	children,
	footer,
	logo,
}: {
	children: React.ReactNode;
	footer: FooterData | null;
	logo: NavigationLogo | null;
}) {
	const pathname = usePathname();
	const { isEnglish, locale, t } = useAiLocale();
	const { session, isLoading } = useAiSession();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [navigation, setNavigation] = useState<AiNavigationItem[]>([]);
	const [projectName, setProjectName] = useState(DEFAULT_PROJECT_NAME);
	const [footerNavigation, setFooterNavigation] = useState<AiNavigationItem[]>(
		[],
	);

	useEffect(() => {
		let isMounted = true;

		aiApiFetch<AiNavigationResponse>(
			withAiLocale('/catalog/navigation', locale),
		)
			.then((response) => {
				if (!isMounted) {
					return;
				}

				setProjectName(normalizeProjectName(response.projectName));
				if (response.data.length > 0) {
					setNavigation(response.data);
				}
			})
			.catch(() => {
				// A small emergency navigation keeps the application usable during CMS outages.
			});

		return () => {
			isMounted = false;
		};
	}, [locale]);

	useEffect(() => {
		let isMounted = true;
		aiApiFetch<AiFooterNavigationResponse>(
			withAiLocale('/catalog/footer', locale),
		)
			.then((response) => {
				if (isMounted) setFooterNavigation(response.data);
			})
			.catch(() => undefined);
		return () => {
			isMounted = false;
		};
	}, [locale]);

	useEffect(() => {
		const timer = window.setTimeout(() => setIsMenuOpen(false), 0);

		return () => window.clearTimeout(timer);
	}, [pathname]);

	useEffect(() => {
		if (!isMenuOpen) {
			return;
		}

		document.body.style.overflow = 'hidden';

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsMenuOpen(false);
			}
		};

		document.addEventListener('keydown', handleEscape);

		return () => {
			document.body.style.overflow = '';
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isMenuOpen]);

	const sortedNavigation = useMemo(
		() =>
			[...(navigation.length ? navigation : getEmergencyNavigation(isEnglish))]
				.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
				.map((item) => ({
					...item,
					children: [...(item.children || [])].sort(
						(a, b) => (a.sort ?? 0) - (b.sort ?? 0),
					),
				})),
		[isEnglish, navigation],
	);
	const brandName = useMemo(() => splitProjectName(projectName), [projectName]);
	const isChatWorkspace = isGenerationChatPath(pathname);
	const resolvedFooter = useMemo(
		() =>
			mergeAiFooterNavigation(
				footer,
				footerNavigation,
				t('AI-студия', 'AI studio'),
			),
		[footer, footerNavigation, t],
	);

	return (
		<div
			className={`${styles.app} ${isChatWorkspace ? styles.appChatWorkspace : ''}`}
		>
			<header className={styles.header}>
				<Container className={styles.headerContainer}>
					<div className={styles.headerInner}>
						<Link
							aria-label={`${brandName.full} — ${t('главная', 'home')}`}
							className={styles.brand}
							href='/ai'
							title={brandName.full}
						>
							<SiteHeaderLogo
								fallback={
									<span aria-hidden='true' className={styles.brandMark}>
										<RiSparkling2Fill />
									</span>
								}
								logo={logo}
							/>
							<span className={styles.brandText}>
								<span className={styles.brandPrimary}>{brandName.primary}</span>
								{brandName.secondary ? (
									<span className={styles.brandAi}>{brandName.secondary}</span>
								) : null}
							</span>
						</Link>

						<nav
							aria-label={t('Навигация AI', 'AI navigation')}
							className={styles.desktopNav}
						>
							{sortedNavigation.map((item) => (
								<DesktopNavigationItem
									item={item}
									key={item.id}
									pathname={pathname}
								/>
							))}
						</nav>

						<div className={styles.account}>
							{session.authenticated && session.wallet ? (
								<Link
									aria-label={`${t('Баланс', 'Balance')}: ${formatCredits(session.wallet.availableCredits, locale)}`}
									className={styles.creditPill}
									href='/ai/balance'
								>
									<CreditBalance value={session.wallet.availableCredits} />
								</Link>
							) : null}

							<Link
								aria-label={
									session.authenticated
										? t('Профиль', 'Profile')
										: t('Войти', 'Sign in')
								}
								className={styles.profileLink}
								href={session.authenticated ? '/ai/profile' : '/ai/auth'}
							>
								<FiUser aria-hidden='true' />
								<span>
									{isLoading
										? '…'
										: session.authenticated
											? session.user?.displayName || t('Профиль', 'Profile')
											: t('Войти', 'Sign in')}
								</span>
							</Link>

							<button
								aria-controls='ai-mobile-navigation'
								aria-expanded={isMenuOpen}
								aria-label={
									isMenuOpen
										? t('Закрыть меню', 'Close menu')
										: t('Открыть меню', 'Open menu')
								}
								className={styles.menuButton}
								type='button'
								onClick={() => setIsMenuOpen((current) => !current)}
							>
								<span className={styles.menuLine} />
								<span className={styles.menuLine} />
								<span className={styles.menuLine} />
							</button>
						</div>
					</div>

					<div
						className={`${styles.mobilePanel} ${isMenuOpen ? styles.mobilePanelOpen : ''}`}
						id='ai-mobile-navigation'
					>
						<nav
							aria-label={t('Мобильная навигация AI', 'Mobile AI navigation')}
							className={styles.mobileNav}
						>
							{sortedNavigation.map((item) => (
								<MobileNavigationItem
									item={item}
									key={item.id}
									pathname={pathname}
								/>
							))}
							<NavLink
								item={{
									id: 'faq',
									label: t('FAQ', 'FAQ'),
									href: '/ai/faq',
									icon: 'faq',
								}}
								pathname={pathname}
							/>
						</nav>
					</div>
				</Container>
			</header>

			<main
				className={`${styles.main} ${isChatWorkspace ? styles.mainChatWorkspace : ''}`}
			>
				{children}
			</main>
			{!isChatWorkspace && resolvedFooter ? (
				<FooterView footer={resolvedFooter} />
			) : null}
		</div>
	);
}

function mergeAiFooterNavigation(
	footer: FooterData | null,
	navigation: AiNavigationItem[],
	fallbackTitle: string,
): FooterData | null {
	if (!footer) return null;

	const standalone = navigation.filter((item) => !(item.children || []).length);
	const navigationColumns = navigation
		.filter((item) => (item.children || []).length > 0)
		.map((item) => ({
			id: `ai-footer-${item.id}`,
			title: item.label,
			links: (item.children || []).map((child) => ({
				id: `ai-footer-link-${child.id}`,
				label: child.label,
				href: child.href,
				target: '_self' as const,
			})),
		}));

	if (standalone.length) {
		navigationColumns.unshift({
			id: 'ai-footer-links',
			title: fallbackTitle,
			links: standalone.map((item) => ({
				id: `ai-footer-link-${item.id}`,
				label: item.label,
				href: item.href,
				target: '_self' as const,
			})),
		});
	}

	return {
		...footer,
		columns: [...navigationColumns, ...footer.columns],
	};
}

function DesktopNavigationItem({
	item,
	pathname,
}: {
	item: AiNavigationItem;
	pathname: string;
}) {
	const { t } = useAiLocale();
	const children = item.children || [];
	if (!children.length) return <NavLink item={item} pathname={pathname} />;

	const isActive = isNavigationItemActive(item, pathname);
	return (
		<div className={styles.navGroup}>
			<NavLink item={item} pathname={pathname} />
			<button
				aria-label={`${t('Открыть раздел', 'Open section')} «${item.label}»`}
				className={`${styles.navGroupToggle} ${isActive ? styles.navGroupToggleActive : ''}`}
				type='button'
			>
				<FiChevronDown aria-hidden='true' />
			</button>
			<div className={styles.navDropdown}>
				{children.map((child) => (
					<NavLink item={child} key={child.id} pathname={pathname} />
				))}
			</div>
		</div>
	);
}

function MobileNavigationItem({
	item,
	pathname,
}: {
	item: AiNavigationItem;
	pathname: string;
}) {
	return (
		<div className={styles.mobileNavGroup}>
			<NavLink item={item} pathname={pathname} />
			{(item.children || []).map((child) => (
				<div className={styles.mobileNavChild} key={child.id}>
					<NavLink item={child} pathname={pathname} />
				</div>
			))}
		</div>
	);
}

function isGenerationChatPath(pathname: string): boolean {
	return (
		/^\/ai\/create\/(?:photo|text|video)$/.test(pathname) ||
		pathname === '/ai/tools/photo-to-prompt'
	);
}

function CreditBalance({ value }: { value: number }) {
	const { locale } = useAiLocale();
	return (
		<>
			<FiZap aria-hidden='true' />
			<span className={styles.creditValue}>
				{formatCreditNumber(value, locale)}
			</span>
		</>
	);
}

function getEmergencyNavigation(isEnglish: boolean): AiNavigationItem[] {
	return [
		{
			id: 'text',
			label: isEnglish ? 'Text' : 'Текст',
			href: '/ai/create/text',
			icon: 'text',
		},
		{
			id: 'photo',
			label: isEnglish ? 'Photo' : 'Фото',
			href: '/ai/create/photo',
			icon: 'photo',
		},
		{
			id: 'video',
			label: isEnglish ? 'Video' : 'Видео',
			href: '/ai/create/video',
			icon: 'video',
		},
		{
			id: 'works',
			label: isEnglish ? 'My works' : 'Мои работы',
			href: '/ai/works',
			icon: 'works',
			children: [
				{
					id: 'history',
					label: isEnglish ? 'History' : 'История',
					href: '/ai/history',
					icon: 'history',
				},
			],
		},
	];
}

function NavLink({
	item,
	pathname,
}: {
	item: AiNavigationItem;
	pathname: string;
}) {
	const { locale } = useAiLocale();
	const isActive = isNavigationItemActive(item, pathname);
	const preloadCatalog = () => preloadChatCatalog(item.href, locale);

	return (
		<Link
			aria-current={isActive ? 'page' : undefined}
			aria-label={item.ariaLabel || undefined}
			className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
			href={item.href}
			onFocus={preloadCatalog}
			onPointerDown={preloadCatalog}
			onPointerEnter={preloadCatalog}
		>
			<span aria-hidden='true' className={styles.navIcon}>
				{getNavigationIcon(item.icon)}
			</span>
			<span>{item.label}</span>
		</Link>
	);
}

function preloadChatCatalog(href: string, locale: 'ru-RU' | 'en-US'): void {
	const modality =
		href === '/ai/create/text'
			? 'text'
			: href === '/ai/create/photo'
				? 'image'
				: href === '/ai/create/video'
					? 'video'
					: href === '/ai/tools/photo-to-prompt'
						? 'vision'
						: null;
	if (!modality) return;

	void aiApiFetchCached(
		`/catalog/models?modality=${encodeURIComponent(modality)}`,
		CHAT_CATALOG_CACHE_TTL_MS,
	).catch(() => undefined);
	if (href === '/ai/tools/photo-to-prompt') {
		void aiApiFetchCached(
			withAiLocale('/catalog/tools?code=photo-to-prompt', locale),
			CHAT_CATALOG_CACHE_TTL_MS,
		).catch(() => undefined);
	}
}

function isNavigationItemActive(
	item: AiNavigationItem,
	pathname: string,
): boolean {
	return (
		pathname === item.href ||
		(item.href !== '/ai' && pathname.startsWith(`${item.href}/`)) ||
		(item.children || []).some((child) =>
			isNavigationItemActive(child, pathname),
		)
	);
}

function getNavigationIcon(icon?: string | null) {
	switch (icon) {
		case 'text':
			return <FiMessageSquare />;
		case 'photo':
			return <FiImage />;
		case 'video':
			return <FiVideo />;
		case 'works':
			return <FiImage />;
		case 'history':
			return <FiClock />;
		case 'faq':
			return <FiHelpCircle />;
		default:
			return <RiSparkling2Fill />;
	}
}

function normalizeProjectName(value: string | null | undefined): string {
	return value?.trim().replace(/\s+/g, ' ') || DEFAULT_PROJECT_NAME;
}

function splitProjectName(value: string): {
	full: string;
	primary: string;
	secondary: string;
} {
	const full = normalizeProjectName(value);
	const [primary, ...secondary] = full.split(' ');

	return {
		full,
		primary,
		secondary: secondary.join(' '),
	};
}

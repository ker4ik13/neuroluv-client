'use client';

import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type {
	NavigationIcon,
	NavigationItem,
	NavigationLogo,
} from '@/entities/navigation';
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
	type AiNavigationItem,
	type AiNavigationResponse,
	type AiSession,
} from '@/shared/api/ai';
import { formatCreditNumber, formatCredits } from '@/shared/lib/formatCredits';
import { AppIcon } from '@/shared/ui/app-icon';
import { Container } from '@/shared/ui/container';
import { SiteHeaderLogo } from '@/shared/ui/site-header-logo';
import { FooterView } from '@/widgets/footer';
import styles from './AiShell.module.scss';

const DEFAULT_PROJECT_NAME = 'Нейролюб Studio';
const CHAT_CATALOG_CACHE_TTL_MS = 5 * 60_000;
const DESKTOP_MENU_DELAY_MS = 80;
const DESKTOP_MENU_SKIP_DELAY_MS = 250;
const DESKTOP_VIEWPORT_EDGE_GUTTER_PX = 24;

type StudioNavigationItem = {
	id: string | number;
	label: string;
	ariaLabel?: string | null;
	href: string;
	icon?: string | NavigationIcon | null;
	badgeText?: string | null;
	sort?: number | null;
	target?: '_self' | '_blank';
	isHighlighted?: boolean;
	children?: StudioNavigationItem[];
};

type AiShellProps = {
	children: React.ReactNode;
	footer?: FooterData | null;
	logo?: NavigationLogo | null;
	navigation?: NavigationItem[] | null;
};

type AiShellContentProps = {
	children: React.ReactNode;
	footer: FooterData | null;
	logo: NavigationLogo | null;
	navigation?: NavigationItem[] | null;
};

export function AiShell({
	children,
	footer = null,
	logo = null,
	navigation,
}: AiShellProps) {
	return (
		<AiThemeProvider>
			<AiSessionProvider>
				<AiLocaleProvider>
					<AiBrowserNotificationMonitor />
					<AiShellContent footer={footer} logo={logo} navigation={navigation}>
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
	navigation,
}: AiShellContentProps) {
	const pathname = usePathname();
	const headerRef = useRef<HTMLElement>(null);
	const { isEnglish, locale, t } = useAiLocale();
	const { session, isLoading } = useAiSession();
	const [desktopValue, setDesktopValue] = useState('');
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [mobileSectionId, setMobileSectionId] = useState<string | null>(null);
	const [apiNavigation, setApiNavigation] = useState<AiNavigationItem[]>([]);
	const [projectName, setProjectName] = useState(DEFAULT_PROJECT_NAME);

	useEffect(() => {
		let isMounted = true;

		aiApiFetch<AiNavigationResponse>(
			withAiLocale('/catalog/navigation', locale),
		)
			.then((response) => {
				if (!isMounted) return;

				setProjectName(normalizeProjectName(response.projectName));
				setApiNavigation(response.data);
			})
			.catch(() => {
				// The Directus menu or the emergency links keep navigation usable.
			});

		return () => {
			isMounted = false;
		};
	}, [locale]);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDesktopValue('');
			setIsMenuOpen(false);
			setMobileSectionId(null);
		}, 0);

		return () => window.clearTimeout(timer);
	}, [pathname]);

	useEffect(() => {
		if (!isMenuOpen) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isMenuOpen]);

	useEffect(() => {
		function handleEscape(event: KeyboardEvent) {
			if (event.key !== 'Escape') return;

			setDesktopValue('');
			setIsMenuOpen(false);
			setMobileSectionId(null);
		}

		function handlePointerDown(event: PointerEvent) {
			if (!isMenuOpen) return;
			const target = event.target;

			if (
				target instanceof Node &&
				headerRef.current &&
				!headerRef.current.contains(target)
			) {
				setIsMenuOpen(false);
				setMobileSectionId(null);
			}
		}

		document.addEventListener('keydown', handleEscape);
		document.addEventListener('pointerdown', handlePointerDown);

		return () => {
			document.removeEventListener('keydown', handleEscape);
			document.removeEventListener('pointerdown', handlePointerDown);
		};
	}, [isMenuOpen]);

	const normalizedProvidedNavigation = useMemo(
		() => normalizeDirectusNavigation(navigation || []),
		[navigation],
	);
	const sortedNavigation = useMemo(() => {
		const source =
			navigation !== undefined
				? normalizedProvidedNavigation
				: apiNavigation.length
					? normalizeApiNavigation(apiNavigation)
					: getEmergencyNavigation(isEnglish);

		return sortNavigation(source);
	}, [apiNavigation, isEnglish, navigation, normalizedProvidedNavigation]);
	const brandName = useMemo(() => splitProjectName(projectName), [projectName]);
	const isChatWorkspace = isGenerationChatPath(pathname);

	function closeNavigation() {
		setDesktopValue('');
		setIsMenuOpen(false);
		setMobileSectionId(null);
	}

	function toggleMobileMenu() {
		setIsMenuOpen((isOpen) => !isOpen);
		setDesktopValue('');
		setMobileSectionId(null);
	}

	return (
		<div
			className={`${styles.app} ${isChatWorkspace ? styles.appChatWorkspace : ''}`}
		>
			<header className={styles.header} ref={headerRef}>
				<Container className={styles.headerContainer}>
					<div className={styles.headerInner}>
						<Link
							aria-label={`${brandName.full} — ${t('главная', 'home')}`}
							className={styles.brand}
							href='/ai'
							title={brandName.full}
							onClick={closeNavigation}
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

						<DesktopNavigation
							items={sortedNavigation}
							pathname={pathname}
							value={desktopValue}
							onNavigate={closeNavigation}
							onValueChange={setDesktopValue}
						/>

						<div className={styles.account}>
							{session.authenticated && session.wallet ? (
								<Link
									aria-label={`${t('Баланс', 'Balance')}: ${formatCredits(session.wallet.availableCredits, locale)}`}
									className={styles.creditPill}
									href='/ai/balance'
									title={formatCredits(session.wallet.availableCredits, locale)}
									onClick={closeNavigation}
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
								onClick={closeNavigation}
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
										? t('Закрыть меню профиля', 'Close account menu')
										: t('Открыть меню профиля', 'Open account menu')
								}
								className={styles.mobileAccountTrigger}
								type='button'
								onClick={toggleMobileMenu}
							>
								<FiUser aria-hidden='true' />
							</button>

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
								onClick={toggleMobileMenu}
							>
								<span className={styles.menuLine} />
								<span className={styles.menuLine} />
								<span className={styles.menuLine} />
							</button>
						</div>
					</div>

					<div
						aria-hidden={!isMenuOpen}
						className={`${styles.mobilePanel} ${isMenuOpen ? styles.mobilePanelOpen : ''}`}
						id='ai-mobile-navigation'
					>
						<MobileAccountCard
							isLoading={isLoading}
							session={session}
							onNavigate={closeNavigation}
						/>
						<nav
							aria-label={t('Мобильная навигация AI', 'Mobile AI navigation')}
							className={styles.mobileNav}
						>
							{sortedNavigation.map((item) => (
								<MobileNavigationItem
									isOpen={mobileSectionId === String(item.id)}
									item={item}
									key={item.id}
									pathname={pathname}
									onNavigate={closeNavigation}
									onToggle={() =>
										setMobileSectionId((openId) =>
											openId === String(item.id) ? null : String(item.id),
										)
									}
								/>
							))}
							<StudioNavLink
								item={{
									id: 'faq',
									label: t('FAQ', 'FAQ'),
									href: '/ai/faq',
									icon: 'faq',
								}}
								pathname={pathname}
								onNavigate={closeNavigation}
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
			{!isChatWorkspace && footer ? <FooterView footer={footer} /> : null}
		</div>
	);
}

function DesktopNavigation({
	items,
	pathname,
	value,
	onNavigate,
	onValueChange,
}: {
	items: StudioNavigationItem[];
	pathname: string;
	value: string;
	onNavigate: () => void;
	onValueChange: (value: string) => void;
}) {
	const { t } = useAiLocale();
	const navigationRef = useRef<HTMLElement>(null);
	const viewportRef = useRef<HTMLDivElement>(null);
	const viewportPositionRef = useRef<HTMLDivElement>(null);
	const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
	const lastPointerTypeRef = useRef<string | null>(null);

	const updateViewportPosition = useCallback((itemValue: string) => {
		const navigation = navigationRef.current;
		const trigger = triggerRefs.current.get(itemValue);
		const viewport = viewportRef.current;
		const viewportPosition = viewportPositionRef.current;

		if (!navigation || !trigger || !viewportPosition) return;

		const navigationRect = navigation.getBoundingClientRect();
		const triggerRect = trigger.getBoundingClientRect();
		const triggerCenter =
			triggerRect.left - navigationRect.left + triggerRect.width / 2;
		const viewportWidth = viewport?.getBoundingClientRect().width || 0;
		const viewportHalfWidth = viewportWidth / 2;
		const minAnchor =
			DESKTOP_VIEWPORT_EDGE_GUTTER_PX + viewportHalfWidth - navigationRect.left;
		const maxAnchor =
			window.innerWidth -
			DESKTOP_VIEWPORT_EDGE_GUTTER_PX -
			viewportHalfWidth -
			navigationRect.left;
		const viewportAnchor =
			viewportWidth > 0 && minAnchor <= maxAnchor
				? Math.min(Math.max(triggerCenter, minAnchor), maxAnchor)
				: triggerCenter;

		viewportPosition.style.setProperty(
			'--ai-desktop-viewport-anchor',
			`${viewportAnchor}px`,
		);
	}, []);

	useEffect(() => {
		if (!value) return;

		const updatePosition = () => updateViewportPosition(value);
		const navigation = navigationRef.current;
		const trigger = triggerRefs.current.get(value);
		const viewport = viewportRef.current;
		const resizeObserver = new ResizeObserver(updatePosition);

		updatePosition();
		window.addEventListener('resize', updatePosition);
		if (navigation) resizeObserver.observe(navigation);
		if (trigger) resizeObserver.observe(trigger);
		if (viewport) resizeObserver.observe(viewport);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener('resize', updatePosition);
		};
	}, [updateViewportPosition, value]);

	function handleValueChange(nextValue: string) {
		if (nextValue) updateViewportPosition(nextValue);
		onValueChange(nextValue);
	}

	return (
		<NavigationMenu.Root
			aria-label={t('Навигация AI', 'AI navigation')}
			className={styles.desktopNav}
			delayDuration={DESKTOP_MENU_DELAY_MS}
			ref={navigationRef}
			skipDelayDuration={DESKTOP_MENU_SKIP_DELAY_MS}
			value={value}
			onValueChange={handleValueChange}
		>
			<NavigationMenu.List className={styles.desktopNavList}>
				{items.map((item, index) => {
					const isActive = isNavigationItemActive(item, pathname);

					if (!(item.children || []).length) {
						return (
							<NavigationMenu.Item key={`ai-nav-${item.id}-${index}`}>
								<NavigationMenu.Link active={isActive} asChild>
									<StudioNavLink
										item={item}
										pathname={pathname}
										onNavigate={onNavigate}
									/>
								</NavigationMenu.Link>
							</NavigationMenu.Item>
						);
					}

					const columns = getDropdownColumnCount(item.children?.length || 0);
					const itemValue = `ai-desktop-section-${item.id}`;
					const contentStyle = {
						'--ai-navigation-grid-columns': columns,
					} as CSSProperties;

					return (
						<NavigationMenu.Item
							key={`ai-nav-${item.id}-${index}`}
							value={itemValue}
						>
							<NavigationMenu.Trigger
								className={`${styles.navLink} ${styles.desktopTrigger} ${isActive ? styles.navLinkActive : ''}`}
								ref={(trigger) => {
									if (trigger) triggerRefs.current.set(itemValue, trigger);
									else triggerRefs.current.delete(itemValue);
								}}
								type='button'
								onClick={(event) => {
									if (
										event.detail > 0 &&
										lastPointerTypeRef.current === 'mouse'
									) {
										event.preventDefault();
									}
								}}
								onPointerDown={(event) => {
									lastPointerTypeRef.current = event.pointerType;
								}}
							>
								<NavLinkContent item={item} />
								<FiChevronDown
									aria-hidden='true'
									className={styles.desktopChevron}
								/>
							</NavigationMenu.Trigger>

							<NavigationMenu.Content
								className={styles.desktopNavigationContent}
								style={contentStyle}
							>
								<div className={styles.desktopDropdownGrid}>
									{(item.children || []).map((child, childIndex) => {
										const isChildActive = isNavigationItemActive(
											child,
											pathname,
										);

										return (
											<NavigationMenu.Link
												active={isChildActive}
												asChild
												key={`ai-dropdown-${item.id}-${child.id}-${childIndex}`}
											>
												<StudioNavLink
													className={`${styles.dropdownLink} ${child.isHighlighted ? styles.dropdownLinkHighlighted : ''} ${isChildActive ? styles.dropdownLinkActive : ''}`}
													item={child}
													pathname={pathname}
													onNavigate={onNavigate}
												/>
											</NavigationMenu.Link>
										);
									})}
								</div>
							</NavigationMenu.Content>
						</NavigationMenu.Item>
					);
				})}
			</NavigationMenu.List>

			<div className={styles.desktopViewportPosition} ref={viewportPositionRef}>
				<NavigationMenu.Viewport
					className={styles.desktopViewport}
					ref={viewportRef}
				/>
			</div>
		</NavigationMenu.Root>
	);
}

function MobileAccountCard({
	isLoading,
	session,
	onNavigate,
}: {
	isLoading: boolean;
	session: AiSession;
	onNavigate: () => void;
}) {
	const { locale, t } = useAiLocale();
	const profileHref = session.authenticated ? '/ai/profile' : '/ai/auth';
	const profileLabel = isLoading
		? t('Проверяем аккаунт…', 'Checking account…')
		: session.authenticated
			? session.user?.displayName || t('Профиль', 'Profile')
			: t('Войти', 'Sign in');

	return (
		<div className={styles.mobileAccountCard}>
			<Link
				className={styles.mobileProfileAction}
				href={profileHref}
				onClick={onNavigate}
			>
				<span aria-hidden='true' className={styles.mobileAccountIcon}>
					<FiUser />
				</span>
				<span className={styles.mobileAccountCopy}>
					<strong>{profileLabel}</strong>
					<small>
						{session.authenticated
							? session.user?.email ||
								t('Управление аккаунтом', 'Manage account')
							: t(
									'Войдите, чтобы сохранять работы',
									'Sign in to save your work',
								)}
					</small>
				</span>
			</Link>

			{session.authenticated && session.wallet ? (
				<Link
					aria-label={`${t('Баланс', 'Balance')}: ${formatCredits(session.wallet.availableCredits, locale)}`}
					className={styles.mobileBalanceAction}
					href='/ai/balance'
					onClick={onNavigate}
				>
					<FiZap aria-hidden='true' />
					<span>
						<small>{t('Баланс', 'Balance')}</small>
						<strong>
							{formatCredits(session.wallet.availableCredits, locale)}
						</strong>
					</span>
				</Link>
			) : null}
		</div>
	);
}

function MobileNavigationItem({
	isOpen,
	item,
	pathname,
	onNavigate,
	onToggle,
}: {
	isOpen: boolean;
	item: StudioNavigationItem;
	pathname: string;
	onNavigate: () => void;
	onToggle: () => void;
}) {
	const children = item.children || [];
	const isActive = isNavigationItemActive(item, pathname);
	const panelId = `ai-mobile-section-${String(item.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;

	if (!children.length) {
		return (
			<StudioNavLink item={item} pathname={pathname} onNavigate={onNavigate} />
		);
	}

	return (
		<div className={styles.mobileNavGroup}>
			<button
				aria-controls={panelId}
				aria-expanded={isOpen}
				className={`${styles.mobileNavTrigger} ${isActive ? styles.navLinkActive : ''}`}
				type='button'
				onClick={onToggle}
			>
				<NavLinkContent item={item} />
				<FiChevronDown
					aria-hidden='true'
					className={`${styles.mobileChevron} ${isOpen ? styles.mobileChevronOpen : ''}`}
				/>
			</button>
			{isOpen ? (
				<div className={styles.mobileNavChildren} id={panelId}>
					{children.map((child) => (
						<StudioNavLink
							className={`${styles.mobileChildLink} ${child.isHighlighted ? styles.dropdownLinkHighlighted : ''}`}
							item={child}
							key={child.id}
							pathname={pathname}
							onNavigate={onNavigate}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}

function StudioNavLink({
	className,
	item,
	pathname,
	onNavigate,
}: {
	className?: string;
	item: StudioNavigationItem;
	pathname: string;
	onNavigate?: () => void;
}) {
	const { locale } = useAiLocale();
	const isActive = isNavigationItemActive(item, pathname);
	const preloadCatalog = () => preloadChatCatalog(item.href, locale);

	return (
		<Link
			aria-current={isActive ? 'page' : undefined}
			aria-label={item.ariaLabel || undefined}
			className={
				className || `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
			}
			href={item.href}
			rel={item.target === '_blank' ? 'noreferrer' : undefined}
			target={item.target || '_self'}
			onClick={onNavigate}
			onFocus={preloadCatalog}
			onPointerDown={preloadCatalog}
			onPointerEnter={preloadCatalog}
		>
			<NavLinkContent item={item} />
		</Link>
	);
}

function NavLinkContent({ item }: { item: StudioNavigationItem }) {
	const badgeText = item.badgeText?.trim();

	return (
		<>
			<span aria-hidden='true' className={styles.navIcon}>
				{typeof item.icon === 'object' && item.icon ? (
					<AppIcon icon={item.icon} />
				) : (
					getNavigationIcon(item.icon)
				)}
			</span>
			<span className={styles.navLabel}>{item.label}</span>
			{badgeText ? <span className={styles.navBadge}>{badgeText}</span> : null}
		</>
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
			<span className={styles.creditValueFull}>
				{formatCreditNumber(value, locale)}
			</span>
			<span className={styles.creditValueCompact}>
				{formatCompactCreditNumber(value, locale)}
			</span>
		</>
	);
}

function formatCompactCreditNumber(value: number, locale: string): string {
	return new Intl.NumberFormat(locale, {
		compactDisplay: 'short',
		maximumFractionDigits: 1,
		notation: 'compact',
	}).format(value);
}

function normalizeDirectusNavigation(
	items: NavigationItem[],
): StudioNavigationItem[] {
	return items.map((item) => ({
		id: item.id,
		label: item.label,
		href: item.href,
		icon: item.icon,
		badgeText: item.badgeText,
		target: item.target,
		isHighlighted: item.isHighlighted,
		children: normalizeDirectusNavigation(item.children || []),
	}));
}

function normalizeApiNavigation(
	items: AiNavigationItem[],
): StudioNavigationItem[] {
	return items.map((item) => ({
		...item,
		target: '_self',
		children: normalizeApiNavigation(item.children || []),
	}));
}

function sortNavigation(items: StudioNavigationItem[]): StudioNavigationItem[] {
	return [...items]
		.sort((first, second) => (first.sort ?? 0) - (second.sort ?? 0))
		.map((item) => ({
			...item,
			children: sortNavigation(item.children || []),
		}));
}

function getEmergencyNavigation(isEnglish: boolean): StudioNavigationItem[] {
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
	item: StudioNavigationItem,
	pathname: string,
): boolean {
	const isCurrentPath =
		item.href.startsWith('/') &&
		(pathname === item.href ||
			(item.href !== '/ai' && pathname.startsWith(`${item.href}/`)));

	return (
		isCurrentPath ||
		(item.children || []).some((child) =>
			isNavigationItemActive(child, pathname),
		)
	);
}

function getDropdownColumnCount(itemCount: number): number {
	if (itemCount > 3) return 2;
	return 1;
}

function getNavigationIcon(icon?: string | NavigationIcon | null) {
	if (typeof icon !== 'string') return <RiSparkling2Fill />;

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

'use client';

import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import type {
	HeaderNavigation,
	NavigationItem,
	SocialLink,
} from '@/entities/navigation';
import { useBodyScrollLock } from '@/shared/lib/dom/useBodyScrollLock';
import { AppIcon } from '@/shared/ui/app-icon';
import { BrandIcon } from '@/shared/ui/brand-icon';
import { Container } from '@/shared/ui/container';
import { SiteHeaderLogo } from '@/shared/ui/site-header-logo';
import styles from './Header.module.scss';

const DESKTOP_MENU_DELAY_MS = 80;
const DESKTOP_MENU_SKIP_DELAY_MS = 250;
const DESKTOP_VIEWPORT_EDGE_GUTTER_PX = 24;

type HeaderViewProps = {
	navigation: HeaderNavigation;
};

export function HeaderView({ navigation }: HeaderViewProps) {
	const pathname = usePathname();
	const headerRef = useRef<HTMLDivElement>(null);
	const [desktopValue, setDesktopValue] = useState('');
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [mobileSectionId, setMobileSectionId] = useState<number | null>(null);
	const isNavigationOpen = Boolean(desktopValue) || isMobileMenuOpen;

	useBodyScrollLock(isNavigationOpen);

	useEffect(() => {
		function handleEscape(event: KeyboardEvent) {
			if (event.key !== 'Escape') {
				return;
			}

			setDesktopValue('');
			setIsMobileMenuOpen(false);
			setMobileSectionId(null);
		}

		function handlePointerDown(event: PointerEvent) {
			if (!isMobileMenuOpen) {
				return;
			}

			const target = event.target;

			if (
				target instanceof Node &&
				headerRef.current &&
				!headerRef.current.contains(target)
			) {
				setIsMobileMenuOpen(false);
				setMobileSectionId(null);
			}
		}

		document.addEventListener('keydown', handleEscape);
		document.addEventListener('pointerdown', handlePointerDown);

		return () => {
			document.removeEventListener('keydown', handleEscape);
			document.removeEventListener('pointerdown', handlePointerDown);
		};
	}, [isMobileMenuOpen]);

	function closeNavigation() {
		setDesktopValue('');
		setIsMobileMenuOpen(false);
		setMobileSectionId(null);
	}

	return (
		<header className={styles.header}>
			<Container className={styles.container}>
				<div className={styles.inner} ref={headerRef}>
					<Link
						aria-label='На главную'
						className={styles.logo}
						href='/'
						onClick={closeNavigation}
					>
						<SiteHeaderLogo logo={navigation.logo} />
						<span className={styles.logoText}>{navigation.siteName}</span>
					</Link>

					<button
						aria-controls='mobile-site-navigation'
						aria-expanded={isMobileMenuOpen}
						aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
						className={styles.burger}
						type='button'
						onClick={() => {
							setIsMobileMenuOpen((isOpen) => !isOpen);
							setMobileSectionId(null);
							setDesktopValue('');
						}}
					>
						<span className={styles.burgerLine} />
						<span className={styles.burgerLine} />
						<span className={styles.burgerLine} />
					</button>

					<div
						className={`${styles.content} ${isMobileMenuOpen ? styles.contentOpen : ''}`}
					>
						<DesktopNavigation
							items={navigation.items}
							pathname={pathname}
							value={desktopValue}
							onNavigate={closeNavigation}
							onValueChange={setDesktopValue}
						/>

						<MobileNavigation
							items={navigation.items}
							openSectionId={mobileSectionId}
							pathname={pathname}
							onNavigate={closeNavigation}
							onSectionChange={setMobileSectionId}
						/>

						{navigation.socialLinks.length > 0 && (
							<div aria-label='Социальные сети' className={styles.socials}>
								{navigation.socialLinks.map((link) => (
									<SocialLinkEntry key={link.id} link={link} />
								))}
							</div>
						)}
					</div>
				</div>
			</Container>
			<button
				aria-label='Закрыть меню'
				className={`${styles.menuBackdrop} ${isNavigationOpen ? styles.menuBackdropOpen : ''}`}
				disabled={!isNavigationOpen}
				type='button'
				onClick={closeNavigation}
			/>
		</header>
	);
}

type DesktopNavigationProps = {
	items: NavigationItem[];
	pathname: string;
	value: string;
	onNavigate: () => void;
	onValueChange: (value: string) => void;
};

function DesktopNavigation({
	items,
	pathname,
	value,
	onNavigate,
	onValueChange,
}: DesktopNavigationProps) {
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

		if (!navigation || !trigger || !viewportPosition) {
			return;
		}

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
			'--desktop-viewport-anchor',
			`${viewportAnchor}px`,
		);
	}, []);

	useEffect(() => {
		if (!value) {
			return;
		}

		const updatePosition = () => updateViewportPosition(value);
		const navigation = navigationRef.current;
		const trigger = triggerRefs.current.get(value);
		const viewport = viewportRef.current;
		const resizeObserver = new ResizeObserver(updatePosition);

		updatePosition();
		window.addEventListener('resize', updatePosition);

		if (navigation) {
			resizeObserver.observe(navigation);
		}

		if (trigger) {
			resizeObserver.observe(trigger);
		}

		if (viewport) {
			resizeObserver.observe(viewport);
		}

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener('resize', updatePosition);
		};
	}, [updateViewportPosition, value]);

	function handleValueChange(nextValue: string) {
		if (nextValue) {
			updateViewportPosition(nextValue);
		}

		onValueChange(nextValue);
	}

	return (
		<NavigationMenu.Root
			aria-label='Основная навигация'
			className={styles.desktopNavigation}
			delayDuration={DESKTOP_MENU_DELAY_MS}
			ref={navigationRef}
			skipDelayDuration={DESKTOP_MENU_SKIP_DELAY_MS}
			value={value}
			onValueChange={handleValueChange}
		>
			<NavigationMenu.List className={styles.desktopNavigationList}>
				{items.map((item, index) => {
					const isActive = isNavigationItemActive(item, pathname);

					if (item.children.length === 0) {
						return (
							<NavigationMenu.Item key={`desktop-nav-${item.id}-${index}`}>
								<NavigationMenu.Link active={isActive} asChild>
									<Link
										aria-current={isActive ? 'page' : undefined}
										className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
										href={item.href}
										rel={item.target === '_blank' ? 'noreferrer' : undefined}
										target={item.target}
										onClick={onNavigate}
									>
										<NavLinkContent item={item} />
									</Link>
								</NavigationMenu.Link>
							</NavigationMenu.Item>
						);
					}

					const columns = getDropdownColumnCount(item.children.length);
					const contentStyle = {
						'--navigation-grid-columns': columns,
					} as CSSProperties;
					const itemValue = `desktop-section-${item.id}`;

					return (
						<NavigationMenu.Item
							key={`desktop-nav-${item.id}-${index}`}
							value={itemValue}
						>
							<NavigationMenu.Trigger
								className={`${styles.navLink} ${styles.desktopTrigger} ${isActive ? styles.navLinkActive : ''}`}
								ref={(trigger) => {
									if (trigger) {
										triggerRefs.current.set(itemValue, trigger);
									} else {
										triggerRefs.current.delete(itemValue);
									}
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
								<FaChevronDown
									aria-hidden='true'
									className={styles.desktopChevron}
								/>
							</NavigationMenu.Trigger>

							<NavigationMenu.Content
								className={styles.desktopNavigationContent}
								style={contentStyle}
							>
								<DesktopDropdownContent
									item={item}
									pathname={pathname}
									onNavigate={onNavigate}
								/>
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

function DesktopDropdownContent({
	item,
	pathname,
	onNavigate,
}: {
	item: NavigationItem;
	pathname: string;
	onNavigate: () => void;
}) {
	return (
		<div className={styles.desktopDropdownInner}>
			<div className={styles.desktopDropdownGrid}>
				{item.children.map((child, index) => {
					const isActive = isNavigationItemActive(child, pathname);

					return (
						<NavigationMenu.Link
							active={isActive}
							asChild
							key={`desktop-dropdown-${item.id}-${child.id}-${index}`}
						>
							<Link
								aria-current={isActive ? 'page' : undefined}
								className={`${styles.dropdownLink} ${child.isHighlighted ? styles.dropdownLinkHighlighted : ''} ${isActive ? styles.dropdownLinkActive : ''}`}
								href={child.href}
								rel={child.target === '_blank' ? 'noreferrer' : undefined}
								target={child.target}
								onClick={onNavigate}
							>
								<NavLinkContent item={child} />
							</Link>
						</NavigationMenu.Link>
					);
				})}
			</div>
		</div>
	);
}

type MobileNavigationProps = {
	items: NavigationItem[];
	openSectionId: number | null;
	pathname: string;
	onNavigate: () => void;
	onSectionChange: (id: number | null) => void;
};

function MobileNavigation({
	items,
	openSectionId,
	pathname,
	onNavigate,
	onSectionChange,
}: MobileNavigationProps) {
	return (
		<nav
			aria-label='Мобильная навигация'
			className={styles.mobileNavigation}
			id='mobile-site-navigation'
		>
			{items.map((item, index) => {
				const isActive = isNavigationItemActive(item, pathname);
				const isOpen = openSectionId === item.id;
				const panelId = `mobile-navigation-section-${item.id}`;

				if (item.children.length === 0) {
					return (
						<Link
							aria-current={isActive ? 'page' : undefined}
							className={`${styles.mobileNavLink} ${isActive ? styles.navLinkActive : ''}`}
							href={item.href}
							key={`mobile-nav-${item.id}-${index}`}
							rel={item.target === '_blank' ? 'noreferrer' : undefined}
							target={item.target}
							onClick={onNavigate}
						>
							<NavLinkContent item={item} />
						</Link>
					);
				}

				return (
					<div
						className={styles.mobileNavigationSection}
						key={`mobile-nav-${item.id}-${index}`}
					>
						<button
							aria-controls={panelId}
							aria-expanded={isOpen}
							className={`${styles.mobileNavLink} ${styles.mobileTrigger} ${isActive ? styles.navLinkActive : ''}`}
							type='button'
							onClick={() => onSectionChange(isOpen ? null : item.id)}
						>
							<NavLinkContent item={item} />
							<FaChevronDown
								aria-hidden='true'
								className={`${styles.mobileChevron} ${isOpen ? styles.mobileChevronOpen : ''}`}
							/>
						</button>

						{isOpen && (
							<div className={styles.mobileDropdownPanel} id={panelId}>
								{item.children.map((child, childIndex) => {
									const isChildActive = isNavigationItemActive(child, pathname);

									return (
										<Link
											aria-current={isChildActive ? 'page' : undefined}
											className={`${styles.mobileDropdownLink} ${child.isHighlighted ? styles.dropdownLinkHighlighted : ''} ${isChildActive ? styles.dropdownLinkActive : ''}`}
											href={child.href}
											key={`mobile-dropdown-${item.id}-${child.id}-${childIndex}`}
											rel={child.target === '_blank' ? 'noreferrer' : undefined}
											target={child.target}
											onClick={onNavigate}
										>
											<NavLinkContent item={child} />
										</Link>
									);
								})}
							</div>
						)}
					</div>
				);
			})}
		</nav>
	);
}

function getDropdownColumnCount(itemCount: number): number {
	if (itemCount > 3) return 2;
	return 1;
}

function isNavigationItemActive(
	item: NavigationItem,
	pathname: string,
): boolean {
	return (
		isPathActive(item.href, pathname) ||
		item.children.some((child) => isNavigationItemActive(child, pathname))
	);
}

function isPathActive(href: string, pathname: string): boolean {
	if (!href || href.startsWith('http') || href.startsWith('#')) {
		return false;
	}

	const normalizedHref = normalizePath(href);
	const normalizedPathname = normalizePath(pathname);

	if (normalizedHref === '/') {
		return normalizedPathname === '/';
	}

	return (
		normalizedPathname === normalizedHref ||
		normalizedPathname.startsWith(`${normalizedHref}/`)
	);
}

function normalizePath(path: string): string {
	const pathname = path.split(/[?#]/)[0] || '/';
	const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;

	return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

function NavLinkContent({ item }: { item: NavigationItem }) {
	const badgeText = item.badgeText?.trim();

	return (
		<>
			<AppIcon className={styles.navIcon} icon={item.icon} />
			<span className={styles.navLabel}>{item.label}</span>
			{badgeText ? <span className={styles.navBadge}>{badgeText}</span> : null}
		</>
	);
}

function SocialLinkEntry({ link }: { link: SocialLink }) {
	return (
		<a
			aria-label={link.title}
			className={styles.socialLink}
			href={link.url}
			rel='noreferrer'
			target='_blank'
			title={link.title}
		>
			<BrandIcon className={styles.socialIcon} platform={link.platform} />
		</a>
	);
}

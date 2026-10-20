'use client';

import { usePathname } from 'next/navigation';
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import {
	COOKIE_SETTINGS_EVENT,
	OPEN_MODAL_EVENT,
} from '@/shared/lib/site-notices/actions';
import {
	canRepeatNotice,
	cookieRevision,
	currentCookieAcknowledgement,
	isNoticeEligible,
	modalFromHash,
	noticeRevision,
	noticeTriggerReached,
	parseNoticeHistory,
} from '@/shared/lib/site-notices/policy';
import {
	COOKIE_NOTICE_KEY,
	NOTICE_HISTORY_KEY,
	noticeSessionId,
	readNoticeStorage,
	resetNoticeStorage,
	subscribeNoticeStorage,
	writeNoticeStorage,
} from '@/shared/lib/site-notices/storage';
import type {
	NoticeButton,
	SiteNotice,
	SiteNoticesConfig,
} from '@/shared/lib/site-notices/types';
import { Dialog } from '@/shared/ui/dialog/Dialog';
import { CookieNotice } from '../ui/CookieNotice';
import { NoticeContent } from '../ui/NoticeContent';
import styles from '../ui/SiteNotices.module.scss';

type ContextValue = {
	openModal: (key: string) => boolean;
	openCookieSettings: () => void;
	config: SiteNoticesConfig;
	preview: {
		setConfig: (config: SiteNoticesConfig | null) => void;
		reset: () => void;
	} | null;
};
const Context = createContext<ContextValue | null>(null);
type UiState = {
	dialog: string | null;
	path: string;
	floating: string | null;
	error: string | null;
};
type UiAction =
	| { type: 'dialog'; id: string; path: string }
	| { type: 'close' }
	| { type: 'floating'; id: string | null; path: string }
	| { type: 'error'; message: string | null }
	| { type: 'route'; path: string };
function reducer(state: UiState, action: UiAction): UiState {
	switch (action.type) {
		case 'dialog':
			return { ...state, dialog: action.id, path: action.path };
		case 'close':
			return { ...state, dialog: null };
		case 'floating':
			return { ...state, floating: action.id, path: action.path };
		case 'error':
			return { ...state, error: action.message };
		case 'route':
			return state.path === action.path
				? state
				: { ...state, dialog: null, floating: null, path: action.path };
	}
}
const noopSubscribe = () => () => undefined;
const emptySnapshot = () => null;

/** Ignores closed legacy sheets; never promotes over checkout, galleries or forms. */
function blockingUi(): boolean {
	if (document.fullscreenElement) return true;
	if (
		document.activeElement instanceof HTMLElement &&
		document.activeElement.matches(
			'input,textarea,select,[contenteditable="true"]',
		)
	)
		return true;
	return [
		...document.querySelectorAll<HTMLElement>(
			'[aria-modal="true"],dialog[open],header [aria-expanded="true"],[role="listbox"],[role="menu"]',
		),
	].some(
		(element) =>
			!element.closest('[aria-hidden="true"],[hidden]') &&
			element.getClientRects().length > 0,
	);
}

export function SiteNoticesProvider({
	initialConfig,
	children,
}: {
	initialConfig: SiteNoticesConfig;
	children: ReactNode;
}) {
	const pathname = usePathname() || '/';
	const hydrated = useSyncExternalStore(
		noopSubscribe,
		() => true,
		() => false,
	);
	const cookieRaw = useSyncExternalStore(
		subscribeNoticeStorage,
		() => readNoticeStorage(COOKIE_NOTICE_KEY),
		emptySnapshot,
	);
	const historyRaw = useSyncExternalStore(
		subscribeNoticeStorage,
		() => readNoticeStorage(NOTICE_HISTORY_KEY),
		emptySnapshot,
	);
	const [remoteConfig, setRemoteConfig] = useState(initialConfig);
	const [previewConfig, setPreviewConfig] = useState<SiteNoticesConfig | null>(
		null,
	);
	const [ui, dispatch] = useReducer(reducer, {
		dialog: null,
		floating: null,
		path: pathname,
		error: null,
	});
	const config = previewConfig || remoteConfig;
	const revision = cookieRevision(config.cookies);
	const acknowledged = useMemo(
		() => currentCookieAcknowledgement(cookieRaw, revision),
		[cookieRaw, revision],
	);
	const cookieRequired = hydrated && config.cookies.enabled && !acknowledged;
	const history = useMemo(() => parseNoticeHistory(historyRaw), [historyRaw]);
	const session = useRef('');
	const [blocked, setBlocked] = useState(false);
	const [scheduleRevision, resetSchedule] = useReducer(
		(value: number) => value + 1,
		0,
	);
	const latest = useRef({ config, cookieRequired, history, ui });
	useEffect(() => {
		latest.current = { config, cookieRequired, history, ui };
	});
	useEffect(() => {
		session.current = noticeSessionId();
	}, []);

	const remember = useCallback((notice: SiteNotice) => {
		const previous = parseNoticeHistory(readNoticeStorage(NOTICE_HISTORY_KEY));
		writeNoticeStorage(
			NOTICE_HISTORY_KEY,
			JSON.stringify({
				...previous,
				[notice.id]: {
					revision: noticeRevision(notice),
					at: Date.now(),
					session: session.current,
				},
			}),
		);
	}, []);
	const closeModal = useCallback(() => {
		dispatch({ type: 'close' });
		if (modalFromHash(location.hash) || location.hash === '#cookie-settings')
			window.history.replaceState(
				window.history.state,
				'',
				location.pathname + location.search,
			);
	}, []);
	const openModal = useCallback(
		(key: string): boolean => {
			const notice = config.notices.find(
				(n) => n.kind === 'modal' && (n.key === key || n.id === key),
			);
			if (!notice) {
				dispatch({
					type: 'error',
					message: 'Это окно пока недоступно. Попробуйте обновить страницу.',
				});
				return false;
			}
			remember(notice);
			dispatch({ type: 'dialog', id: notice.id, path: pathname });
			return true;
		},
		[config.notices, pathname, remember],
	);
	const openCookies = useCallback(
		() => dispatch({ type: 'dialog', id: 'cookies', path: pathname }),
		[pathname],
	);
	const acknowledgeCookies = useCallback(() => {
		writeNoticeStorage(
			COOKIE_NOTICE_KEY,
			JSON.stringify({ revision, at: Date.now() }),
		);
		closeModal();
	}, [revision, closeModal]);

	useEffect(() => {
		const abort = new AbortController();
		let inFlight = false;
		async function refresh() {
			if (document.hidden || inFlight) return;
			inFlight = true;
			try {
				const response = await fetch('/api/site-notices', {
					signal: abort.signal,
				});
				if (!response.ok) throw new Error('Configuration unavailable');
				const next: SiteNoticesConfig = await response.json();
				if (
					Array.isArray(next.notices) &&
					next.cookies &&
					typeof next.cookies.version === 'string'
				)
					setRemoteConfig(next);
			} catch (error) {
				if (!abort.signal.aborted)
					console.warn(
						'[Site notices] Configuration refresh failed; previous settings retained.',
						error instanceof Error ? error.name : 'network',
					);
			} finally {
				inFlight = false;
			}
		}
		void refresh();
		const timer = window.setInterval(() => void refresh(), 30000);
		window.addEventListener('focus', refresh);
		return () => {
			abort.abort();
			window.clearInterval(timer);
			window.removeEventListener('focus', refresh);
		};
	}, [pathname]);

	useEffect(() => {
		function clicked(event: MouseEvent) {
			if (
				event.defaultPrevented ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey ||
				!(event.target instanceof Element)
			)
				return;
			const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
			if (
				!anchor ||
				anchor.target === '_blank' ||
				anchor.hasAttribute('data-notice-action')
			)
				return;
			const url = new URL(anchor.href, location.href);
			if (
				url.origin !== location.origin ||
				url.pathname !== location.pathname ||
				url.search !== location.search
			)
				return;
			const id = modalFromHash(url.hash);
			if (id) {
				event.preventDefault();
				openModal(id);
			} else if (url.hash === '#cookie-settings') {
				event.preventDefault();
				openCookies();
			}
		}
		function hashChanged() {
			const id = modalFromHash(location.hash);
			if (id) openModal(id);
			else if (location.hash === '#cookie-settings') openCookies();
		}
		function requested(event: Event) {
			if (event instanceof CustomEvent && typeof event.detail === 'string')
				openModal(event.detail);
		}
		document.addEventListener('click', clicked, true);
		window.addEventListener('hashchange', hashChanged);
		window.addEventListener(OPEN_MODAL_EVENT, requested);
		window.addEventListener(COOKIE_SETTINGS_EVENT, openCookies);
		const frame = window.requestAnimationFrame(hashChanged);
		return () => {
			window.cancelAnimationFrame(frame);
			document.removeEventListener('click', clicked, true);
			window.removeEventListener('hashchange', hashChanged);
			window.removeEventListener(OPEN_MODAL_EVENT, requested);
			window.removeEventListener(COOKIE_SETTINGS_EVENT, openCookies);
		};
	}, [openModal, openCookies]);

	useEffect(() => {
		let seconds = 0;
		let previousTime = performance.now();
		const shown = new Map<
			SiteNotice['kind'],
			{ id: string; revision: string }
		>();
		const viewportHeight = window.innerHeight;
		const reset = window.setTimeout(
			() => dispatch({ type: 'route', path: pathname }),
			0,
		);
		const timer = window.setInterval(() => {
			const now = performance.now();
			const delta = Math.max(0, Math.min((now - previousTime) / 1000, 1));
			previousTime = now;
			const current = latest.current;
			const date = Date.now();
			const currentFloating = current.config.notices.find(
				(n) => n.id === current.ui.floating,
			);
			if (
				current.ui.path === pathname &&
				current.ui.floating &&
				(!currentFloating || !isNoticeEligible(currentFloating, pathname, date))
			)
				dispatch({ type: 'floating', id: null, path: pathname });
			const blockedNow = blockingUi();
			setBlocked((previous) =>
				previous === blockedNow ? previous : blockedNow,
			);
			const dialogOpen =
				current.ui.path === pathname &&
				(current.ui.dialog === 'cookies' ||
					current.config.notices.some((n) => n.id === current.ui.dialog));
			if (document.hidden || current.cookieRequired || blockedNow || dialogOpen)
				return;
			seconds += delta;
			const screens = window.scrollY / Math.max(1, viewportHeight);
			const mobile = window.matchMedia('(max-width: 768px)').matches;
			const ready = current.config.notices
				.filter(
					(n) =>
						isNoticeEligible(n, pathname, date) &&
						noticeTriggerReached(n, seconds, screens, mobile) &&
						canRepeatNotice(n, current.history, session.current, date),
				)
				.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
			const available = (n: SiteNotice) => {
				const previous = shown.get(n.kind);
				return (
					!previous ||
					(previous.id === n.id && previous.revision !== noticeRevision(n))
				);
			};
			const modal = ready.find((n) => n.kind === 'modal' && available(n));
			if (modal) {
				shown.set('modal', { id: modal.id, revision: noticeRevision(modal) });
				remember(modal);
				dispatch({ type: 'dialog', id: modal.id, path: pathname });
				return;
			}
			const floating = ready.find((n) => n.kind === 'floating' && available(n));
			if (floating) {
				shown.set('floating', {
					id: floating.id,
					revision: noticeRevision(floating),
				});
				dispatch({ type: 'floating', id: floating.id, path: pathname });
			}
		}, 250);
		return () => {
			window.clearTimeout(reset);
			window.clearInterval(timer);
		};
	}, [pathname, remember, scheduleRevision]);

	useEffect(() => {
		if (!ui.error) return;
		const timer = window.setTimeout(
			() => dispatch({ type: 'error', message: null }),
			5000,
		);
		return () => window.clearTimeout(timer);
	}, [ui.error]);

	const modal =
		ui.path === pathname
			? config.notices.find((n) => n.id === ui.dialog && n.kind === 'modal')
			: null;
	const cookieDialog = ui.path === pathname && ui.dialog === 'cookies';
	const floating =
		ui.path === pathname
			? config.notices.find(
					(n) => n.id === ui.floating && n.kind === 'floating',
				)
			: null;
	function dismissFloating() {
		if (floating) remember(floating);
		dispatch({ type: 'floating', id: null, path: pathname });
	}
	function action(button: NoticeButton, notice: SiteNotice) {
		remember(notice);
		if (notice.kind === 'floating') dismissFloating();
		const target =
			button.action === 'modal'
				? button.modal
				: button.action === 'link'
					? modalFromHash(button.href)
					: null;
		if (target) openModal(target);
		else if (button.href === '#cookie-settings') openCookies();
		else closeModal();
	}
	const resetPreview = useCallback(() => {
		resetNoticeStorage();
		dispatch({ type: 'close' });
		dispatch({ type: 'floating', id: null, path: pathname });
		resetSchedule();
	}, [pathname]);
	const preview = useMemo(
		() =>
			process.env.NODE_ENV === 'production'
				? null
				: { setConfig: setPreviewConfig, reset: resetPreview },
		[resetPreview],
	);
	const value = useMemo(
		() => ({ openModal, openCookieSettings: openCookies, config, preview }),
		[openModal, openCookies, config, preview],
	);
	return (
		<Context.Provider value={value}>
			{children}
			{hydrated && modal && (
				<Dialog key={modal.id} titleId='site-modal-title' onClose={closeModal}>
					<NoticeContent
						notice={modal}
						onClose={closeModal}
						onAction={(button) => action(button, modal)}
					/>
				</Dialog>
			)}
			{hydrated && cookieDialog && (
				<Dialog
					key={`cookies-${revision}`}
					titleId='site-cookie-title'
					onClose={closeModal}
				>
					<CookieNotice
						inDialog
						settings={config.cookies}
						onAcknowledge={acknowledgeCookies}
					/>
				</Dialog>
			)}
			{hydrated &&
				!modal &&
				!cookieDialog &&
				!blocked &&
				createPortal(
					<>
						{cookieRequired ? (
							<CookieNotice
								settings={config.cookies}
								onAcknowledge={acknowledgeCookies}
							/>
						) : floating ? (
							<aside
								className={styles.floating}
								role='region'
								aria-labelledby='site-floating-title'
								data-floating-notice
							>
								<NoticeContent
									floating
									notice={floating}
									onClose={dismissFloating}
									onAction={(button) => action(button, floating)}
								/>
							</aside>
						) : null}
						{ui.error && (
							<div className={styles.error} role='status'>
								{ui.error}
							</div>
						)}
					</>,
					document.body,
				)}
		</Context.Provider>
	);
}

export function useSiteNotices(): ContextValue {
	const context = useContext(Context);
	if (!context) throw new Error('SiteNoticesProvider is required');
	return context;
}

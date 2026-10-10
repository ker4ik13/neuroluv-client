'use client';

import {
	createContext,
	useCallback,
	useContext,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';

export type AiTheme = 'system' | 'light' | 'dark';
export type ResolvedAiTheme = Exclude<AiTheme, 'system'>;

type AiThemeContextValue = {
	theme: AiTheme;
	resolvedTheme: ResolvedAiTheme;
	setTheme: (theme: AiTheme) => void;
	applyAccountTheme: (theme: AiTheme) => void;
};

export const AI_THEME_STORAGE_KEY = 'neuroluv-ai:theme';

const AiThemeContext = createContext<AiThemeContextValue | null>(null);

export function AiThemeProvider({ children }: { children: React.ReactNode }) {
	const systemTheme = useSyncExternalStore(
		subscribeSystemTheme,
		getSystemThemeSnapshot,
		getServerThemeSnapshot,
	);
	const storedTheme = useSyncExternalStore(
		subscribeStoredTheme,
		getStoredThemeSnapshot,
		getServerStoredThemeSnapshot,
	);
	const [selectedTheme, setSelectedTheme] = useState<AiTheme | null>(null);
	const hasExplicitChoice = useRef(false);
	const theme = selectedTheme || storedTheme;
	const resolvedTheme = theme === 'system' ? systemTheme : theme;

	useLayoutEffect(() => {
		const previousTheme = document.documentElement.dataset.aiTheme;
		const previousColorScheme = document.documentElement.style.colorScheme;
		document.documentElement.dataset.aiThemeChanging = 'true';
		document.documentElement.dataset.aiTheme = resolvedTheme;
		document.documentElement.style.colorScheme = resolvedTheme;
		// Apply the whole palette in one paint; keep normal hover transitions afterwards.
		let frame = window.requestAnimationFrame(() => {
			frame = window.requestAnimationFrame(() => {
				delete document.documentElement.dataset.aiThemeChanging;
			});
		});
		return () => {
			window.cancelAnimationFrame(frame);
			delete document.documentElement.dataset.aiThemeChanging;
			if (previousTheme)
				document.documentElement.dataset.aiTheme = previousTheme;
			else delete document.documentElement.dataset.aiTheme;
			document.documentElement.style.colorScheme = previousColorScheme;
		};
	}, [resolvedTheme]);

	const setTheme = useCallback((nextTheme: AiTheme) => {
		hasExplicitChoice.current = true;
		setSelectedTheme(nextTheme);
		try {
			window.localStorage.setItem(AI_THEME_STORAGE_KEY, nextTheme);
		} catch {
			console.warn('[Studio theme] Device preference could not be saved.');
		}
		window.dispatchEvent(new Event('neuroluv-ai-theme-change'));
	}, []);

	const applyAccountTheme = useCallback((accountTheme: AiTheme) => {
		if (!hasExplicitChoice.current && !readThemePreference())
			setSelectedTheme(accountTheme);
	}, []);

	const value = useMemo(
		() => ({ theme, resolvedTheme, setTheme, applyAccountTheme }),
		[resolvedTheme, setTheme, theme, applyAccountTheme],
	);

	return (
		<AiThemeContext.Provider value={value}>{children}</AiThemeContext.Provider>
	);
}

export function useAiTheme(): AiThemeContextValue {
	const context = useContext(AiThemeContext);
	if (!context) {
		throw new Error('useAiTheme must be used inside AiThemeProvider');
	}
	return context;
}

function normalizeTheme(value: string | null): AiTheme {
	return value === 'light' || value === 'dark' || value === 'system'
		? value
		: 'light';
}

function subscribeSystemTheme(listener: () => void): () => void {
	const query = window.matchMedia('(prefers-color-scheme: dark)');
	query.addEventListener('change', listener);
	return () => query.removeEventListener('change', listener);
}

function getSystemThemeSnapshot(): ResolvedAiTheme {
	return window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'dark'
		: 'light';
}

function getServerThemeSnapshot(): ResolvedAiTheme {
	return 'light';
}

function subscribeStoredTheme(listener: () => void): () => void {
	const handleStorage = (event: StorageEvent) => {
		if (event.key === AI_THEME_STORAGE_KEY) listener();
	};
	window.addEventListener('storage', handleStorage);
	window.addEventListener('neuroluv-ai-theme-change', listener);
	return () => {
		window.removeEventListener('storage', handleStorage);
		window.removeEventListener('neuroluv-ai-theme-change', listener);
	};
}

function getStoredThemeSnapshot(): AiTheme {
	return normalizeTheme(readThemePreference());
}

function readThemePreference(): string | null {
	try {
		return window.localStorage.getItem(AI_THEME_STORAGE_KEY);
	} catch {
		console.warn('[Studio theme] Device preference is unavailable.');
		return null;
	}
}

function getServerStoredThemeSnapshot(): AiTheme {
	return 'light';
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

export type AiTheme = "system" | "light" | "dark";
export type ResolvedAiTheme = Exclude<AiTheme, "system">;

type AiThemeContextValue = {
  theme: AiTheme;
  resolvedTheme: ResolvedAiTheme;
  setTheme: (theme: AiTheme) => void;
};

export const AI_THEME_STORAGE_KEY = "neuroluv-ai:theme";

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
  const theme = selectedTheme || storedTheme;
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useLayoutEffect(() => {
    document.documentElement.dataset.aiTheme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback((nextTheme: AiTheme) => {
    setSelectedTheme(nextTheme);
    window.localStorage.setItem(AI_THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event("neuroluv-ai-theme-change"));
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme],
  );

  return <AiThemeContext.Provider value={value}>{children}</AiThemeContext.Provider>;
}

export function useAiTheme(): AiThemeContextValue {
  const context = useContext(AiThemeContext);
  if (!context) {
    throw new Error("useAiTheme must be used inside AiThemeProvider");
  }
  return context;
}

function normalizeTheme(value: string | null): AiTheme {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

function subscribeSystemTheme(listener: () => void): () => void {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function getSystemThemeSnapshot(): ResolvedAiTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getServerThemeSnapshot(): ResolvedAiTheme {
  return "light";
}

function subscribeStoredTheme(listener: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === AI_THEME_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener("neuroluv-ai-theme-change", listener);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("neuroluv-ai-theme-change", listener);
  };
}

function getStoredThemeSnapshot(): AiTheme {
  return normalizeTheme(window.localStorage.getItem(AI_THEME_STORAGE_KEY));
}

function getServerStoredThemeSnapshot(): AiTheme {
  return "system";
}

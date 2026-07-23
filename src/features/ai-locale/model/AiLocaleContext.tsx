"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { useAiSession } from "@/features/ai-session";

export type AiLocale = "ru-RU" | "en-US";

type AiLocaleContextValue = {
  locale: AiLocale;
  isEnglish: boolean;
  setLocale: (locale: AiLocale) => void;
  t: (russian: string, english: string) => string;
};

const STORAGE_KEY = "neuroluv-ai:locale";
const AiLocaleContext = createContext<AiLocaleContextValue | null>(null);

export function AiLocaleProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAiSession();
  const fallbackLocale = useSyncExternalStore(
    subscribeStoredLocale,
    getStoredLocaleSnapshot,
    getServerLocaleSnapshot,
  );
  const [selectedLocale, setSelectedLocale] = useState<AiLocale | null>(null);
  const locale = selectedLocale || normalizeAiLocale(session.user?.locale) || fallbackLocale;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale === "en-US" ? "en" : "ru";
  }, [locale]);

  const setLocale = useCallback((nextLocale: AiLocale) => {
    setSelectedLocale(nextLocale);
  }, []);
  const t = useCallback(
    (russian: string, english: string) => (locale === "en-US" ? english : russian),
    [locale],
  );
  const value = useMemo(
    () => ({ locale, isEnglish: locale === "en-US", setLocale, t }),
    [locale, setLocale, t],
  );

  return <AiLocaleContext.Provider value={value}>{children}</AiLocaleContext.Provider>;
}

export function useAiLocale(): AiLocaleContextValue {
  const context = useContext(AiLocaleContext);
  if (!context) {
    throw new Error("useAiLocale must be used inside AiLocaleProvider");
  }
  return context;
}

export function withAiLocale(path: string, locale: AiLocale): string {
  if (!shouldLocalize(path)) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}locale=${encodeURIComponent(locale)}`;
}

function shouldLocalize(path: string): boolean {
  return (
    path.startsWith("/catalog/navigation") ||
    path.startsWith("/catalog/tools") ||
    path.startsWith("/catalog/prompts") ||
    path.startsWith("/catalog/faq") ||
    path.startsWith("/billing/products")
  );
}

function normalizeAiLocale(value: string | null | undefined): AiLocale | null {
  return value === "en-US" || value === "ru-RU" ? value : null;
}

function subscribeStoredLocale(listener: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

function getStoredLocaleSnapshot(): AiLocale {
  return normalizeAiLocale(window.localStorage.getItem(STORAGE_KEY)) ||
    (window.navigator.language.toLowerCase().startsWith("en") ? "en-US" : "ru-RU");
}

function getServerLocaleSnapshot(): AiLocale {
  return "ru-RU";
}

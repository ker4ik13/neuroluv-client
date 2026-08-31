"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AiApiError,
  aiApiFetch,
  type AiSession,
  type AiTelegramMiniAppAuth,
  clearAiCsrfToken,
} from "@/shared/api/ai";

const TELEGRAM_SDK_READY_EVENT = "neuroluv:telegram-sdk-ready";
const TELEGRAM_SDK_WAIT_MS = 2_500;

type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

type AiSessionContextValue = {
  session: AiSession;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const GUEST_SESSION: AiSession = {
  authenticated: false,
  user: null,
  wallet: null,
};

const AiSessionContext = createContext<AiSessionContextValue | null>(null);

export function AiSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AiSession>(GUEST_SESSION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshRequest = useRef<Promise<void> | null>(null);

  const refresh = useCallback(() => {
    if (refreshRequest.current) return refreshRequest.current;

    // Revalidation after user actions must not replace page content with its
    // initial loading state. `isLoading` is reserved for the first session load.
    const request = (async () => {
      setError(null);

      try {
        setSession(await aiApiFetch<AiSession>("/auth/me"));
      } catch (requestError) {
        if (
          requestError instanceof AiApiError &&
          requestError.problem.status === 401
        ) {
          try {
            const miniAppResult = await authenticateTelegramMiniApp();
            if (miniAppResult?.registrationRequired) {
              window.location.replace(miniAppResult.registrationUrl);
              return;
            }
            if (miniAppResult?.authenticated) {
              clearAiCsrfToken();
              setSession(miniAppResult);
            } else {
              setSession(GUEST_SESSION);
            }
          } catch (miniAppError) {
            setSession(GUEST_SESSION);
            setError(
              miniAppError instanceof Error
                ? miniAppError.message
                : "Не удалось войти через Telegram Mini App",
            );
          }
        } else {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Не удалось проверить сессию",
          );
        }
      } finally {
        setIsLoading(false);
      }
    })();
    refreshRequest.current = request;
    void request.finally(() => {
      if (refreshRequest.current === request) refreshRequest.current = null;
    });
    return request;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);

    return () => window.clearTimeout(timer);
  }, [refresh]);

  const value = useMemo(
    () => ({ session, isLoading, error, refresh }),
    [error, isLoading, refresh, session],
  );

  return (
    <AiSessionContext.Provider value={value}>
      {children}
    </AiSessionContext.Provider>
  );
}

async function authenticateTelegramMiniApp(): Promise<AiTelegramMiniAppAuth | null> {
  if (window.location.pathname === "/ai/auth/telegram-complete") return null;

  const webApp = await waitForTelegramWebApp();
  const initData = webApp?.initData?.trim();
  if (!webApp || !initData) return null;

  try {
    webApp.ready?.();
    webApp.expand?.();
  } catch {
    // Authentication relies on signed initData; viewport helpers are optional.
  }

  const returnTo = `${window.location.pathname}${window.location.search}`;
  return aiApiFetch<AiTelegramMiniAppAuth>("/auth/telegram/mini-app", {
    method: "POST",
    body: { initData, returnTo },
    csrf: false,
  });
}

function waitForTelegramWebApp(): Promise<TelegramWebApp | null> {
  const current = window.Telegram?.WebApp;
  if (current) return Promise.resolve(current);
  const launchParameters = `${window.location.search}&${window.location.hash}`;
  if (!launchParameters.includes("tgWebAppData")) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.removeEventListener(TELEGRAM_SDK_READY_EVENT, handleReady);
      resolve(window.Telegram?.WebApp || null);
    };
    const handleReady = () => finish();
    const timeout = window.setTimeout(finish, TELEGRAM_SDK_WAIT_MS);
    window.addEventListener(TELEGRAM_SDK_READY_EVENT, handleReady, {
      once: true,
    });
  });
}

export function useAiSession(): AiSessionContextValue {
  const context = useContext(AiSessionContext);

  if (!context) {
    throw new Error("useAiSession must be used inside AiSessionProvider");
  }

  return context;
}

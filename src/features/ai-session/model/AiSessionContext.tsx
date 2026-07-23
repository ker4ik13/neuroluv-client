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

import { AiApiError, aiApiFetch, type AiSession } from "@/shared/api/ai";

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
        if (requestError instanceof AiApiError && requestError.problem.status === 401) {
          setSession(GUEST_SESSION);
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

export function useAiSession(): AiSessionContextValue {
  const context = useContext(AiSessionContext);

  if (!context) {
    throw new Error("useAiSession must be used inside AiSessionProvider");
  }

  return context;
}

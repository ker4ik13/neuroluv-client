"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const METRIKA_SCRIPT_URL = "https://mc.yandex.ru/metrika/tag.js";
const METRIKA_SCRIPT_SELECTOR = `script[src="${METRIKA_SCRIPT_URL}"]`;

type YandexMetrikaFunction = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

type YandexMetrikaState = {
  counterId: string;
  initialized: boolean;
  lastPath: string | null;
};

type YandexMetrikaProps = {
  counterId: string;
};

declare global {
  interface Window {
    __neuroluvYandexMetrika?: YandexMetrikaState;
    ym?: YandexMetrikaFunction;
  }
}

export function YandexMetrika({ counterId }: YandexMetrikaProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!counterId) {
      return;
    }

    const state = ensureMetrikaState(counterId);
    const ym = ensureMetrikaQueue();

    ensureMetrikaScript();

    if (!state.initialized) {
      ym(counterId, "init", {
        accurateTrackBounce: true,
        clickmap: true,
        defer: true,
        trackLinks: true,
        webvisor: true,
      });
      state.initialized = true;
    }

    // Auth and billing routes may carry secrets in the query string.
    const path = normalizeTrackedPath(pathname);

    if (state.lastPath === path) {
      return;
    }

    const previousPath = state.lastPath;
    state.lastPath = path;

    ym(counterId, "hit", path, {
      ...(previousPath ? { referer: previousPath } : {}),
      title: document.title,
    });
  }, [counterId, pathname]);

  if (!counterId) {
    return null;
  }

  return (
    <noscript>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=''
          src={"https://mc.yandex.ru/watch/" + counterId}
          style={{ left: "-9999px", position: "absolute" }}
        />
      </div>
    </noscript>
  );
}

function ensureMetrikaState(counterId: string): YandexMetrikaState {
  const current = window.__neuroluvYandexMetrika;

  if (current?.counterId === counterId) {
    return current;
  }

  const state: YandexMetrikaState = {
    counterId,
    initialized: false,
    lastPath: null,
  };

  window.__neuroluvYandexMetrika = state;
  return state;
}

function ensureMetrikaQueue(): YandexMetrikaFunction {
  if (window.ym) {
    return window.ym;
  }

  const queue: YandexMetrikaFunction = (...args) => {
    (queue.a ||= []).push(args);
  };

  queue.l = Date.now();
  window.ym = queue;

  return queue;
}

function ensureMetrikaScript(): void {
  if (document.querySelector(METRIKA_SCRIPT_SELECTOR)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.dataset.neuroluvYandexMetrika = "true";
  script.src = METRIKA_SCRIPT_URL;
  document.head.append(script);
}

function normalizeTrackedPath(pathname: string | null): string {
  if (!pathname) {
    return "/";
  }

  return pathname.startsWith("/") ? pathname : "/" + pathname;
}

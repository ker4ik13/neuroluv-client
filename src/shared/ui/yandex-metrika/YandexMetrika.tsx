"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  buildAttributionUrl,
  sanitizeAnalyticsReferrer,
} from "@/shared/lib/analytics/tracking-query";

const METRIKA_SCRIPT_URL = "https://mc.yandex.ru/metrika/tag.js";
const METRIKA_SCRIPT_SELECTOR = `script[src="${METRIKA_SCRIPT_URL}"]`;

type YandexMetrikaFunction = ((...args: unknown[]) => void) & {
  a?: unknown[][];
  l?: number;
};

type YandexMetrikaState = {
  counterId: string;
  initialized: boolean;
  lastUrl: string | null;
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

    // Keep attribution parameters while excluding auth and billing secrets.
    const trackedUrl = buildAttributionUrl(
      window.location.origin,
      pathname || "/",
      window.location.search,
    );

    if (state.lastUrl === trackedUrl) {
      return;
    }

    const previousUrl = state.lastUrl;
    const referer =
      previousUrl ||
      sanitizeAnalyticsReferrer(document.referrer, window.location.origin);
    state.lastUrl = trackedUrl;

    ym(counterId, "hit", trackedUrl, {
      ...(referer ? { referer } : {}),
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
    lastUrl: null,
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

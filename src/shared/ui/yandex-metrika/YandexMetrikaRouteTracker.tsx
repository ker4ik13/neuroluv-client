"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { buildMetrikaUrl } from "@/shared/lib/analytics/tracking-query";
import type { YandexMetrikaLanding } from "@/shared/lib/analytics/yandex-metrika";

type YandexMetrikaFunction = (...args: unknown[]) => void;

declare global {
  interface Window {
    __neuroluvMetrikaLanding?: YandexMetrikaLanding;
    ym?: YandexMetrikaFunction;
  }
}

type YandexMetrikaRouteTrackerProps = {
  counterId: string;
};

export function YandexMetrikaRouteTracker({
  counterId,
}: YandexMetrikaRouteTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const previousUrl = useRef<string | null>(null);

  useEffect(() => {
    const currentUrl = buildMetrikaUrl(
      window.location.origin,
      pathname || "/",
      window.location.search,
    );

    // The landing hit is queued by the inline head bootstrap before hydration.
    // This component records only subsequent client-side navigations.
    if (previousUrl.current === null) {
      previousUrl.current =
        window.__neuroluvMetrikaLanding?.url || currentUrl;
      return;
    }

    if (previousUrl.current === currentUrl) {
      return;
    }

    window.ym?.(Number(counterId), "hit", currentUrl, {
      referer: previousUrl.current,
      title: document.title,
    });
    previousUrl.current = currentUrl;
  }, [counterId, pathname, query]);

  return null;
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

export function CreateRouteScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}

"use client";

import { useEffect, useLayoutEffect } from "react";

export function CreateRouteScrollReset() {
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
  }, []);

  return null;
}

"use client";

import { useEffect, useRef } from "react";

type AdaptivePollingOptions = {
  enabled: boolean;
  hasActiveWork: boolean;
  onPoll: () => unknown | Promise<unknown>;
  activeIntervalMs?: number;
  idleIntervalMs?: number;
};

export function useAdaptivePolling({
  enabled,
  hasActiveWork,
  onPoll,
  activeIntervalMs = 2_500,
  idleIntervalMs = 10_000,
}: AdaptivePollingOptions) {
  const onPollRef = useRef(onPoll);

  useEffect(() => {
    onPollRef.current = onPoll;
  }, [onPoll]);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    let polling = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const interval = () => {
      const baseInterval = hasActiveWork ? activeIntervalMs : idleIntervalMs;
      return document.visibilityState === "hidden"
        ? Math.max(baseInterval * 4, 15_000)
        : baseInterval;
    };

    const schedule = () => {
      if (!active) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(poll, interval());
    };

    const poll = async () => {
      if (!active || polling) return;
      polling = true;

      try {
        await onPollRef.current();
      } catch {
        // The resource keeps its own visible error state. Polling must continue
        // after a transient network failure instead of producing an unhandled rejection.
      } finally {
        polling = false;
        schedule();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (timeoutId) clearTimeout(timeoutId);
        void poll();
      } else {
        schedule();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    schedule();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeIntervalMs, enabled, hasActiveWork, idleIntervalMs]);
}

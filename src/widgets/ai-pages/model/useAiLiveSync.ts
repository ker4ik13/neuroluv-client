"use client";

import { useCallback, useEffect, useRef } from "react";

const AI_LIVE_SYNC_CHANNEL = "neuroluv-ai:live-sync";

export type AiLiveSyncMessage = {
  type: "conversation-changed";
  conversationId: string | null;
  kind: "text" | "image" | "video";
  reason?: "conversation" | "started" | "terminal";
  at: number;
};

export function useAiLiveSync({
  enabled,
  onMessage,
}: {
  enabled: boolean;
  onMessage: (message: AiLiveSyncMessage) => void;
}) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(AI_LIVE_SYNC_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (isAiLiveSyncMessage(event.data)) onMessageRef.current(event.data);
    };

    return () => {
      if (channelRef.current === channel) channelRef.current = null;
      channel.close();
    };
  }, [enabled]);

  return useCallback((message: Omit<AiLiveSyncMessage, "at">) => {
    channelRef.current?.postMessage({ ...message, at: Date.now() });
  }, []);
}

function isAiLiveSyncMessage(value: unknown): value is AiLiveSyncMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.type === "conversation-changed" &&
    (typeof candidate.conversationId === "string" ||
      candidate.conversationId === null) &&
    (candidate.kind === "text" ||
      candidate.kind === "image" ||
      candidate.kind === "video") &&
    (candidate.reason === undefined ||
      candidate.reason === "conversation" ||
      candidate.reason === "started" ||
      candidate.reason === "terminal") &&
    typeof candidate.at === "number"
  );
}

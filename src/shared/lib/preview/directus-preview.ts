import "server-only";

import { draftMode } from "next/headers";

import type { DirectusRequestOptions } from "@/shared/api/directus/client";
import { DIRECTUS_PREVIEW_TOKEN } from "@/shared/config/directus";

export type DirectusPreviewContext = {
  enabled: boolean;
  requestOptions: DirectusRequestOptions;
};

export async function getDirectusPreviewContext(): Promise<DirectusPreviewContext> {
  const mode = await draftMode();

  if (!mode.isEnabled) {
    return {
      enabled: false,
      requestOptions: { next: { revalidate: 60 } },
    };
  }

  return {
    enabled: true,
    requestOptions: {
      cache: "no-store",
      token: DIRECTUS_PREVIEW_TOKEN,
    },
  };
}

export function canReadDirectusItemStatus(
  status: string | null | undefined,
  previewEnabled: boolean,
): boolean {
  if (previewEnabled) {
    return status !== "archived";
  }

  return status === "published";
}

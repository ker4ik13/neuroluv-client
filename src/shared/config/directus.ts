const DEFAULT_DIRECTUS_URL = "https://dev.cms.neuroluv.ru";

export const DIRECTUS_URL = (
  process.env.NEXT_PUBLIC_DIRECTUS_URL || DEFAULT_DIRECTUS_URL
).replace(/\/$/, "");

export const DIRECTUS_TOKEN =
  process.env.DIRECTUS_TOKEN || "";

export const DIRECTUS_CODEX_TOKEN = DIRECTUS_TOKEN;

export const DIRECTUS_PREVIEW_TOKEN =
  process.env.DIRECTUS_PREVIEW_TOKEN || process.env.DIRECTUS_TOKEN || "";

export const DIRECTUS_PREVIEW_SECRET =
  process.env.DIRECTUS_PREVIEW_SECRET || process.env.PREVIEW_SECRET || "";

type DirectusAssetOptions = {
  transform?: boolean;
  type?: string | null;
};

export function buildDirectusAssetUrl(
  fileId: string,
  options: DirectusAssetOptions = {},
): string {
  const shouldTransform =
    options.transform !== false &&
    (!options.type ||
      (options.type.startsWith("image/") && options.type !== "image/svg+xml"));

  const url = `${DIRECTUS_URL}/assets/${fileId}`;

  if (!shouldTransform) {
    return url;
  }

  return `${url}?format=webp&quality=80`;
}

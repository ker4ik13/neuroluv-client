const DEFAULT_DIRECTUS_URL = "https://dev.cms.neuroluv.ru";

export const DIRECTUS_URL = (
  process.env.NEXT_PUBLIC_DIRECTUS_URL || DEFAULT_DIRECTUS_URL
).replace(/\/$/, "");

export const DIRECTUS_CODEX_TOKEN =
  process.env.NEXT_PUBLIC_DIRECTUS_CODEX_TOKEN || "";

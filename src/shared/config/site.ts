const DEFAULT_SITE_URL = "http://localhost:3000";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SELF_URL || DEFAULT_SITE_URL
).replace(/\/$/, "");

export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "";

export const YANDEX_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION || "";

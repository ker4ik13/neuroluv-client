const DEFAULT_SITE_URL = "http://localhost:3000";
const PUBLIC_SITE_URL = "https://neuroluv.ru";

export const SITE_URL = (
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SELF_URL ||
  DEFAULT_SITE_URL
).replace(/\/$/, "");

export const SHARE_SITE_URL = isLocalUrl(SITE_URL) ? PUBLIC_SITE_URL : SITE_URL;

export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "";

export const YANDEX_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION || "";

function isLocalUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);

    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

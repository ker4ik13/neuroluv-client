const DEFAULT_SITE_URL = "http://localhost:3000";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SELF_URL || DEFAULT_SITE_URL
).replace(/\/$/, "");

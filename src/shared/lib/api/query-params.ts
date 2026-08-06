const DEFAULT_MAX_PAGE = 1_000;
const DEFAULT_MAX_QUERY_LENGTH = 200;

export function normalizeApiPage(
  value: string | null,
  maxPage = DEFAULT_MAX_PAGE,
): number {
  const page = Number(value);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.min(Math.floor(page), maxPage);
}

export function getBoundedQueryParam(
  searchParams: URLSearchParams,
  key: string,
  maxLength = DEFAULT_MAX_QUERY_LENGTH,
): string | null {
  const value = searchParams.get(key)?.trim();

  return value ? value.slice(0, maxLength) : null;
}

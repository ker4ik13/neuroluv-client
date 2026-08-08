type PaginationParam = string | string[] | null | undefined;

const MAX_PAGINATION_PAGE = 1_000;
const INTERNAL_URL_ORIGIN = "https://pagination.neuroluv.local";

export function normalizePaginationPage(value: PaginationParam): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const page = Number(candidate);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.min(Math.floor(page), MAX_PAGINATION_PAGE);
}

export function buildPaginationHref(baseHref: string, page: number): string {
  const url = new URL(baseHref, INTERNAL_URL_ORIGIN);

  if (page > 1) {
    url.searchParams.set("page", String(page));
  } else {
    url.searchParams.delete("page");
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function replacePaginationPageInAddressBar(page: number): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);

  if (page > 1) {
    url.searchParams.set("page", String(page));
  } else {
    url.searchParams.delete("page");
  }

  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

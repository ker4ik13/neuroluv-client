type SearchParamsValue = string | string[] | undefined;

export type RouteSearchParams = Record<string, SearchParamsValue>;

export function buildPathWithSearch(
  pathname: string,
  searchParams?: RouteSearchParams | null,
): string {
  const params = new URLSearchParams();

  Object.entries(searchParams || {})
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value
          .filter(Boolean)
          .forEach((item) => params.append(key, item));

        return;
      }

      if (value) {
        params.set(key, value);
      }
    });

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export function omitSearchParams<T extends RouteSearchParams>(
  searchParams: T | null | undefined,
  keysToOmit: string[],
): Partial<T> {
  const omitSet = new Set(keysToOmit);

  return Object.fromEntries(
    Object.entries(searchParams || {}).filter(([key]) => !omitSet.has(key)),
  ) as Partial<T>;
}

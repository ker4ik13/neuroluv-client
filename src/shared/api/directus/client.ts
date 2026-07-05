import { DIRECTUS_TOKEN, DIRECTUS_URL } from "@/shared/config/directus";

type DirectusResponse<T> = {
  data: T;
};

type DirectusRequestOptions = {
  next?: NextFetchRequestConfig;
};

export class DirectusApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "DirectusApiError";
  }
}

export async function directusRequest<T>(
  path: string,
  options: DirectusRequestOptions = {},
): Promise<T> {
  const headers = DIRECTUS_TOKEN
    ? {
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      }
    : undefined;

  const response = await fetch(`${DIRECTUS_URL}${path}`, {
    headers,
    next: options.next,
  });

  if (!response.ok) {
    throw new DirectusApiError(
      `Directus request failed: ${response.statusText}`,
      response.status,
    );
  }

  const payload = (await response.json()) as DirectusResponse<T>;

  return payload.data;
}

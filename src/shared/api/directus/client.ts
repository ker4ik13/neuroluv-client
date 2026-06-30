import { DIRECTUS_CODEX_TOKEN, DIRECTUS_URL } from "@/shared/config/directus";

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
  if (!DIRECTUS_CODEX_TOKEN) {
    throw new DirectusApiError("Directus token is not configured", 500);
  }

  const response = await fetch(`${DIRECTUS_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${DIRECTUS_CODEX_TOKEN}`,
    },
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

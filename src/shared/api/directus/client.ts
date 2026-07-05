import { DIRECTUS_TOKEN, DIRECTUS_URL } from "@/shared/config/directus";

const DIRECTUS_RETRY_ATTEMPTS = 2;
const DIRECTUS_RETRY_DELAY_MS = 350;

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

  let lastNetworkError: unknown = null;

  for (let attempt = 0; attempt <= DIRECTUS_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${DIRECTUS_URL}${path}`, {
        headers,
        next: options.next,
      });

      if (response.ok) {
        const payload = (await response.json()) as DirectusResponse<T>;

        return payload.data;
      }

      if (response.status >= 500 && attempt < DIRECTUS_RETRY_ATTEMPTS) {
        await waitBeforeRetry(attempt);
        continue;
      }

      throw new DirectusApiError(
        `Directus request failed: ${response.statusText}`,
        response.status,
      );
    } catch (error) {
      if (error instanceof DirectusApiError) {
        throw error;
      }

      lastNetworkError = error;

      if (attempt < DIRECTUS_RETRY_ATTEMPTS) {
        await waitBeforeRetry(attempt);
        continue;
      }
    }
  }

  throw new DirectusApiError(
    getNetworkErrorMessage(lastNetworkError),
    503,
  );
}

async function waitBeforeRetry(attempt: number): Promise<void> {
  await new Promise((resolve) =>
    setTimeout(resolve, DIRECTUS_RETRY_DELAY_MS * (attempt + 1)),
  );
}

function getNetworkErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `Directus request failed: ${error.message}`;
  }

  return "Directus request failed";
}

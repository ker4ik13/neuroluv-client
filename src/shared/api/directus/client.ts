import { DIRECTUS_TOKEN, DIRECTUS_URL } from "@/shared/config/directus";

const DIRECTUS_RETRY_ATTEMPTS = 2;
const DIRECTUS_RETRY_DELAY_MS = 350;
const DIRECTUS_SAFE_GET_TARGET_BYTES = 7_000;

type DirectusResponse<T> = {
  data: T;
};

export type DirectusRequestOptions = {
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  token?: string | null;
};

export type DirectusSearchQuery = Record<string, unknown>;

type DirectusApiErrorContext = {
  method: "GET" | "SEARCH";
  requestBytes: number;
  resource: string;
  response: string | null;
};

export class DirectusApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly context?: DirectusApiErrorContext,
  ) {
    super(message);
    this.name = "DirectusApiError";
  }
}

export async function directusRequest<T>(
  path: string,
  options: DirectusRequestOptions = {},
): Promise<T> {
  return executeDirectusRequest<T>({
    method: "GET",
    options,
    path,
  });
}

export async function directusSearch<T>(
  collection: string,
  query: DirectusSearchQuery,
  options: DirectusRequestOptions = {},
): Promise<T> {
  if (!/^[a-z0-9_]+$/i.test(collection)) {
    throw new TypeError(`Invalid Directus collection: ${collection}`);
  }

  return executeDirectusRequest<T>({
    body: JSON.stringify({ query }),
    method: "SEARCH",
    options,
    path: `/items/${collection}`,
  });
}

async function executeDirectusRequest<T>({
  body,
  method,
  options,
  path,
}: {
  body?: string;
  method: "GET" | "SEARCH";
  options: DirectusRequestOptions;
  path: string;
}): Promise<T> {
  const authToken = options.token ?? DIRECTUS_TOKEN;
  const headers = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(body ? { "Content-Type": "application/json" } : {}),
  };
  const requestBytes = getRequestBytes(path, body);
  const resource = path.split("?", 1)[0] || path;

  if (method === "GET" && requestBytes > DIRECTUS_SAFE_GET_TARGET_BYTES) {
    const error = new DirectusApiError(
      `Directus GET target is ${requestBytes} bytes; use SEARCH for large queries`,
      0,
      {
        method,
        requestBytes,
        resource,
        response: null,
      },
    );

    reportDirectusFailure(error);
    throw error;
  }

  let lastNetworkError: unknown = null;

  for (let attempt = 0; attempt <= DIRECTUS_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${DIRECTUS_URL}${path}`, {
        body,
        cache: options.cache,
        headers,
        method,
        next: options.next,
      });

      if (response.ok) {
        const payload = (await response.json()) as DirectusResponse<T>;

        return payload.data;
      }

      if (response.status >= 500 && attempt < DIRECTUS_RETRY_ATTEMPTS) {
        await response.arrayBuffer();
        await waitBeforeRetry(attempt);
        continue;
      }

      const responseBody = await readErrorResponse(response);
      const error = new DirectusApiError(
        `Directus request failed: ${getDirectusErrorMessage(response, responseBody)}`,
        response.status,
        {
          method,
          requestBytes,
          resource,
          response: responseBody,
        },
      );

      reportDirectusFailure(error);
      throw error;
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

  const error = new DirectusApiError(
    getNetworkErrorMessage(lastNetworkError),
    503,
    {
      method,
      requestBytes,
      resource,
      response: null,
    },
  );

  reportDirectusFailure(error);
  throw error;
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

function getRequestBytes(path: string, body?: string): number {
  return new TextEncoder().encode(body || path).byteLength;
}

async function readErrorResponse(response: Response): Promise<string | null> {
  const body = (await response.text()).trim();

  return body ? body.slice(0, 2_000) : null;
}

function getDirectusErrorMessage(
  response: Response,
  responseBody: string | null,
): string {
  if (responseBody) {
    try {
      const payload = JSON.parse(responseBody) as {
        errors?: Array<{ message?: string }>;
      };
      const message = payload.errors?.[0]?.message;

      if (message) {
        return message;
      }
    } catch {
      // Directus or the reverse proxy can return a non-JSON error page.
    }
  }

  return response.statusText || `HTTP ${response.status}`;
}

function reportDirectusFailure(error: DirectusApiError): void {
  console.error("Directus request failed", {
    method: error.context?.method,
    requestBytes: error.context?.requestBytes,
    resource: error.context?.resource,
    response: error.context?.response,
    status: error.status,
  });
}

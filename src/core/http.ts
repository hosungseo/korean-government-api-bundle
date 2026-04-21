import { ProviderError } from "./errors.js";

export interface RetryFetchOptions {
  headers?: HeadersInit;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  retryOnStatuses?: number[];
  errorPrefix?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status: number, retryOnStatuses?: number[]): boolean {
  const defaultStatuses = [408, 425, 429, 500, 502, 503, 504];
  const retryable = retryOnStatuses ?? defaultStatuses;
  return retryable.includes(status);
}

export async function fetchTextWithRetry(url: string, options: RetryFetchOptions = {}): Promise<string> {
  const {
    headers,
    timeoutMs = 8000,
    retries = 2,
    retryDelayMs = 400,
    retryOnStatuses,
    errorPrefix = "request"
  } = options;

  const totalAttempts = retries + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        if (attempt < totalAttempts && shouldRetryStatus(response.status, retryOnStatuses)) {
          await sleep(retryDelayMs * attempt);
          continue;
        }

        throw new ProviderError(`${errorPrefix} request failed with status ${response.status}`, { url, status: response.status });
      }

      return await response.text();
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError";
      const canRetry = attempt < totalAttempts;

      if (canRetry) {
        await sleep(retryDelayMs * attempt);
        continue;
      }

      if (isAbort) {
        throw new ProviderError(`${errorPrefix} request timed out after ${timeoutMs}ms`, { url, timeoutMs });
      }

      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(`${errorPrefix} request failed`, {
        url,
        cause: error instanceof Error ? error.message : String(error)
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new ProviderError(`${errorPrefix} request failed`, { url });
}

export async function fetchJsonWithRetry<T>(url: string, options: RetryFetchOptions = {}): Promise<T> {
  const text = await fetchTextWithRetry(url, options);

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new ProviderError(`${options.errorPrefix ?? "request"} returned non-JSON response`, {
      url,
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

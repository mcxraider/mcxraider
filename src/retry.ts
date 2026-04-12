type RetryOptions = {
  attempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
};

type ErrorWithMetadata = {
  code?: string;
  message?: string;
  status?: number;
  response?: {
    status?: number;
  };
};

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 5_000;
const DEFAULT_BACKOFF_MULTIPLIER = 2;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENETDOWN",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMetadata(error: unknown): ErrorWithMetadata {
  return typeof error === "object" && error !== null
    ? (error as ErrorWithMetadata)
    : {};
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  const { message } = getErrorMetadata(error);
  return message ?? String(error);
}

export function isRetryableExternalError(error: unknown): boolean {
  const metadata = getErrorMetadata(error);
  const status = metadata.status ?? metadata.response?.status;

  if (status && RETRYABLE_STATUS_CODES.has(status)) {
    return true;
  }

  if (metadata.code && RETRYABLE_ERROR_CODES.has(metadata.code)) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("temporarily unavailable")
  );
}

export async function withRetry<T>(
  operationName: string,
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const backoffMultiplier =
    options.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER;
  const shouldRetry = options.shouldRetry ?? isRetryableExternalError;

  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === attempts;
      if (isLastAttempt || !shouldRetry(error)) {
        throw error;
      }

      options.onRetry?.(error, attempt, delayMs);
      console.warn(
        `[retry] ${operationName} failed on attempt ${attempt}/${attempts}. Retrying in ${delayMs}ms. ${getErrorMessage(
          error
        )}`
      );
      await sleep(delayMs);
      delayMs = Math.min(
        Math.round(delayMs * backoffMultiplier),
        maxDelayMs
      );
    }
  }

  throw new Error(`Retry loop for ${operationName} exhausted unexpectedly.`);
}

export class ThunderError extends Error {
  readonly status: number;
  readonly category: string;
  readonly retryable: boolean;

  constructor(
    message: string,
    opts: { status?: number; category?: string; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = "ThunderError";
    this.status = opts.status ?? 500;
    this.category = opts.category ?? "internal";
    this.retryable = opts.retryable ?? false;
  }
}

export const USER_UNAVAILABLE =
  "ThunderGPT is temporarily unavailable. Please try again.";

export function toUserError(err: unknown): string {
  if (err instanceof ThunderError) return err.message;
  return USER_UNAVAILABLE;
}

export function categorizeProviderStatus(status: number): {
  message: string;
  category: string;
  retryable: boolean;
} {
  if (status === 401 || status === 403) {
    return {
      message: "ThunderGPT could not reach its AI engine. Please try again later.",
      category: "auth",
      retryable: false,
    };
  }
  if (status === 429) {
    return {
      message: "ThunderGPT is receiving a lot of requests. Please wait a moment and try again.",
      category: "rate_limit",
      retryable: true,
    };
  }
  if (status === 400) {
    return {
      message: "ThunderGPT could not process that request. Try rephrasing or using a smaller file.",
      category: "invalid_request",
      retryable: false,
    };
  }
  if (status >= 500) {
    return {
      message: USER_UNAVAILABLE,
      category: "provider",
      retryable: true,
    };
  }
  return { message: USER_UNAVAILABLE, category: "provider", retryable: false };
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; shouldRetry?: (err: unknown) => boolean } = {},
): Promise<T> {
  const retries = opts.retries ?? 1;
  let last: unknown;
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const retryable =
        opts.shouldRetry?.(err) ??
        (err instanceof ThunderError && err.retryable);
      if (!retryable || i === retries) throw err;
      await new Promise((r) => setTimeout(r, 400 * 2 ** i));
    }
  }
  throw last;
}

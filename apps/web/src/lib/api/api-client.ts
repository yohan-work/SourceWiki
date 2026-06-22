import type { ApiErrorResponse } from '@sourcewiki/shared';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshPromise: Promise<void> | null = null;
const REFRESH_EXCLUDED_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
]);

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorResponse | undefined;
  try {
    body = (await response.json()) as ApiErrorResponse;
  } catch {
    // The fallback below handles non-JSON proxy and network responses.
  }
  return new ApiError(
    response.status,
    body?.error.code ?? 'REQUEST_FAILED',
    body?.error.message ?? '요청을 처리하지 못했습니다.',
    body?.error.fieldErrors,
    body?.error.requestId,
  );
}

async function refreshSession(): Promise<void> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw await parseError(response);
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  options: { retryAuth?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
  try {
    const response = await fetch(path, {
      ...init,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });

    const refreshExcluded = REFRESH_EXCLUDED_PATHS.has(path);
    if (response.status === 401 && options.retryAuth !== false && !refreshExcluded) {
      refreshPromise ??= refreshSession().finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      return apiFetch<T>(path, init, { ...options, retryAuth: false });
    }
    if (!response.ok) throw await parseError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'REQUEST_TIMEOUT', '요청 시간이 초과되었습니다.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

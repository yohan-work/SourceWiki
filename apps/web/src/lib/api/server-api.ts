import 'server-only';

import { cookies } from 'next/headers';

const apiBase = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

export async function serverApiFetch<T>(path: string): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${apiBase}${path}`, {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
  if (!response.ok) {
    const error = new Error(`API request failed: ${response.status}`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  return (await response.json()) as T;
}

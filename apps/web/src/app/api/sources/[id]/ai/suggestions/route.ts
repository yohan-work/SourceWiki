import { cookies, headers } from 'next/headers';

const apiBase =
  process.env.API_INTERNAL_URL ?? process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
const appOrigin = new URL(process.env.APP_URL ?? 'http://localhost:3000').origin;
const SUGGESTIONS_TIMEOUT_MS = 370_000;

function proxyError(status: number, code: string, message: string) {
  return Response.json(
    {
      error: {
        code,
        message,
        requestId: 'web-source-suggestions-proxy',
      },
    },
    { status },
  );
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieHeader = (await cookies()).toString();
  const incomingHeaders = await headers();
  const origin = incomingHeaders.get('origin') ?? appOrigin;

  let response: Response;
  try {
    response = await fetch(`${apiBase}/api/sources/${encodeURIComponent(id)}/ai/suggestions`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(SUGGESTIONS_TIMEOUT_MS),
      headers: {
        origin,
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return proxyError(504, 'AI_TIMEOUT', 'AI 추천 질문 요청 시간이 초과되었습니다.');
    }
    return proxyError(502, 'API_PROXY_FAILED', 'AI 추천 질문 요청 연결이 중단되었습니다.');
  }

  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
      ...(response.headers.get('x-request-id')
        ? { 'x-request-id': response.headers.get('x-request-id')! }
        : {}),
    },
  });
}

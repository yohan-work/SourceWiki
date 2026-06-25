import { cookies, headers } from 'next/headers';

const apiBase =
  process.env.API_INTERNAL_URL ?? process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
const appOrigin = new URL(process.env.APP_URL ?? 'http://localhost:3000').origin;
const CHAT_TIMEOUT_MS = 370_000;

function proxyError(status: number, code: string, message: string) {
  return Response.json(
    {
      error: {
        code,
        message,
        requestId: 'web-source-chat-proxy',
      },
    },
    { status },
  );
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieHeader = (await cookies()).toString();
  const incomingHeaders = await headers();
  const origin = incomingHeaders.get('origin') ?? appOrigin;
  const body = await request.text();

  let response: Response;
  try {
    response = await fetch(`${apiBase}/api/sources/${encodeURIComponent(id)}/chat`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
      headers: {
        'content-type': request.headers.get('content-type') ?? 'application/json',
        origin,
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return proxyError(504, 'AI_TIMEOUT', 'AI 대화 요청 시간이 초과되었습니다.');
    }
    return proxyError(502, 'API_PROXY_FAILED', 'AI 대화 요청 연결이 중단되었습니다.');
  }

  const responseBody = await response.text();
  return new Response(responseBody, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
      ...(response.headers.get('x-request-id')
        ? { 'x-request-id': response.headers.get('x-request-id')! }
        : {}),
    },
  });
}

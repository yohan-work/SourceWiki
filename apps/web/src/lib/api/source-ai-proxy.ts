import { cookies, headers } from 'next/headers';

const apiBase =
  process.env.API_INTERNAL_URL ?? process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
const appOrigin = new URL(process.env.APP_URL ?? 'http://localhost:3000').origin;
const AI_PROXY_TIMEOUT_MS = 370_000;

type SourceAiAction = 'summarize' | 'chat' | 'ai/suggestions';

function proxyError(status: number, code: string, message: string, requestId: string) {
  return Response.json(
    {
      error: {
        code,
        message,
        requestId,
      },
    },
    { status },
  );
}

export async function proxySourceAiRequest({
  id,
  action,
  request,
  requestId,
  timeoutMessage,
  failureMessage,
}: {
  id: string;
  action: SourceAiAction;
  request?: Request;
  requestId: string;
  timeoutMessage: string;
  failureMessage: string;
}) {
  const cookieHeader = (await cookies()).toString();
  const incomingHeaders = await headers();
  const origin = incomingHeaders.get('origin') ?? appOrigin;
  const body = request ? await request.text() : undefined;

  let response: Response;
  try {
    response = await fetch(`${apiBase}/api/sources/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(AI_PROXY_TIMEOUT_MS),
      headers: {
        ...(request
          ? { 'content-type': request.headers.get('content-type') ?? 'application/json' }
          : {}),
        origin,
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return proxyError(504, 'AI_TIMEOUT', timeoutMessage, requestId);
    }
    return proxyError(502, 'API_PROXY_FAILED', failureMessage, requestId);
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

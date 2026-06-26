import { proxySourceAiRequest } from '@/lib/api/source-ai-proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxySourceAiRequest({
    id,
    action: 'summarize',
    requestId: 'web-summarize-proxy',
    timeoutMessage: 'AI 요약 요청 시간이 초과되었습니다.',
    failureMessage: 'AI 요약 요청 연결이 중단되었습니다.',
  });
}

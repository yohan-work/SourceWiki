import { proxySourceAiRequest } from '@/lib/api/source-ai-proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxySourceAiRequest({
    id,
    action: 'ai/suggestions',
    requestId: 'web-source-suggestions-proxy',
    timeoutMessage: 'AI 추천 질문 요청 시간이 초과되었습니다.',
    failureMessage: 'AI 추천 질문 요청 연결이 중단되었습니다.',
  });
}

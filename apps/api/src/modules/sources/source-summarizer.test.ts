import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadSummarizer() {
  vi.resetModules();
  return import('./source-summarizer.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('source summarizer', () => {
  it('returns a labeled fixture in demo mode', async () => {
    vi.stubEnv('AI_MODE', 'demo');
    const { summarizeText } = await loadSummarizer();

    await expect(summarizeText('원문')).resolves.toMatchObject({ mode: 'demo' });
  });

  it('returns a chat fixture in demo mode', async () => {
    vi.stubEnv('AI_MODE', 'demo');
    const { chatWithText } = await loadSummarizer();

    await expect(chatWithText('원문', '무엇을 말하나요?')).resolves.toMatchObject({
      mode: 'demo',
    });
  });

  it('rejects requests when AI is disabled', async () => {
    vi.stubEnv('AI_MODE', 'disabled');
    const { summarizeText } = await loadSummarizer();

    await expect(summarizeText('원문')).rejects.toMatchObject({ code: 'AI_DISABLED', status: 503 });
  });

  it('rejects chat requests when AI is disabled', async () => {
    vi.stubEnv('AI_MODE', 'disabled');
    const { chatWithText } = await loadSummarizer();

    await expect(chatWithText('원문', '질문')).rejects.toMatchObject({
      code: 'AI_DISABLED',
      status: 503,
    });
  });

  it('parses fenced Ollama JSON responses', async () => {
    vi.stubEnv('AI_MODE', 'ollama');
    vi.stubEnv('OLLAMA_MODEL', 'test-model');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          response:
            '```json\n{"summary":"요약입니다.","keyPoints":["하나"],"keywords":["키워드"],"recommendedTags":["태그"]}\n```',
        }),
      ),
    );
    const { summarizeText } = await loadSummarizer();

    await expect(summarizeText('원문')).resolves.toMatchObject({
      mode: 'ollama',
      summary: '요약입니다.',
      keyPoints: ['하나'],
    });
  });

  it('parses Ollama chat JSON responses', async () => {
    vi.stubEnv('AI_MODE', 'ollama');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ response: '{"answer":"원문 기반 답변입니다."}' })),
    );
    const { chatWithText } = await loadSummarizer();

    await expect(chatWithText('원문', '질문')).resolves.toMatchObject({
      mode: 'ollama',
      answer: '원문 기반 답변입니다.',
    });
  });

  it('repairs one invalid Ollama response', async () => {
    vi.stubEnv('AI_MODE', 'ollama');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ response: '{invalid' }))
        .mockResolvedValueOnce(
          Response.json({
            response:
              '{"summary":"수정된 요약입니다.","keyPoints":[],"keywords":[],"recommendedTags":[]}',
          }),
        ),
    );
    const { summarizeText } = await loadSummarizer();

    await expect(summarizeText('원문')).resolves.toMatchObject({
      mode: 'ollama',
      summary: '수정된 요약입니다.',
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('returns AI_INVALID_RESPONSE after a failed repair', async () => {
    vi.stubEnv('AI_MODE', 'ollama');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ response: '{invalid' })),
    );
    const { summarizeText } = await loadSummarizer();

    await expect(summarizeText('원문')).rejects.toMatchObject({
      code: 'AI_INVALID_RESPONSE',
      status: 502,
    });
  });

  it('returns AI_INVALID_RESPONSE for non-JSON Ollama responses', async () => {
    vi.stubEnv('AI_MODE', 'ollama');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not json')),
    );
    const { summarizeText } = await loadSummarizer();

    await expect(summarizeText('원문')).rejects.toMatchObject({
      code: 'AI_INVALID_RESPONSE',
      status: 502,
    });
  });
});

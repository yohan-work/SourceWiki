import { describe, expect, it } from 'vitest';

import { suggestTags } from './tag-suggester.js';

describe('tag suggester', () => {
  it('filters weak particles, endings, and code filler tokens', () => {
    const tags = suggestTags({
      title: 'Google API Security Developer Guide',
      domain: 'docs.google.com',
      sourceType: 'docs',
      rawText:
        'Google API AI Security Developer Set const 값을 Stage 있습니다 '.repeat(8) +
        '보안 API 개발자 Google AI 문서',
    });

    expect(tags).toEqual(expect.arrayContaining(['Google', 'API', 'AI', 'Security', 'Developer']));
    expect(tags).not.toEqual(expect.arrayContaining(['값을', '있습니다', 'Set', 'const']));
  });
});

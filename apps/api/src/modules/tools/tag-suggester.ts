const STOP_WORDS = new Set([
  '그리고',
  '그러나',
  '대한',
  '대해',
  '이번',
  '있는',
  '있습니다',
  '있다',
  '했다',
  '한다',
  '위해',
  '통해',
  '에서',
  '으로',
  '에게',
  '기사',
  '기자',
  '사진',
  '제공',
  '값을',
  '단계',
  '경우',
  '때문',
  '사용',
  '설정',
  '오픈',
  '밝혔다',
  '것으로',
  '것이다',
  'will',
  'with',
  'from',
  'that',
  'this',
  'into',
  'about',
  'article',
  'news',
  'source',
  'set',
  'const',
  'let',
  'var',
  'function',
  'return',
  'string',
  'number',
  'boolean',
  'object',
  'array',
  'value',
  'values',
  'gpt',
]);

const KNOWN_TERMS: [RegExp, string][] = [
  [/\bopenai\b|오픈\s*ai|오픈AI/i, 'OpenAI'],
  [/\bchatgpt\b|챗\s*gpt|챗GPT/i, 'ChatGPT'],
  [/\bcodex\b|코덱스/i, 'Codex'],
  [/삼성전자|samsung/i, '삼성전자'],
  [/\bgoogle\b|구글/i, 'Google'],
  [/\banthropic\b|앤트로픽/i, 'Anthropic'],
  [/\bclaude\b|클로드/i, 'Claude'],
  [/\bollama\b/i, 'Ollama'],
  [/\brag\b/i, 'RAG'],
  [/\bapi\b/i, 'API'],
  [/인공지능|\bai\b/i, 'AI'],
  [/머신러닝|machine learning/i, 'Machine Learning'],
  [/클라우드|cloud/i, 'Cloud'],
  [/보안|security/i, 'Security'],
  [/자동화|automation/i, 'Automation'],
  [/개발자|developer/i, 'Developer'],
  [/엔터프라이즈|enterprise/i, 'Enterprise'],
];

const DOMAIN_TAGS: [RegExp, string][] = [
  [/github\.com$/i, 'GitHub'],
  [/aitimes\.com$/i, 'AI'],
  [/docs?\./i, 'Docs'],
  [/arxiv\.org$/i, 'Paper'],
];

function normalizedTag(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function addTag(tags: Map<string, string>, value: string) {
  const display = value.trim().replace(/\s+/g, ' ');
  const normalized = normalizedTag(display);
  if (!display || display.length > 30 || STOP_WORDS.has(normalized) || tags.has(normalized)) return;
  tags.set(normalized, display);
}

function tokenize(value: string) {
  return value.match(/[A-Za-z][A-Za-z0-9+#.-]{1,28}|[가-힣]{2,12}/g) ?? [];
}

function isWeakKoreanToken(value: string) {
  return (
    /^[가-힣]{2,12}$/.test(value) &&
    /(을|를|은|는|이|가|에|의|로|으로|와|과|도|만|에서|에게|부터|까지|합니다|습니다|된다|했다|한다|하는|있는|없는|된다|와|과)$/.test(
      value,
    )
  );
}

function isWeakEnglishToken(value: string) {
  return /^[a-z][a-z0-9.-]*$/.test(value) && value.length < 6;
}

function frequentTerms(title: string | null, rawText: string) {
  const scores = new Map<string, { display: string; score: number }>();
  for (const [source, weight] of [
    [title ?? '', 4],
    [rawText.slice(0, 8000), 1],
  ] as const) {
    for (const token of tokenize(source)) {
      const display = token.replace(/[.,;:!?]+$/, '');
      const normalized = normalizedTag(display);
      if (
        normalized.length < 2 ||
        /^\d+$/.test(normalized) ||
        STOP_WORDS.has(normalized) ||
        STOP_WORDS.has(display) ||
        isWeakKoreanToken(display) ||
        isWeakEnglishToken(display)
      )
        continue;
      const current = scores.get(normalized);
      scores.set(normalized, {
        display: current?.display ?? display,
        score: (current?.score ?? 0) + weight,
      });
    }
  }
  return [...scores.values()]
    .filter(({ score }) => score >= 2)
    .sort((left, right) => right.score - left.score || left.display.localeCompare(right.display))
    .map(({ display }) => display);
}

export function suggestTags(input: {
  title: string | null;
  domain: string;
  sourceType: 'article' | 'docs' | 'paper' | 'github' | 'other';
  rawText: string;
}) {
  const tags = new Map<string, string>();
  for (const [pattern, tag] of DOMAIN_TAGS) {
    if (pattern.test(input.domain)) addTag(tags, tag);
  }
  const searchable = `${input.title ?? ''}\n${input.rawText.slice(0, 12_000)}`;
  for (const [pattern, tag] of KNOWN_TERMS) {
    if (pattern.test(searchable)) addTag(tags, tag);
  }
  for (const term of frequentTerms(input.title, input.rawText)) {
    addTag(tags, term);
    if (tags.size >= 10) break;
  }
  return [...tags.values()].slice(0, 10);
}

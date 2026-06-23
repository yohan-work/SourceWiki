import { hash } from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, SourceType } from '../src/generated/prisma/client.js';

if (process.env.NODE_ENV === 'production') throw new Error('Seed is disabled in production.');

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://sourcewiki:sourcewiki_local@localhost:5432/sourcewiki?schema=public';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const password = process.env.SEED_USER_PASSWORD ?? 'sourcewiki-demo-password';

const users = [
  { email: 'archive.owner@example.test', nickname: '아카이버' },
  { email: 'curious.reader@example.test', nickname: '탐구자' },
] as const;

const titles = [
  '신뢰할 수 있는 AI 에이전트 설계',
  'React Server Components의 데이터 경계',
  'PostgreSQL 인덱스를 읽는 방법',
  '작은 팀을 위한 API 오류 계약',
  'JWT 회전과 세션 재사용 탐지',
  '접근 가능한 폼 오류 설계',
  'Prisma 트랜잭션 실전 패턴',
  '서버 페이징의 안정적인 정렬',
  '기술 문서를 지식으로 바꾸는 메모법',
  'OpenAPI를 런타임 계약과 맞추기',
  'Next.js에서 waterfall 제거하기',
  'Docker Compose readiness 구성',
  '댓글 권한을 쿼리 조건으로 지키기',
] as const;

async function main() {
  const passwordHash = await hash(password, 12);
  const seededUsers = [];
  for (const user of users) {
    seededUsers.push(
      await prisma.user.upsert({
        where: { email: user.email },
        update: { nickname: user.nickname, passwordHash, emailVerifiedAt: new Date() },
        create: { ...user, passwordHash, emailVerifiedAt: new Date() },
      }),
    );
  }

  await prisma.source.deleteMany({ where: { userId: { in: seededUsers.map((user) => user.id) } } });
  for (const [index, title] of titles.entries()) {
    const owner = seededUsers[index % seededUsers.length]!;
    const source = await prisma.source.create({
      data: {
        userId: owner.id,
        title,
        originalUrl: `https://example.com/knowledge/${index + 1}`,
        sourceDomain: 'example.com',
        sourceType: index % 3 === 0 ? SourceType.docs : SourceType.article,
        rawText: `${title}에 대한 시연용 정제 본문입니다. 실제 운영 데이터가 아닙니다.`,
        rawTextPreview: `${title}에 대한 시연용 정제 본문입니다.`,
        summary: `${title}의 핵심 개념과 적용 지점을 간결하게 정리한 시연 자료입니다.`,
        extractionStatus: 'succeeded',
        sourceTags: {
          create: [
            {
              tag: {
                connectOrCreate: {
                  where: { normalizedName: index % 2 === 0 ? 'architecture' : 'web' },
                  create: {
                    name: index % 2 === 0 ? 'Architecture' : 'Web',
                    normalizedName: index % 2 === 0 ? 'architecture' : 'web',
                  },
                },
              },
            },
          ],
        },
      },
    });
    await prisma.comment.create({
      data: {
        sourceId: source.id,
        userId: seededUsers[(index + 1) % seededUsers.length]!.id,
        content: '핵심 흐름을 다시 확인할 때 참고하기 좋은 자료입니다.',
      },
    });
  }
}

main().finally(() => prisma.$disconnect());

import { z } from 'zod';

export const serviceNameSchema = z.enum(['api', 'database']);

export const healthDataSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  service: serviceNameSchema,
  timestamp: z.iso.datetime(),
  checks: z.record(z.string(), z.enum(['up', 'down'])).optional(),
});

export const apiMetaSchema = z.object({
  requestId: z.string().min(1),
});

export const healthResponseSchema = z.object({
  data: healthDataSchema,
  meta: apiMetaSchema,
});

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    requestId: z.string().min(1),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('올바른 이메일을 입력해 주세요.'));
export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 합니다.')
  .max(72, '비밀번호는 72자 이하여야 합니다.')
  .refine((value) => new TextEncoder().encode(value).byteLength <= 72, {
    message: '비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.',
  });
export const nicknameSchema = z
  .string()
  .trim()
  .min(2, '닉네임은 2자 이상이어야 합니다.')
  .max(30, '닉네임은 30자 이하여야 합니다.');

export const checkEmailRequestSchema = z.object({ email: emailSchema });
export const signupRequestSchema = z.object({
  email: emailSchema,
  nickname: nicknameSchema,
  password: passwordSchema,
});
export const loginRequestSchema = z.object({ email: emailSchema, password: passwordSchema });
export const verifyEmailRequestSchema = z.object({ token: z.string().min(32) });
export const resendVerificationRequestSchema = z.object({ email: emailSchema });

export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  nickname: z.string(),
  emailVerified: z.boolean(),
  createdAt: z.iso.datetime(),
});

export const authUserResponseSchema = z.object({ data: authUserSchema, meta: apiMetaSchema });
export const checkEmailResponseSchema = z.object({
  data: z.object({ available: z.boolean() }),
  meta: apiMetaSchema,
});
export const authMessageResponseSchema = z.object({
  data: z.object({ message: z.string() }),
  meta: apiMetaSchema,
});

export const sourceTypeSchema = z.enum(['article', 'docs', 'paper', 'github', 'other']);
export const extractionStatusSchema = z.enum(['not_requested', 'succeeded', 'failed']);
export const summaryStatusSchema = z.enum(['not_requested', 'succeeded', 'failed', 'demo']);

const blockedHost =
  /^(localhost|.*\.localhost|.*\.local|0\.0\.0\.0|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|\[?::1\]?)$/i;
export const publicHttpUrlSchema = z
  .string()
  .trim()
  .min(1, 'URL을 입력해 주세요.')
  .max(2048, 'URL은 2,048자 이하여야 합니다.')
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        !url.username &&
        !url.password &&
        !blockedHost.test(url.hostname)
      );
    } catch {
      return false;
    }
  }, '공개 HTTP(S) URL을 입력해 주세요.');

const extractableHttpUrlSchema = z
  .string()
  .trim()
  .min(1, 'URL을 입력해 주세요.')
  .max(2048, 'URL은 2,048자 이하여야 합니다.')
  .refine((value) => {
    try {
      const url = new URL(value);
      return (url.protocol !== 'http:' && url.protocol !== 'https:') ||
        url.username ||
        url.password ||
        blockedHost.test(url.hostname)
        ? false
        : true;
    } catch {
      return false;
    }
  }, '공개 HTTP(S) URL을 입력해 주세요.');

export const tagNameSchema = z.string().trim().min(1).max(30);
export const keyPointSchema = z.string().trim().min(1).max(500);
export const keywordSchema = z.string().trim().min(1).max(100);
export const sourceCreateRequestSchema = z.object({
  title: z.string().trim().min(1, '제목을 입력해 주세요.').max(200),
  originalUrl: publicHttpUrlSchema,
  sourceType: sourceTypeSchema.default('other'),
  rawText: z.string().trim().max(100_000).optional(),
  personalNote: z.string().trim().max(10_000).optional(),
  tags: z.array(tagNameSchema).max(10).default([]),
});
export const sourceUpdateRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    originalUrl: publicHttpUrlSchema.optional(),
    sourceType: sourceTypeSchema.optional(),
    rawText: z.string().trim().max(100_000).nullable().optional(),
    summary: z.string().trim().max(10_000).nullable().optional(),
    summaryStatus: z.enum(['not_requested', 'succeeded', 'demo']).optional(),
    keyPoints: z.array(keyPointSchema).max(10).optional(),
    keywords: z.array(keywordSchema).max(20).optional(),
    personalNote: z.string().trim().max(10_000).nullable().optional(),
    tags: z.array(tagNameSchema).max(10).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: '수정할 값을 한 개 이상 입력해 주세요.',
    path: ['form'],
  });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
export const paginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  totalItems: z.number().int(),
  totalPages: z.number().int(),
});

export const extractUrlRequestSchema = z.object({ url: extractableHttpUrlSchema });
export const extractUrlResponseSchema = z.object({
  data: z.object({
    finalUrl: z.url(),
    title: z.string().nullable(),
    domain: z.string(),
    sourceType: sourceTypeSchema,
    rawText: z.string(),
    preview: z.string(),
    suggestedTags: z.array(tagNameSchema).max(10),
    truncated: z.boolean(),
  }),
  meta: apiMetaSchema,
});

export const summarizeSourceResponseSchema = z.object({
  data: z.object({
    summary: z.string().trim().min(1).max(10_000),
    keyPoints: z.array(keyPointSchema).max(10),
    keywords: z.array(keywordSchema).max(20),
    recommendedTags: z.array(tagNameSchema).max(10),
    applicationIdea: z.string().trim().max(2000).optional(),
    mode: z.enum(['ollama', 'demo']),
  }),
  meta: apiMetaSchema,
});

export const sourceChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
});
export const sourceChatRequestSchema = z.object({
  message: z.string().trim().min(1, '질문을 입력해 주세요.').max(2000),
  history: z.array(sourceChatMessageSchema).max(8).default([]),
});
export const sourceChatResponseSchema = z.object({
  data: z.object({
    answer: z.string().trim().min(1).max(10_000),
    mode: z.enum(['ollama', 'demo']),
  }),
  meta: apiMetaSchema,
});

export const authorSchema = z.object({ id: z.uuid(), nickname: z.string() });
export const tagSchema = z.object({ id: z.uuid(), name: z.string() });
export const sourceListItemSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  originalUrl: z.url(),
  sourceDomain: z.string(),
  sourceType: sourceTypeSchema,
  summaryPreview: z.string().nullable(),
  rawTextPreview: z.string().nullable(),
  tags: z.array(tagSchema),
  author: authorSchema,
  commentCount: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const relatedSourceSchema = sourceListItemSchema.extend({
  sharedTags: z.array(tagSchema),
});
export const sourceGraphNodeSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  sourceDomain: z.string(),
  sourceType: sourceTypeSchema,
  tags: z.array(z.string()),
  weight: z.number().int().min(1),
});
export const sourceGraphEdgeSchema = z.object({
  sourceId: z.uuid(),
  targetId: z.uuid(),
  sharedTags: z.array(z.string()),
  weight: z.number().int().min(1),
});
export const sourceGraphResponseSchema = z.object({
  data: z.object({
    nodes: z.array(sourceGraphNodeSchema),
    edges: z.array(sourceGraphEdgeSchema),
    tags: z.array(z.object({ name: z.string(), count: z.number().int().min(1) })),
  }),
  meta: apiMetaSchema,
});
export const sourceDetailSchema = sourceListItemSchema.extend({
  rawText: z.string().nullable(),
  summary: z.string().nullable(),
  keyPoints: z.array(z.string()),
  keywords: z.array(z.string()),
  personalNote: z.string().nullable(),
  extractionStatus: extractionStatusSchema,
  summaryStatus: summaryStatusSchema,
  isOwner: z.boolean(),
  relatedSources: z.array(relatedSourceSchema),
});
export const sourceListResponseSchema = z.object({
  data: z.array(sourceListItemSchema),
  pagination: paginationSchema,
  meta: apiMetaSchema,
});
export const sourceDetailResponseSchema = z.object({
  data: sourceDetailSchema,
  meta: apiMetaSchema,
});

export const commentRequestSchema = z.object({
  content: z.string().trim().min(1, '댓글을 입력해 주세요.').max(2000),
});
export const commentSchema = z.object({
  id: z.uuid(),
  sourceId: z.uuid(),
  content: z.string(),
  author: authorSchema,
  isOwner: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const commentResponseSchema = z.object({ data: commentSchema, meta: apiMetaSchema });
export const commentListResponseSchema = z.object({
  data: z.array(commentSchema),
  meta: apiMetaSchema,
});

export type HealthData = z.infer<typeof healthDataSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type CheckEmailRequest = z.infer<typeof checkEmailRequestSchema>;
export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthUserResponse = z.infer<typeof authUserResponseSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type SourceCreateRequest = z.infer<typeof sourceCreateRequestSchema>;
export type SourceUpdateRequest = z.infer<typeof sourceUpdateRequestSchema>;
export type SourceListItem = z.infer<typeof sourceListItemSchema>;
export type RelatedSource = z.infer<typeof relatedSourceSchema>;
export type SourceGraphNode = z.infer<typeof sourceGraphNodeSchema>;
export type SourceGraphEdge = z.infer<typeof sourceGraphEdgeSchema>;
export type SourceGraphResponse = z.infer<typeof sourceGraphResponseSchema>;
export type SourceDetail = z.infer<typeof sourceDetailSchema>;
export type SourceListResponse = z.infer<typeof sourceListResponseSchema>;
export type SourceDetailResponse = z.infer<typeof sourceDetailResponseSchema>;
export type ExtractUrlRequest = z.infer<typeof extractUrlRequestSchema>;
export type ExtractUrlResponse = z.infer<typeof extractUrlResponseSchema>;
export type SummarizeSourceResponse = z.infer<typeof summarizeSourceResponseSchema>;
export type SourceChatMessage = z.infer<typeof sourceChatMessageSchema>;
export type SourceChatRequest = z.infer<typeof sourceChatRequestSchema>;
export type SourceChatResponse = z.infer<typeof sourceChatResponseSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type CommentRequest = z.infer<typeof commentRequestSchema>;
export type SourceComment = z.infer<typeof commentSchema>;
export type CommentResponse = z.infer<typeof commentResponseSchema>;
export type CommentListResponse = z.infer<typeof commentListResponseSchema>;

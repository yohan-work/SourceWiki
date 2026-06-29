import { z } from 'zod';
import {
  apiErrorResponseSchema,
  authMessageResponseSchema,
  authUserResponseSchema,
  checkEmailRequestSchema,
  checkEmailResponseSchema,
  commentListResponseSchema,
  commentRequestSchema,
  commentResponseSchema,
  extractUrlResponseSchema,
  loginRequestSchema,
  resendVerificationRequestSchema,
  sourceChatRequestSchema,
  sourceChatResponseSchema,
  sourceQuestionSuggestionsResponseSchema,
  summarizeSourceResponseSchema,
  sourceCreateRequestSchema,
  sourceDetailResponseSchema,
  sourceGraphResponseSchema,
  sourceLikeResponseSchema,
  sourceListResponseSchema,
  sourceUpdateRequestSchema,
  signupRequestSchema,
  updateProfileRequestSchema,
  userProfileResponseSchema,
  verifyEmailRequestSchema,
} from '@sourcewiki/shared';

const schema = (value: z.ZodType) => z.toJSONSchema(value, { target: 'draft-2020-12' });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (name: string) => ({ content: { 'application/json': { schema: ref(name) } } });
const response = (description: string, name?: string) => ({
  description,
  ...(name ? json(name) : {}),
});
const errorResponses = {
  401: response('인증 필요', 'ApiError'),
  403: response('권한 없음', 'ApiError'),
  404: response('리소스 없음', 'ApiError'),
  422: response('입력 검증 실패', 'ApiError'),
  429: response('요청 제한', 'ApiError'),
};

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'SourceLink Wiki API',
    version: '0.3.0',
    description: '인증, 자료, 댓글을 제공하는 SourceLink Wiki REST API',
  },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: {
      accessCookie: { type: 'apiKey', in: 'cookie', name: 'access_token' },
      refreshCookie: { type: 'apiKey', in: 'cookie', name: 'refresh_token' },
    },
    schemas: {
      ApiError: schema(apiErrorResponseSchema),
      CheckEmailRequest: schema(checkEmailRequestSchema),
      CheckEmailResponse: schema(checkEmailResponseSchema),
      SignupRequest: schema(signupRequestSchema),
      LoginRequest: schema(loginRequestSchema),
      VerifyEmailRequest: schema(verifyEmailRequestSchema),
      ResendVerificationRequest: schema(resendVerificationRequestSchema),
      AuthUserResponse: schema(authUserResponseSchema),
      AuthMessageResponse: schema(authMessageResponseSchema),
      SourceCreate: schema(sourceCreateRequestSchema),
      SourceUpdate: schema(sourceUpdateRequestSchema),
      UpdateProfile: schema(updateProfileRequestSchema),
      SourceListResponse: schema(sourceListResponseSchema),
      SourceDetailResponse: schema(sourceDetailResponseSchema),
      SourceGraphResponse: schema(sourceGraphResponseSchema),
      SourceLikeResponse: schema(sourceLikeResponseSchema),
      UserProfileResponse: schema(userProfileResponseSchema),
      CommentRequest: schema(commentRequestSchema),
      CommentResponse: schema(commentResponseSchema),
      CommentListResponse: schema(commentListResponseSchema),
      ExtractUrlRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['url'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            maxLength: 2048,
            description: '본문을 미리 추출할 공개 HTTP(S) URL',
          },
        },
      },
      ExtractUrlResponse: schema(extractUrlResponseSchema),
      SummarizeSourceResponse: schema(summarizeSourceResponseSchema),
      SourceChatRequest: schema(sourceChatRequestSchema),
      SourceChatResponse: schema(sourceChatResponseSchema),
      SourceQuestionSuggestionsResponse: schema(sourceQuestionSuggestionsResponseSchema),
    },
  },
  paths: {
    '/auth/check-email': {
      post: {
        tags: ['Auth'],
        summary: '이메일 사용 가능 여부 확인',
        requestBody: { required: true, ...json('CheckEmailRequest') },
        responses: {
          200: response('이메일 사용 가능 여부', 'CheckEmailResponse'),
          422: errorResponses[422],
          429: errorResponses[429],
        },
      },
    },
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: '회원가입 및 인증 메일 발송',
        requestBody: { required: true, ...json('SignupRequest') },
        responses: {
          201: response('생성된 사용자', 'AuthUserResponse'),
          409: response('이미 사용 중인 이메일', 'ApiError'),
          422: errorResponses[422],
          429: errorResponses[429],
          503: response('인증 메일 발송 실패', 'ApiError'),
        },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: '이메일 인증 완료',
        requestBody: { required: true, ...json('VerifyEmailRequest') },
        responses: {
          200: response('인증 완료 메시지', 'AuthMessageResponse'),
          400: response('유효하지 않거나 만료된 인증 토큰', 'ApiError'),
          422: errorResponses[422],
          429: errorResponses[429],
        },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: '인증 메일 재발송',
        requestBody: { required: true, ...json('ResendVerificationRequest') },
        responses: {
          200: response('재발송 처리 메시지', 'AuthMessageResponse'),
          422: errorResponses[422],
          429: errorResponses[429],
          503: response('인증 메일 발송 실패', 'ApiError'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: '로그인 및 인증 쿠키 발급',
        requestBody: { required: true, ...json('LoginRequest') },
        responses: {
          200: response('로그인한 사용자', 'AuthUserResponse'),
          401: response('이메일 또는 비밀번호 불일치', 'ApiError'),
          403: response('이메일 미인증', 'ApiError'),
          422: errorResponses[422],
          429: errorResponses[429],
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: '인증 쿠키 재발급',
        security: [{ refreshCookie: [] }],
        responses: {
          204: response('재발급됨'),
          401: response('세션 만료 또는 재사용 감지', 'ApiError'),
          429: errorResponses[429],
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: '로그아웃 및 인증 쿠키 제거',
        security: [{ refreshCookie: [] }],
        responses: {
          204: response('로그아웃됨'),
          429: errorResponses[429],
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: '현재 로그인 사용자 조회',
        security: [{ accessCookie: [] }],
        responses: {
          200: response('현재 사용자', 'AuthUserResponse'),
          401: errorResponses[401],
        },
      },
    },
    '/tools/extract-url': {
      post: {
        tags: ['Tools'],
        summary: 'URL 본문 미리 추출',
        security: [{ accessCookie: [] }],
        requestBody: { required: true, ...json('ExtractUrlRequest') },
        responses: {
          200: response('추출된 본문 미리보기', 'ExtractUrlResponse'),
          ...errorResponses,
          413: response('응답 크기 초과', 'ApiError'),
          415: response('지원하지 않는 Content-Type', 'ApiError'),
          504: response('추출 시간 초과', 'ApiError'),
        },
      },
    },
    '/sources': {
      get: {
        tags: ['Sources'],
        summary: '자료 목록 조회',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 12 },
          },
          {
            name: 'q',
            in: 'query',
            description: '제목, 요약, 본문 미리보기, 도메인, 태그명에서 검색할 키워드',
            schema: { type: 'string', minLength: 1, maxLength: 100 },
          },
          {
            name: 'tag',
            in: 'query',
            description: '정확히 일치하는 태그명으로 필터링',
            schema: { type: 'string', minLength: 1, maxLength: 30 },
          },
          {
            name: 'type',
            in: 'query',
            description: '자료 유형으로 필터링',
            schema: {
              type: 'string',
              enum: ['article', 'docs', 'paper', 'github', 'other'],
            },
          },
        ],
        responses: { 200: response('자료 목록', 'SourceListResponse'), 422: errorResponses[422] },
      },
      post: {
        tags: ['Sources'],
        summary: '자료 생성',
        security: [{ accessCookie: [] }],
        requestBody: { required: true, ...json('SourceCreate') },
        responses: { 201: response('생성된 자료', 'SourceDetailResponse'), ...errorResponses },
      },
    },
    '/sources/graph': {
      get: {
        tags: ['Sources'],
        summary: '태그 기반 자료 연결 그래프 조회',
        responses: { 200: response('자료 연결 그래프', 'SourceGraphResponse') },
      },
    },
    '/sources/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['Sources'],
        summary: '자료 상세 조회',
        responses: { 200: response('자료 상세', 'SourceDetailResponse'), 404: errorResponses[404] },
      },
      patch: {
        tags: ['Sources'],
        summary: '자료 수정',
        security: [{ accessCookie: [] }],
        requestBody: { required: true, ...json('SourceUpdate') },
        responses: { 200: response('수정된 자료', 'SourceDetailResponse'), ...errorResponses },
      },
      delete: {
        tags: ['Sources'],
        summary: '자료 삭제',
        security: [{ accessCookie: [] }],
        responses: { 204: response('삭제됨'), ...errorResponses },
      },
    },
    '/sources/{id}/summarize': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      post: {
        tags: ['Sources'],
        summary: '저장된 본문으로 AI 요약 초안 생성',
        security: [{ accessCookie: [] }],
        responses: {
          200: response('AI 요약 초안', 'SummarizeSourceResponse'),
          ...errorResponses,
          409: response('요약할 본문 없음', 'ApiError'),
          502: response('AI 응답 형식 오류', 'ApiError'),
          503: response('AI 비활성 또는 사용 불가', 'ApiError'),
          504: response('AI 요청 시간 초과', 'ApiError'),
        },
      },
    },
    '/sources/{id}/like': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      post: {
        tags: ['Sources'],
        summary: '자료 좋아요 추가',
        security: [{ accessCookie: [] }],
        responses: { 200: response('좋아요 상태', 'SourceLikeResponse'), ...errorResponses },
      },
      delete: {
        tags: ['Sources'],
        summary: '자료 좋아요 취소',
        security: [{ accessCookie: [] }],
        responses: { 200: response('좋아요 상태', 'SourceLikeResponse'), ...errorResponses },
      },
    },
    '/sources/{id}/chat': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      post: {
        tags: ['Sources'],
        summary: '저장된 본문으로 AI 대화',
        security: [{ accessCookie: [] }],
        requestBody: { required: true, ...json('SourceChatRequest') },
        responses: {
          200: response('AI 대화 답변', 'SourceChatResponse'),
          ...errorResponses,
          409: response('질문할 본문 없음', 'ApiError'),
          502: response('AI 응답 형식 오류', 'ApiError'),
          503: response('AI 비활성 또는 사용 불가', 'ApiError'),
          504: response('AI 요청 시간 초과', 'ApiError'),
        },
      },
    },
    '/sources/{id}/ai/suggestions': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      post: {
        tags: ['Sources'],
        summary: '저장된 본문으로 AI 추천 질문 생성',
        security: [{ accessCookie: [] }],
        responses: {
          200: response('AI 추천 질문', 'SourceQuestionSuggestionsResponse'),
          ...errorResponses,
          409: response('질문할 본문 없음', 'ApiError'),
          502: response('AI 응답 형식 오류', 'ApiError'),
          503: response('AI 비활성 또는 사용 불가', 'ApiError'),
          504: response('AI 요청 시간 초과', 'ApiError'),
        },
      },
    },
    '/sources/{id}/comments': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['Comments'],
        summary: '댓글 목록 조회',
        responses: { 200: response('댓글 목록', 'CommentListResponse'), 404: errorResponses[404] },
      },
      post: {
        tags: ['Comments'],
        summary: '댓글 생성',
        security: [{ accessCookie: [] }],
        requestBody: { required: true, ...json('CommentRequest') },
        responses: { 201: response('생성된 댓글', 'CommentResponse'), ...errorResponses },
      },
    },
    '/users/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['Users'],
        summary: '공개 사용자 프로필 조회',
        responses: {
          200: response('사용자 프로필', 'UserProfileResponse'),
          404: errorResponses[404],
        },
      },
    },
    '/users/{id}/sources': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['Users'],
        summary: '사용자가 작성한 자료 목록 조회',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 12 },
          },
        ],
        responses: {
          200: response('사용자 자료 목록', 'SourceListResponse'),
          404: errorResponses[404],
        },
      },
    },
    '/users/me': {
      patch: {
        tags: ['Users'],
        summary: '내 프로필 수정',
        security: [{ accessCookie: [] }],
        requestBody: { required: true, ...json('UpdateProfile') },
        responses: { 200: response('수정된 사용자', 'AuthUserResponse'), ...errorResponses },
      },
    },
    '/comments/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      patch: {
        tags: ['Comments'],
        summary: '댓글 수정',
        security: [{ accessCookie: [] }],
        requestBody: { required: true, ...json('CommentRequest') },
        responses: { 200: response('수정된 댓글', 'CommentResponse'), ...errorResponses },
      },
      delete: {
        tags: ['Comments'],
        summary: '댓글 삭제',
        security: [{ accessCookie: [] }],
        responses: { 204: response('삭제됨'), ...errorResponses },
      },
    },
  },
} as const;

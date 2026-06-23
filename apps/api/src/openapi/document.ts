import { z } from 'zod';
import {
  apiErrorResponseSchema,
  commentListResponseSchema,
  commentRequestSchema,
  commentResponseSchema,
  sourceCreateRequestSchema,
  sourceDetailResponseSchema,
  sourceListResponseSchema,
  sourceUpdateRequestSchema,
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
      SourceCreate: schema(sourceCreateRequestSchema),
      SourceUpdate: schema(sourceUpdateRequestSchema),
      SourceListResponse: schema(sourceListResponseSchema),
      SourceDetailResponse: schema(sourceDetailResponseSchema),
      CommentRequest: schema(commentRequestSchema),
      CommentResponse: schema(commentResponseSchema),
      CommentListResponse: schema(commentListResponseSchema),
    },
  },
  paths: {
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

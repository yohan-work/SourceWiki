import SwaggerParser from '@apidevtools/swagger-parser';
import { describe, expect, it } from 'vitest';

import { openApiDocument } from './document.js';

describe('OpenAPI document', () => {
  it('is a valid OpenAPI document and includes every CRUD path', async () => {
    await expect(
      SwaggerParser.validate(JSON.parse(JSON.stringify(openApiDocument))),
    ).resolves.toBeTruthy();
    expect(Object.keys(openApiDocument.paths)).toEqual(
      expect.arrayContaining([
        '/tools/extract-url',
        '/auth/check-email',
        '/auth/signup',
        '/auth/verify-email',
        '/auth/resend-verification',
        '/auth/login',
        '/auth/refresh',
        '/auth/logout',
        '/auth/me',
        '/sources',
        '/sources/graph',
        '/sources/{id}',
        '/sources/{id}/summarize',
        '/sources/{id}/chat',
        '/sources/{id}/ai/suggestions',
        '/sources/{id}/comments',
        '/sources/{id}/files',
        '/files/{id}/download',
        '/files/{id}',
        '/comments/{id}',
      ]),
    );
  });
});

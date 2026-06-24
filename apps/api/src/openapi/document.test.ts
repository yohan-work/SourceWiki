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
        '/sources',
        '/sources/graph',
        '/sources/{id}',
        '/sources/{id}/summarize',
        '/sources/{id}/comments',
        '/comments/{id}',
      ]),
    );
  });
});

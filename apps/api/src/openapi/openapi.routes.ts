import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import { openApiDocument } from './document.js';

export function createOpenApiRouter() {
  const router = Router();
  router.get('/openapi.json', (_req, res) => res.json(openApiDocument));
  router.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, { customSiteTitle: 'SourceLink Wiki API' }),
  );
  return router;
}

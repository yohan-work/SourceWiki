import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { AppError } from '../errors/app-error.js';

export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? 'form');
        fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
      }
      next(new AppError(422, 'VALIDATION_ERROR', '입력값을 확인해 주세요.', fieldErrors));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new AppError(422, 'VALIDATION_ERROR', '조회 조건을 확인해 주세요.'));
      return;
    }
    res.locals.validatedQuery = result.data;
    next();
  };
}

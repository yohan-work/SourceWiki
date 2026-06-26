import { rateLimit } from 'express-rate-limit';

export const createRateLimit = (limit: number, windowMs = 15 * 60 * 1_000) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false });

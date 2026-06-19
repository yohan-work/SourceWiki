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
  }),
});

export type HealthData = z.infer<typeof healthDataSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

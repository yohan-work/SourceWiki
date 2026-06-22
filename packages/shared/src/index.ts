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

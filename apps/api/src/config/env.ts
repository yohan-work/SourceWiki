import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z
    .url()
    .default('postgresql://sourcewiki:sourcewiki_local@localhost:5432/sourcewiki?schema=public'),
  APP_URL: z.url().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(32).default('development-access-secret-change-me-123456'),
  JWT_REFRESH_SECRET: z.string().min(32).default('development-refresh-secret-change-me-12345'),
  JWT_ISSUER: z.string().min(1).default('sourcewiki-api'),
  JWT_AUDIENCE: z.string().min(1).default('sourcewiki-web'),
  SMTP_HOST: z.string().min(1).default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().max(65535).default(1025),
  SMTP_FROM: z.email().default('noreply@sourcewiki.local'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Invalid environment configuration: ${fields}`);
}

export const env = parsed.data;

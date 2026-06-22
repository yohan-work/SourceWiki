import type {
  AuthUserResponse,
  LoginRequest,
  ResendVerificationRequest,
  SignupRequest,
} from '@sourcewiki/shared';

import { apiFetch } from '@/lib/api/api-client';

export const authApi = {
  me: () => apiFetch<AuthUserResponse>('/api/auth/me'),
  signup: (input: SignupRequest) =>
    apiFetch<AuthUserResponse>(
      '/api/auth/signup',
      { method: 'POST', body: JSON.stringify(input) },
      { retryAuth: false },
    ),
  login: (input: LoginRequest) =>
    apiFetch<AuthUserResponse>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify(input) },
      { retryAuth: false },
    ),
  logout: () => apiFetch<void>('/api/auth/logout', { method: 'POST' }, { retryAuth: false }),
  verifyEmail: (token: string) =>
    apiFetch<{ data: { message: string } }>(
      '/api/auth/verify-email',
      { method: 'POST', body: JSON.stringify({ token }) },
      { retryAuth: false },
    ),
  resend: (input: ResendVerificationRequest) =>
    apiFetch<{ data: { message: string } }>(
      '/api/auth/resend-verification',
      { method: 'POST', body: JSON.stringify(input) },
      { retryAuth: false },
    ),
};

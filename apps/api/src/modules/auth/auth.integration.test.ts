import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../lib/database.js';

const origin = 'http://localhost:3000';
const email = `auth-integration-${randomUUID()}@example.com`;
let verificationUrl = '';

const app = createApp({
  mailer: {
    async sendVerification(message) {
      verificationUrl = message.verificationUrl;
    },
  },
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
});

describe('auth integration', () => {
  it('completes signup, verification, login, refresh rotation, reuse detection, and logout', async () => {
    await request(app)
      .post('/api/auth/signup')
      .set('Origin', origin)
      .send({
        email: `  ${email.toUpperCase()} `,
        nickname: '통합검증',
        password: 'password123',
      })
      .expect(201);

    const token = new URL(verificationUrl).searchParams.get('token');
    expect(token).toBeTruthy();

    await request(app)
      .post('/api/auth/verify-email')
      .set('Origin', origin)
      .send({ token })
      .expect(200);

    const agent = request.agent(app);
    const loginResponse = await agent
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email, password: 'password123' })
      .expect(200);
    expect(loginResponse.body.data).toMatchObject({ email, emailVerified: true });

    await agent.get('/api/auth/me').expect(200);

    const initialCookies = loginResponse.headers['set-cookie'];
    const cookieList = Array.isArray(initialCookies) ? initialCookies : [String(initialCookies)];
    const oldRefreshCookie = cookieList.find((cookie) => cookie.startsWith('refresh_token='));
    expect(oldRefreshCookie).toBeTruthy();

    await agent.post('/api/auth/refresh').set('Origin', origin).expect(204);

    const reuseResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', oldRefreshCookie ?? '')
      .expect(401);
    expect(reuseResponse.body.error.code).toBe('SESSION_REUSED');

    await agent
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email, password: 'password123' })
      .expect(200);
    await agent.post('/api/auth/logout').set('Origin', origin).expect(204);
    await agent.get('/api/auth/me').expect(401);
  });
});

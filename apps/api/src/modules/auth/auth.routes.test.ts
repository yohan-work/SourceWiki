import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';

describe('auth route boundary', () => {
  it('rejects cross-site mutations before auth processing', async () => {
    const response = await request(createApp())
      .post('/api/auth/login')
      .set('Origin', 'https://attacker.example')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(403);
    expect(response.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  });

  it('maps invalid auth input to field errors', async () => {
    const response = await request(createApp())
      .post('/api/auth/signup')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'invalid', nickname: 'x', password: 'short' })
      .expect(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fieldErrors).toMatchObject({
      email: expect.any(Array),
      nickname: expect.any(Array),
      password: expect.any(Array),
    });
  });
});

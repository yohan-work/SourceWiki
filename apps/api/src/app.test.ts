import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';

describe('health API', () => {
  it('reports liveness without checking the database', async () => {
    const response = await request(createApp()).get('/api/health/live').expect(200);

    expect(response.body.data).toMatchObject({ status: 'ok', service: 'api' });
    expect(response.headers['x-request-id']).toBe(response.body.meta.requestId);
  });

  it('reports readiness when the database is reachable', async () => {
    const response = await request(createApp({ checkDatabase: async () => Promise.resolve() }))
      .get('/api/health/ready')
      .expect(200);

    expect(response.body.data.checks.database).toBe('up');
  });

  it('returns 503 when the database is unavailable', async () => {
    const response = await request(
      createApp({
        checkDatabase: async () => Promise.reject(new Error('database unavailable')),
      }),
    )
      .get('/api/health/ready')
      .expect(503);

    expect(response.body.data).toMatchObject({
      status: 'unavailable',
      checks: { database: 'down' },
    });
  });

  it('uses the common error contract for unknown routes', async () => {
    const response = await request(createApp()).get('/api/missing').expect(404);

    expect(response.body.error).toMatchObject({ code: 'ROUTE_NOT_FOUND' });
    expect(response.body.error.requestId).toBeTruthy();
  });
});

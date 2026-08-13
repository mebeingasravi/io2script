import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';

describe('GET /health', () => {
  test('returns the standard health payload', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(true);
    expect(res.body.message).toBe('Server is running');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('unknown routes', () => {
  test('respond with a 404 in the standard error envelope', async () => {
    const res = await request(app).get('/this-route-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });
});

describe('GET /scripts', () => {
  test('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/scripts');

    expect(res.status).toBe(401);
    expect(res.body.status).toBe(false);
  });
});

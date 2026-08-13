import { describe, test, expect, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import auth from '../middlewares/auth.js';
import config from '../config/index.js';

function runMiddleware(req) {
  return new Promise((resolve) => {
    const next = jest.fn((err) => resolve(err));
    auth()(req, {}, next);
  });
}

describe('auth middleware', () => {
  test('rejects a request with no Authorization header', async () => {
    const err = await runMiddleware({ headers: {} });
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/missing/i);
  });

  test('rejects a header that is not a Bearer token', async () => {
    const err = await runMiddleware({ headers: { authorization: 'Basic abc' } });
    expect(err.statusCode).toBe(401);
  });

  test('rejects an invalid/expired token', async () => {
    const err = await runMiddleware({ headers: { authorization: 'Bearer not-a-real-token' } });
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/invalid or expired/i);
  });

  test('attaches the decoded payload to req.user for a valid token', async () => {
    const token = jwt.sign({ id: 'user-1', role: 'admin' }, config.jwt.secret);
    const req = { headers: { authorization: `Bearer ${token}` } };

    const err = await runMiddleware(req);

    expect(err).toBeUndefined();
    expect(req.user).toMatchObject({ id: 'user-1', role: 'admin' });
  });
});

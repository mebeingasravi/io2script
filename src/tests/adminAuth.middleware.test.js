import { describe, test, expect, jest } from '@jest/globals';
import adminAuth from '../middlewares/adminAuth.js';

function runMiddleware(req) {
  return new Promise((resolve) => {
    const next = jest.fn((err) => resolve(err));
    adminAuth(req, {}, next);
  });
}

describe('adminAuth middleware', () => {
  test('rejects when req.user is missing (auth() did not run first)', async () => {
    const err = await runMiddleware({});
    expect(err.statusCode).toBe(401);
  });

  test('rejects a non-admin user', async () => {
    const err = await runMiddleware({ user: { id: '1', role: 'user' } });
    expect(err.statusCode).toBe(403);
  });

  test('allows an admin user through', async () => {
    const err = await runMiddleware({ user: { id: '1', role: 'admin' } });
    expect(err).toBeUndefined();
  });
});

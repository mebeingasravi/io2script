import { describe, test, expect, jest } from '@jest/globals';
import {
  createScriptValidator,
  paginationValidator,
  logsQueryValidator,
  idParamValidator,
} from '../validator/scriptValidator.js';

function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    const next = jest.fn((err) => resolve(err));
    middleware(req, {}, next);
    if (next.mock.calls.length === 0) resolve(undefined);
  });
}

describe('createScriptValidator', () => {
  const validBody = {
    script_name: 'bank_nifty_strategy',
    strategy_type: 'Bank-nifty',
    description: 'A short description',
    react_script: 'console.log(1)',
  };

  test('passes through a valid payload', async () => {
    const req = { body: { ...validBody } };
    const err = await runMiddleware(createScriptValidator, req);
    expect(err).toBeUndefined();
    expect(req.body.script_name).toBe('bank_nifty_strategy');
  });

  test('rejects a missing required field', async () => {
    const req = { body: { ...validBody, script_name: undefined } };
    const err = await runMiddleware(createScriptValidator, req);
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/script_name/);
  });

  test('rejects an invalid strategy_type', async () => {
    const req = { body: { ...validBody, strategy_type: 'Not-a-real-type' } };
    const err = await runMiddleware(createScriptValidator, req);
    expect(err.statusCode).toBe(400);
  });

  test('rejects a description over 500 characters', async () => {
    const req = { body: { ...validBody, description: 'x'.repeat(501) } };
    const err = await runMiddleware(createScriptValidator, req);
    expect(err.statusCode).toBe(400);
  });

  test('accepts a description at exactly 500 characters', async () => {
    const req = { body: { ...validBody, description: 'x'.repeat(500) } };
    const err = await runMiddleware(createScriptValidator, req);
    expect(err).toBeUndefined();
  });
});

describe('paginationValidator', () => {
  test('defaults page and limit when absent', async () => {
    const req = { query: {} };
    const err = await runMiddleware(paginationValidator, req);
    expect(err).toBeUndefined();
    expect(req.query).toEqual({ page: 1, limit: 10 });
  });

  test('rejects a limit above the maximum', async () => {
    const req = { query: { limit: '1000' } };
    const err = await runMiddleware(paginationValidator, req);
    expect(err.statusCode).toBe(400);
  });
});

describe('idParamValidator', () => {
  test('accepts a valid v4 UUID', async () => {
    const req = { params: { id: '123e4567-e89b-42d3-a456-426614174000' } };
    const err = await runMiddleware(idParamValidator, req);
    expect(err).toBeUndefined();
  });

  test('rejects a non-UUID id', async () => {
    const req = { params: { id: 'not-a-uuid' } };
    const err = await runMiddleware(idParamValidator, req);
    expect(err.statusCode).toBe(400);
  });
});

describe('logsQueryValidator', () => {
  test('accepts valid ISO date range', async () => {
    const req = { query: { date_from: '2026-01-01', date_to: '2026-01-30' } };
    const err = await runMiddleware(logsQueryValidator, req);
    expect(err).toBeUndefined();
  });

  test('rejects date_to before date_from', async () => {
    const req = { query: { date_from: '2026-01-30', date_to: '2026-01-01' } };
    const err = await runMiddleware(logsQueryValidator, req);
    expect(err.statusCode).toBe(400);
  });
});

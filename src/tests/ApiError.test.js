import { describe, test, expect } from '@jest/globals';
import ApiError from '../helper/ApiError.js';

describe('ApiError', () => {
  test('carries statusCode and message', () => {
    const err = new ApiError(404, 'Not found');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err).toBeInstanceOf(Error);
  });

  test('defaults isOperational to true', () => {
    expect(new ApiError(400, 'Bad request').isOperational).toBe(true);
  });

  test('accepts an explicit isOperational flag', () => {
    expect(new ApiError(500, 'Boom', false).isOperational).toBe(false);
  });

  test('captures a stack trace', () => {
    const err = new ApiError(500, 'Boom');
    expect(typeof err.stack).toBe('string');
    expect(err.stack.length).toBeGreaterThan(0);
  });
});

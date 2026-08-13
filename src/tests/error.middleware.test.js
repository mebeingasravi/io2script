import { describe, test, expect, jest } from '@jest/globals';
import { errorConverter, errorHandler } from '../middlewares/error.js';
import ApiError from '../helper/ApiError.js';

describe('errorConverter', () => {
  test('passes an existing ApiError through unchanged', () => {
    const original = new ApiError(404, 'Not found');
    const next = jest.fn();

    errorConverter(original, {}, {}, next);

    expect(next).toHaveBeenCalledWith(original);
  });

  test('wraps a plain Error into an ApiError with statusCode 500', () => {
    const next = jest.fn();

    errorConverter(new Error('boom'), {}, {}, next);

    const converted = next.mock.calls[0][0];
    expect(converted).toBeInstanceOf(ApiError);
    expect(converted.statusCode).toBe(500);
    expect(converted.message).toBe('boom');
    expect(converted.isOperational).toBe(false);
  });

  test('preserves a custom statusCode on a non-ApiError error', () => {
    const err = new Error('nope');
    err.statusCode = 403;
    const next = jest.fn();

    errorConverter(err, {}, {}, next);

    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});

describe('errorHandler', () => {
  function createRes() {
    const res = {};
    res.status = jest.fn(() => res);
    res.send = jest.fn(() => res);
    return res;
  }

  test('sends the standard response envelope with the error statusCode', () => {
    const res = createRes();
    const err = new ApiError(404, 'Not found');

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ status: false, message: 'Not found', data: {} }),
    );
  });

  test('defaults to statusCode 500 when the error has none', () => {
    const res = createRes();

    errorHandler(new Error('boom'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

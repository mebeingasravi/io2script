import { describe, test, expect } from '@jest/globals';
import responseHandler from '../helper/responseHandler.js';

describe('responseHandler.success', () => {
  test('defaults to statusCode 200 and empty data', () => {
    expect(responseHandler.success('ok')).toEqual({
      statusCode: 200,
      response: { status: true, message: 'ok', data: {} },
    });
  });

  test('accepts custom data and statusCode', () => {
    expect(responseHandler.success('created', { id: 1 }, 201)).toEqual({
      statusCode: 201,
      response: { status: true, message: 'created', data: { id: 1 } },
    });
  });
});

describe('responseHandler.error', () => {
  test('defaults to statusCode 500 and empty data', () => {
    expect(responseHandler.error('failure')).toEqual({
      statusCode: 500,
      response: { status: false, message: 'failure', data: {} },
    });
  });

  test('accepts a custom statusCode', () => {
    expect(responseHandler.error('not found', 404)).toEqual({
      statusCode: 404,
      response: { status: false, message: 'not found', data: {} },
    });
  });
});

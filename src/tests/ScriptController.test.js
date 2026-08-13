import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const serviceMock = {
  createScript: jest.fn(),
  getScripts: jest.fn(),
  restartScript: jest.fn(),
  stopScript: jest.fn(),
  getLogs: jest.fn(),
};

jest.unstable_mockModule('../services/ScriptService.js', () => ({
  default: jest.fn(() => serviceMock),
}));

const { default: ScriptController } = await import('../controllers/ScriptController.js');

function createRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
}

describe('ScriptController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createScript sends the service result as-is', async () => {
    serviceMock.createScript.mockResolvedValue({
      statusCode: 201,
      response: { status: true, message: 'Script created successfully', data: {} },
    });

    const req = { body: { script_name: 'demo' } };
    const res = createRes();

    await ScriptController.createScript(req, res);

    expect(serviceMock.createScript).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      status: true,
      message: 'Script created successfully',
      data: {},
    });
  });

  test('createScript responds 500 with a safe body when the service throws', async () => {
    serviceMock.createScript.mockRejectedValue(new Error('db exploded'));

    const res = createRes();
    await ScriptController.createScript({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ status: false, message: 'db exploded' }),
    );
  });

  test('getScripts forwards req.query to the service', async () => {
    serviceMock.getScripts.mockResolvedValue({
      statusCode: 200,
      response: { status: true, message: 'ok', data: { scripts: [] } },
    });

    const req = { query: { page: 1, limit: 10 } };
    const res = createRes();

    await ScriptController.getScripts(req, res);

    expect(serviceMock.getScripts).toHaveBeenCalledWith(req.query);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('restartScript forwards req.params.id to the service', async () => {
    serviceMock.restartScript.mockResolvedValue({
      statusCode: 200,
      response: { status: true, message: 'Script restarted successfully', data: {} },
    });

    const req = { params: { id: 'script-1' } };
    const res = createRes();

    await ScriptController.restartScript(req, res);

    expect(serviceMock.restartScript).toHaveBeenCalledWith('script-1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('stopScript forwards req.params.id to the service', async () => {
    serviceMock.stopScript.mockResolvedValue({
      statusCode: 200,
      response: { status: true, message: 'Script stopped successfully', data: {} },
    });

    const req = { params: { id: 'script-1' } };
    const res = createRes();

    await ScriptController.stopScript(req, res);

    expect(serviceMock.stopScript).toHaveBeenCalledWith('script-1');
  });

  test('getLogs forwards params.id and query to the service', async () => {
    serviceMock.getLogs.mockResolvedValue({
      statusCode: 200,
      response: { status: true, message: 'ok', data: [] },
    });

    const req = { params: { id: 'script-1' }, query: { date_from: '2026-01-01' } };
    const res = createRes();

    await ScriptController.getLogs(req, res);

    expect(serviceMock.getLogs).toHaveBeenCalledWith('script-1', req.query);
  });
});

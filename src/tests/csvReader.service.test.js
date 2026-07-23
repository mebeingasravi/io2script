import { describe, test, expect, afterEach } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readCsvStream } from '../services/csvReader.service.js';

const tempFiles = [];

function writeTempCsv(content) {
  const filePath = path.join(os.tmpdir(), `io2script-test-${Date.now()}-${Math.random()}.csv`);
  fs.writeFileSync(filePath, content, 'utf8');
  tempFiles.push(filePath);
  return filePath;
}

afterEach(() => {
  while (tempFiles.length) {
    const filePath = tempFiles.pop();
    fs.rmSync(filePath, { force: true });
  }
});

describe('readCsvStream', () => {
  test('parses every data row and reports the total row count', async () => {
    const filePath = writeTempCsv('id,name\n1,foo\n2,bar\n');
    const rows = [];

    const result = await readCsvStream(filePath, (row) => rows.push(row));

    expect(result.rowCount).toBe(2);
    expect(rows).toEqual([
      { id: '1', name: 'foo' },
      { id: '2', name: 'bar' },
    ]);
  });

  test('skips empty lines and reports them as warnings', async () => {
    const filePath = writeTempCsv('id,name\n1,foo\n\n2,bar\n');
    const rows = [];
    const warnings = [];

    const result = await readCsvStream(filePath, (row) => rows.push(row), (message, line) =>
      warnings.push({ message, line }),
    );

    expect(result.rowCount).toBe(2);
    expect(warnings).toEqual([{ message: 'Skipped empty line', line: 3 }]);
  });

  test('still maps a malformed row but reports a warning', async () => {
    const filePath = writeTempCsv('id,name,extra\n1,foo\n');
    const rows = [];
    const warnings = [];

    await readCsvStream(filePath, (row) => rows.push(row), (message, line) =>
      warnings.push({ message, line }),
    );

    expect(rows).toEqual([{ id: '1', name: 'foo', extra: '' }]);
    expect(warnings[0].message).toMatch(/Malformed row/);
  });

  test('rejects with a descriptive error when the file does not exist', async () => {
    await expect(readCsvStream('/nonexistent/path/file.csv', () => {})).rejects.toThrow(
      /Input CSV file not found/,
    );
  });

  test('handles quoted fields containing commas', async () => {
    const filePath = writeTempCsv(
      'id,when\n1,"Mon Jul 20 2026 12:56:07 GMT+0530 (India Standard Time)"\n',
    );
    const rows = [];

    await readCsvStream(filePath, (row) => rows.push(row));

    expect(rows[0].when).toBe('Mon Jul 20 2026 12:56:07 GMT+0530 (India Standard Time)');
  });

  test('a throwing onRow callback is reported as a warning without stopping the stream', async () => {
    const filePath = writeTempCsv('id\n1\n2\n');
    const warnings = [];
    let calls = 0;

    const result = await readCsvStream(
      filePath,
      () => {
        calls += 1;
        if (calls === 1) throw new Error('boom');
      },
      (message, line) => warnings.push({ message, line }),
    );

    expect(calls).toBe(2);
    expect(result.rowCount).toBe(1);
    expect(warnings[0].message).toMatch(/Row processing failed: boom/);
  });
});

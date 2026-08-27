import express from 'express';
import { DestinationStream } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AppEnv } from '../src/config/env';
import {
  createDevelopmentLogDestination,
  createRequestLogger,
  requestCompletionLogger,
} from '../src/middleware/request-logger';

const env: AppEnv = {
  NODE_ENV: 'development',
  MONGODB_URI: 'mongodb://localhost:27017/pente_test',
  API_PORT: 4000,
  WEB_ORIGIN: 'http://localhost:3000',
  JWT_ACCESS_SECRET: 'test-access-secret-with-thirty-two-characters',
  JWT_REFRESH_SECRET: 'test-refresh-secret-with-thirty-two-characters',
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY_DAYS: 7,
  GEMINI_MODEL: 'test',
  GEMINI_BASE_URL: 'https://example.com',
  AI_TIMEOUT_MS: 20,
  AI_PROVIDER: 'disabled',
  LOG_LEVEL: 'info',
};

describe('request logging', () => {
  it('writes one concise aligned development log line', async () => {
    const lines: string[] = [];
    const destination = createDevelopmentLogDestination((line) => lines.push(line));
    const app = express();
    app.use(createRequestLogger(env, destination));
    app.use(requestCompletionLogger);
    app.get('/health', (_request, response) => response.json({ status: 'ok' }));

    await request(app).get('/health').set('Authorization', 'Bearer private-token');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/INFO\s+GET\s+\/health\s+200\s+\d+\.\d ms/);
    expect(lines[0]).not.toContain('private-token');
    expect(lines[0]).not.toContain('headers');
  });

  it('keeps production request logs structured and excludes headers', async () => {
    const entries: string[] = [];
    const destination: DestinationStream = { write: (value) => entries.push(value) };
    const app = express();
    app.use(createRequestLogger({ ...env, NODE_ENV: 'production' }, destination));
    app.use(requestCompletionLogger);
    app.get('/health', (_request, response) => response.json({ status: 'ok' }));

    await request(app)
      .get('/health')
      .set('Authorization', 'Bearer private-token')
      .set('Cookie', 'pente_refresh=private-cookie');

    expect(entries).toHaveLength(1);
    const entry = JSON.parse(entries[0]);
    expect(entry).toMatchObject({ method: 'GET', path: '/health', statusCode: 200 });
    expect(entries[0]).not.toContain('private-token');
    expect(entries[0]).not.toContain('private-cookie');
    expect(entries[0]).not.toContain('headers');
  });
});

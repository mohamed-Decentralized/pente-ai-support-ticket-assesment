import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/error-handler';

describe('API error handling', () => {
  it('returns a safe envelope for unexpected failures', async () => {
    const app = express();
    app.get('/failure', () => {
      throw new Error('private database connection detail');
    });
    app.use(errorHandler);

    const response = await request(app).get('/failure');
    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'The service could not complete the request',
    });
    expect(response.text).not.toContain('private database connection detail');
    expect(response.text).not.toContain('stack');
  });
});

import { RequestHandler } from 'express';
import { ZodType } from 'zod';
import { AppError } from '../lib/errors';

export const validate =
  (schema: ZodType, source: 'body' | 'query' | 'params' = 'body'): RequestHandler =>
  (request, _response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      const flattened = result.error.flatten();
      const fieldErrors: Record<string, string> = {};
      for (const [key, issues] of Object.entries(flattened.fieldErrors)) {
        const issue = issues?.[0];
        if (issue) fieldErrors[key] = issue;
      }
      next(new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', { fieldErrors }));
      return;
    }
    request[source] = result.data;
    next();
  };

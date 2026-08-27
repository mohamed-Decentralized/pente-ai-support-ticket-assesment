import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found'));
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  let normalized = error;
  if (error instanceof ZodError) {
    normalized = new AppError(
      400,
      'VALIDATION_ERROR',
      'Request validation failed',
      error.flatten(),
    );
  }
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
    normalized = new AppError(409, 'CONFLICT', 'A resource with this value already exists');
  }
  const status = normalized instanceof AppError ? normalized.statusCode : 500;
  const code = normalized instanceof AppError ? normalized.code : 'INTERNAL_ERROR';
  const message =
    normalized instanceof AppError
      ? normalized.message
      : 'The service could not complete the request';
  response.locals.errorCode = code;
  if (status >= 500) {
    response.locals.errorType = error instanceof Error ? error.name : 'UnknownError';
    const errorMessage = error instanceof Error ? error.message : String(error);
    const includeStack = error instanceof Error && error.stack && !(error instanceof AppError);
    const stack = includeStack ? `\n${error.stack}` : '';
    console.error(`[GlobalErrorHandler] Unhandled error (${request.id}): ${errorMessage}${stack}`);
  }
  response.status(status).json({
    error: {
      code,
      message,
      ...(normalized instanceof AppError && normalized.details
        ? { details: normalized.details }
        : {}),
    },
    requestId: request.id,
  });
};

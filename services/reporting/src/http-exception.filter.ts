import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';

const codes: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : undefined;
    const payloadObject = typeof payload === 'object' && payload !== null ? payload : undefined;
    const rawMessage =
      payloadObject && 'message' in payloadObject ? payloadObject.message : payload;
    const issues =
      status === HttpStatus.BAD_REQUEST
        ? Array.isArray(rawMessage)
          ? rawMessage
          : typeof rawMessage === 'string'
            ? [rawMessage]
            : undefined
        : undefined;
    const message =
      status >= 500
        ? 'The reporting service could not complete the request'
        : issues
          ? 'Request validation failed'
          : typeof rawMessage === 'string'
            ? rawMessage
            : exception instanceof Error
              ? exception.message
              : 'The request could not be completed';
    const headerId = request.headers['x-request-id'];
    const requestId =
      typeof headerId === 'string' && headerId.length <= 100 ? headerId : randomUUID();

    if (status >= 500) {
      const actualMessage = exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error && exception.stack ? `\n${exception.stack}` : '';
      Logger.error(
        `Unhandled error (${requestId}): ${actualMessage}${stack}`,
        'HttpExceptionFilter',
      );
    }

    response.status(status).json({
      error: {
        code: codes[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
        message,
        ...(issues ? { details: { issues } } : {}),
      },
      requestId,
    });
  }
}

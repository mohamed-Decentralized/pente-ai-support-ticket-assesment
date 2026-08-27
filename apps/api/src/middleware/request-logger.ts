import { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { DestinationStream } from 'pino';
import pinoHttp from 'pino-http';
import { AppEnv } from '../config/env';

type LogRecord = Record<string, unknown>;

const levelNames: Record<number, string> = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL',
};

export const createDevelopmentLogDestination = (
  write: (line: string) => void = (line) => process.stdout.write(line),
): DestinationStream => ({
  write(value) {
    try {
      const record = JSON.parse(value) as LogRecord;
      const time = new Date(Number(record.time ?? Date.now())).toISOString().slice(11, 23);
      const level = (levelNames[Number(record.level)] ?? 'LOG').padEnd(5);
      const method = String(record.method ?? '').padEnd(7);
      const path = String(record.path ?? record.msg ?? '');
      const status = record.statusCode ? String(record.statusCode).padStart(3) : '---';
      const elapsed =
        typeof record.responseTimeMs === 'number'
          ? `${record.responseTimeMs.toFixed(1).padStart(7)} ms`
          : '';
      const errorCode = record.errorCode ? ` ${String(record.errorCode)}` : '';
      write(`${time} ${level} ${method} ${path} ${status} ${elapsed}${errorCode}\n`);
    } catch {
      write(value);
    }
  },
});

const silentDestination: DestinationStream = { write: () => undefined };

export const createRequestLogger = (env: AppEnv, destination?: DestinationStream) => {
  const selectedDestination =
    destination ??
    (env.NODE_ENV === 'development'
      ? createDevelopmentLogDestination()
      : env.NODE_ENV === 'test'
        ? silentDestination
        : undefined);
  const options = {
    level: env.LOG_LEVEL,
    autoLogging: false,
    quietReqLogger: true,
    genReqId: (request: { headers: Record<string, unknown> }) => {
      const supplied = request.headers['x-request-id'];
      return typeof supplied === 'string' && supplied.length <= 100 ? supplied : randomUUID();
    },
    redact: ['password', 'authorization', 'cookie', 'refreshToken'],
  };
  return selectedDestination ? pinoHttp(options, selectedDestination) : pinoHttp(options);
};

export const requestCompletionLogger: RequestHandler = (request, response, next) => {
  const startedAt = process.hrtime.bigint();
  response.once('finish', () => {
    const responseTimeMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const fields = {
      requestId: request.id,
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      responseTimeMs,
      ...(response.locals.errorCode ? { errorCode: response.locals.errorCode } : {}),
      ...(response.locals.errorType ? { errorType: response.locals.errorType } : {}),
    };
    if (response.statusCode >= 500) request.log.error(fields, 'request failed');
    else if (response.statusCode >= 400) request.log.warn(fields, 'request rejected');
    else request.log.info(fields, 'request completed');
  });
  next();
};

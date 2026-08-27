import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { AiProvider } from './ai/ai-provider';
import { createAiProvider } from './ai/provider.factory';
import { AppEnv, loadEnv } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { createRequestLogger, requestCompletionLogger } from './middleware/request-logger';
import { createAuthRouter } from './routes/auth.routes';
import { createPublicRouter } from './routes/public.routes';
import { createTicketRouter } from './routes/ticket.routes';

export const createApp = (options: { env?: AppEnv; aiProvider?: AiProvider } = {}) => {
  const env = options.env ?? loadEnv();
  const aiProvider = options.aiProvider ?? createAiProvider(env);
  const app = express();

  app.disable('x-powered-by');
  app.use(createRequestLogger(env));
  app.use(requestCompletionLogger);
  app.use(helmet());

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '64kb' }));
  app.use(cookieParser());

  app.get('/health/liveness', (_request, response) =>
    response.json({ status: 'ok', service: 'core-api' }),
  );
  app.get('/health/readiness', (_request, response) => {
    const ready = mongoose.connection.readyState === 1;
    response.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      service: 'core-api',
      database: ready ? 'connected' : 'unavailable',
    });
  });
  app.get('/health/metrics', (_request, response) => {
    const memory = process.memoryUsage();
    response.json({
      service: 'core-api',
      uptimeSeconds: process.uptime(),
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      databaseConnected: mongoose.connection.readyState === 1,
      timestamp: new Date().toISOString(),
    });
  });
  app.use('/api/v1/auth', createAuthRouter(env));
  app.use('/api/v1/public', createPublicRouter(aiProvider));
  app.use('/api/v1/tickets', createTicketRouter(env, aiProvider));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

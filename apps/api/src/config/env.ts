import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'node:path';

dotenvConfig({ path: resolve(process.cwd(), '../../.env') });
dotenvConfig();
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/pente_support'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    WEB_ORIGIN: z.string().default('http://localhost:3000'),
    JWT_ACCESS_SECRET: z.string().min(32).default('development-access-secret-change-me-now'),
    JWT_REFRESH_SECRET: z.string().min(32).default('development-refresh-secret-change-me'),
    JWT_ACCESS_EXPIRY: z.string().default('15m'),
    JWT_REFRESH_EXPIRY_DAYS: z.coerce.number().int().positive().default(7),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-3.6-flash'),
    GEMINI_BASE_URL: z.string().url().default('https://generativelanguage.googleapis.com/v1beta'),
    AI_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
    AI_PROVIDER: z.enum(['gemini', 'mock', 'disabled']).default('gemini'),
    LOG_LEVEL: z.string().default('info'),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && value.AI_PROVIDER === 'mock') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AI_PROVIDER'],
        message: 'Mock AI cannot run in production',
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export const loadEnv = (source: NodeJS.ProcessEnv = process.env): AppEnv => envSchema.parse(source);

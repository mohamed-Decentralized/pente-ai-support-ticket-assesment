import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

dotenvConfig({ path: resolve(process.cwd(), '../../.env') });
dotenvConfig();

const schema = z.object({
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/pente_support'),
  REPORTING_PORT: z.coerce.number().int().positive().default(5001),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(32).default('1234567889123141241231231212341245634523412'),
  REPORT_CACHE_TTL_MS: z.coerce.number().int().positive().default(60000),
  REPORT_AGENTS_CACHE_TTL_MS: z.coerce.number().int().positive().default(120000),
  REPORT_TRENDS_CACHE_TTL_MS: z.coerce.number().int().positive().default(300000),
  SLA_APPROACHING_MINUTES: z.coerce.number().int().positive().default(60),
  REDIS_URL: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().url().optional(),
  ),
});

export type ReportingConfig = z.infer<typeof schema>;
export const config = schema.parse(process.env);

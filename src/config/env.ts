import { config } from 'dotenv';
import { z } from 'zod';

config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  BOT_TOKEN: z.string().min(10, 'BOT_TOKEN is required'),
  BOT_MODE: z.enum(['polling', 'webhook']).default('polling'),
  WEBHOOK_URL: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),

  ADMIN_IDS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => BigInt(s)),
    ),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  FILES_DIR: z.string().default('./files'),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  SENTRY_DSN: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

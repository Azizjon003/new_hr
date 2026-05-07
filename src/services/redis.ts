import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));

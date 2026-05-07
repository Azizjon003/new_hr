import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export const prisma = new PrismaClient({
  // log: env.LOG_LEVEL === 'debug' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

import { env } from './config/env.js';
import { createBot, setBotCommands } from './bot.js';
import { logger } from './utils/logger.js';
import { ensureDirs } from './utils/files.js';
import { prisma } from './services/prisma.js';
import { redis } from './services/redis.js';
import { closeBrowser } from './services/pdf.service.js';
import { seedAdminsFromEnv } from './services/admin-seed.service.js';

async function main(): Promise<void> {
  ensureDirs();
  logger.info({ env: env.NODE_ENV, mode: env.BOT_MODE }, '🚀 Starting HR bot');

  // ENV.ADMIN_IDS dagi adminlarni DB ga seed qilish (idempotent)
  await seedAdminsFromEnv().catch((err) => logger.error({ err }, 'Admin seeding failed'));

  const bot = createBot();

  await setBotCommands(bot).catch((err) => logger.warn({ err }, 'Failed to set commands'));

  if (env.BOT_MODE === 'webhook') {
    logger.warn('Webhook mode is not implemented in this entry point yet — falling back to polling');
  }

  process.once('SIGINT', () => void shutdown(bot, 'SIGINT'));
  process.once('SIGTERM', () => void shutdown(bot, 'SIGTERM'));

  await bot.start({
    onStart: (info) => {
      logger.info({ username: info.username }, '✅ Bot started');
    },
    drop_pending_updates: true,
  });
}

async function shutdown(bot: Awaited<ReturnType<typeof createBot>>, signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down');
  try {
    await bot.stop();
  } catch (err) {
    logger.error({ err }, 'Error stopping bot');
  }
  try {
    await closeBrowser();
  } catch (err) {
    logger.error({ err }, 'Error closing browser');
  }
  try {
    await prisma.$disconnect();
  } catch (err) {
    logger.error({ err }, 'Error disconnecting Prisma');
  }
  try {
    redis.disconnect();
  } catch (err) {
    logger.error({ err }, 'Error disconnecting Redis');
  }
  process.exit(0);
}

main().catch((err) => {
  logger.fatal({ err }, '💥 Fatal error');
  process.exit(1);
});

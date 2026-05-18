import { Bot, session } from 'grammy';
import { conversations } from '@grammyjs/conversations';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { env } from './config/env.js';
import { MyContext, SessionData } from './types/context.js';
import { redis } from './services/redis.js';
import { i18n } from './middlewares/i18n.js';
import { authMiddleware } from './middlewares/auth.js';
import { logger } from './utils/logger.js';

import { startComposer } from './handlers/start.js';
import { languageComposer } from './handlers/language.js';
import { helpComposer } from './handlers/help.js';
import { profileComposer } from './handlers/profile.js';
import { applyComposer } from './handlers/application/index.js';
import { myAppsComposer } from './handlers/my-applications.js';
import { adminComposer } from './handlers/admin/index.js';

export function createBot(): Bot<MyContext> {
  const bot = new Bot<MyContext>(env.BOT_TOKEN);

  bot.use(
    session<SessionData, MyContext>({
      initial: () => ({}),
      storage: new RedisAdapter({ instance: redis, ttl: 60 * 60 * 24 * 7 }), // 7 days
    }),
  );

  bot.use(authMiddleware);
  bot.use(i18n);
  bot.use(conversations());

  // Public commands
  bot.use(startComposer);
  bot.use(languageComposer);
  bot.use(helpComposer);
  bot.use(profileComposer);
  bot.use(applyComposer);
  bot.use(myAppsComposer);

  // Admin (requires admin)
  bot.use(adminComposer);

  // Generic noop handler
  bot.callbackQuery('noop', (ctx) => ctx.answerCallbackQuery());

  bot.catch((err) => {
    const errMsg = String(err?.error?.message ?? err?.message ?? '');
    const isDbAuthError =
      errMsg.includes('Authentication failed against database') ||
      errMsg.includes('P1000') ||
      errMsg.includes("Can't reach database server");

    if (isDbAuthError) {
      logger.fatal(
        { err },
        '❌ Critical DB error — exiting so container can restart and recover',
      );
      // Container restart bilan yangi connection olishga harakat qilamiz
      setTimeout(() => process.exit(1), 1000);
      return;
    }

    logger.error({ err }, 'Bot error');
  });

  return bot;
}

export async function setBotCommands(bot: Bot<MyContext>): Promise<void> {
  await bot.api.setMyCommands(
    [
      { command: 'start', description: '🚀 Boshlash' },
      { command: 'menu', description: '🏠 Menyu' },
      { command: 'help', description: '❓ Yordam' },
      { command: 'cancel', description: '❌ Bekor qilish' },
    ],
    { language_code: 'uz' },
  );
  await bot.api.setMyCommands(
    [
      { command: 'start', description: '🚀 Запустить' },
      { command: 'menu', description: '🏠 Меню' },
      { command: 'help', description: '❓ Помощь' },
      { command: 'cancel', description: '❌ Отмена' },
    ],
    { language_code: 'ru' },
  );
}

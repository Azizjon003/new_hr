import { NextFunction } from 'grammy';
import { MyContext } from '../types/context.js';
import { prisma } from '../services/prisma.js';
import { logger } from '../utils/logger.js';

export async function authMiddleware(ctx: MyContext, next: NextFunction): Promise<void> {
  const tgUser = ctx.from;
  if (!tgUser) {
    return next();
  }

  let user = await prisma.user.findUnique({ where: { telegramId: BigInt(tgUser.id) } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId: BigInt(tgUser.id),
        username: tgUser.username,
        tgFirstName: tgUser.first_name,
        tgLastName: tgUser.last_name,
        lang: tgUser.language_code === 'ru' ? 'RU' : 'UZ',
      },
    });
    logger.info({ userId: user.id, telegramId: user.telegramId.toString() }, 'New user created');
  } else {
    // Faqat Telegram metadata yangilash (isAdmin DB ga tegmaymiz)
    const updates: Record<string, unknown> = {};
    if (user.username !== tgUser.username) updates.username = tgUser.username;
    if (user.tgFirstName !== tgUser.first_name) updates.tgFirstName = tgUser.first_name;
    if (user.tgLastName !== tgUser.last_name) updates.tgLastName = tgUser.last_name;
    if (Object.keys(updates).length > 0) {
      user = await prisma.user.update({ where: { id: user.id }, data: updates });
    }
  }

  if (user.isBlocked) {
    await ctx.reply(ctx.t('error-blocked'));
    return;
  }

  ctx.dbUser = user;
  ctx.isAdmin = user.isAdmin;

  await next();
}

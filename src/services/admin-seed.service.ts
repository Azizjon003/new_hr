import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Bot ishga tushganda ENV.ADMIN_IDS dagi telegram ID larni
 * DB ga isAdmin=true sifatida seed qiladi (idempotent).
 *
 * Bu faqat dastlabki bootstrap uchun. Asosiy admin manbai — DB.User.isAdmin.
 * ENV bo'sh bo'lsa va DB da admin yo'q bo'lsa — ogohlantirish chiqadi.
 */
export async function seedAdminsFromEnv(): Promise<void> {
  const ids = env.ADMIN_IDS;
  let seeded = 0;
  let alreadyAdmin = 0;
  let placeholders = 0;

  for (const tgId of ids) {
    const existing = await prisma.user.findUnique({ where: { telegramId: tgId } });
    if (!existing) {
      await prisma.user.create({
        data: {
          telegramId: tgId,
          isAdmin: true,
          lang: 'UZ',
        },
      });
      placeholders++;
      logger.info(
        { telegramId: tgId.toString() },
        'Created admin placeholder from ENV (will be filled on /start)',
      );
      continue;
    }
    if (!existing.isAdmin) {
      await prisma.user.update({ where: { id: existing.id }, data: { isAdmin: true } });
      seeded++;
      logger.info({ telegramId: tgId.toString() }, 'Seeded admin from ENV');
    } else {
      alreadyAdmin++;
    }
  }

  // Umumiy holatni tekshirish
  const totalAdmins = await prisma.user.count({ where: { isAdmin: true } });
  if (totalAdmins === 0) {
    logger.warn(
      "⚠️  Hech qanday admin yo'q. ADMIN_IDS ENV ni sozlang yoki DB da User.isAdmin=true qilib qo'ying.",
    );
  } else {
    logger.info(
      { totalAdmins, fromEnvSeeded: seeded, alreadyAdmin, placeholders },
      'Admin bootstrap complete',
    );
  }
}

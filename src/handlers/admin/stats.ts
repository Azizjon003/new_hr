import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../types/context.js';
import { prisma } from '../../services/prisma.js';

export const adminStatsComposer = new Composer<MyContext>();

adminStatsComposer.callbackQuery('adm:stats', async (ctx) => {
  await ctx.answerCallbackQuery();

  const [users, companies, departments, positions, applications, byStatus] = await Promise.all([
    prisma.user.count(),
    prisma.company.count({ where: { isDeleted: false } }),
    prisma.department.count({ where: { isDeleted: false } }),
    prisma.position.count({ where: { isDeleted: false } }),
    prisma.application.count({ where: { status: { not: 'DRAFT' } } }),
    prisma.application.groupBy({
      by: ['status'],
      _count: true,
      where: { status: { not: 'DRAFT' } },
    }),
  ]);

  const statusLines = byStatus.map((s) => `   • ${s.status}: ${s._count}`).join('\n');

  const text = [
    '<b>📊 Statistika</b>',
    '',
    `👥 Foydalanuvchilar: ${users}`,
    `🏢 Kompaniyalar: ${companies}`,
    `🗂 Bo‘limlar: ${departments}`,
    `💼 Lavozimlar: ${positions}`,
    `📨 Arizalar: ${applications}`,
    '',
    '<b>Status bo‘yicha:</b>',
    statusLines || '   —',
  ].join('\n');

  const kb = new InlineKeyboard().text('⬅️ Orqaga', 'adm:back');

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
});

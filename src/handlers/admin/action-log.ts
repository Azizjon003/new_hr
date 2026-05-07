import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../types/context.js';
import { prisma } from '../../services/prisma.js';

export const adminActionLogComposer = new Composer<MyContext>();

const PAGE_SIZE = 10;

function formatDateTime(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm} ${hh}:${min}`;
}

const ACTION_EMOJI: Record<string, string> = {
  CREATE: '➕',
  UPDATE: '✏️',
  DELETE: '🗑',
  RESTORE: '♻️',
  ACTIVATE: '🟢',
  DEACTIVATE: '⚪',
  ADD_ADMIN: '👤➕',
  REMOVE_ADMIN: '👤➖',
  TEMPLATE_APPLY: '📋',
  BLOCK_USER: '🚫',
  UNBLOCK_USER: '✅',
};

async function showActionLog(ctx: MyContext, page = 0): Promise<void> {
  const total = await prisma.adminLog.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);

  const logs = await prisma.adminLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: { admin: true },
    skip: safePage * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const lines = [`<b>📜 Action log</b> (${total} ta)`, ''];
  for (const l of logs) {
    const adminName = l.admin.profileFullName ?? l.admin.username ?? `id${l.admin.telegramId}`;
    const emoji = ACTION_EMOJI[l.action] ?? '•';
    let detailStr = '';
    if (l.details && typeof l.details === 'object') {
      const d = l.details as Record<string, unknown>;
      if (d.nameUz) detailStr = ` <i>${d.nameUz}</i>`;
      else if (d.titleUz) detailStr = ` <i>${d.titleUz}</i>`;
      else if (d.template) detailStr = ` <i>${d.template} (${d.count})</i>`;
      else if (d.username) detailStr = ` <i>@${d.username}</i>`;
    }
    lines.push(
      `${emoji} <code>${formatDateTime(l.createdAt)}</code> · ${adminName}\n` +
        `   ${l.action} · ${l.entity}${detailStr}`,
    );
  }

  const kb = new InlineKeyboard();
  if (totalPages > 1) {
    if (safePage > 0) kb.text('⬅️', `log:p:${safePage - 1}`);
    kb.text(`${safePage + 1}/${totalPages}`, 'noop');
    if (safePage < totalPages - 1) kb.text('➡️', `log:p:${safePage + 1}`);
    kb.row();
  }
  kb.text('⬅️ Orqaga', 'adm:back');

  const text = total === 0 ? "📜 <b>Action log</b>\n\nHali hech qanday amal yo‘q." : lines.join('\n');
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
}

adminActionLogComposer.callbackQuery('adm:log', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showActionLog(ctx, 0);
});

adminActionLogComposer.callbackQuery(/^log:p:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showActionLog(ctx, Number(ctx.match![1]));
});

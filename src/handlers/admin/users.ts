import { Composer, InlineKeyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../types/context.js';
import { prisma } from '../../services/prisma.js';
import { formatDate } from '../../utils/validators.js';
import { logger } from '../../utils/logger.js';

export const adminUsersComposer = new Composer<MyContext>();

type Convo = Conversation<MyContext>;

const PAGE_SIZE = 10;

async function showUsersList(ctx: MyContext, page = 0): Promise<void> {
  const total = await prisma.user.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    skip: safePage * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { _count: { select: { applications: true } } },
  });

  const kb = new InlineKeyboard();
  for (const u of users) {
    const flag = u.isBlocked ? '🚫' : u.isAdmin ? '👤' : '🟢';
    const name = u.profileFullName ?? u.username ?? `id${u.telegramId}`;
    kb.text(`${flag} ${name} (${u._count.applications})`, `um:show:${u.id}`).row();
  }

  if (totalPages > 1) {
    if (safePage > 0) kb.text('⬅️', `um:p:${safePage - 1}`);
    kb.text(`${safePage + 1}/${totalPages}`, 'noop');
    if (safePage < totalPages - 1) kb.text('➡️', `um:p:${safePage + 1}`);
    kb.row();
  }
  kb.text('🔍 Qidirish', 'um:search').row();
  kb.text('⬅️ Orqaga', 'adm:back');

  const text = `<b>👥 Foydalanuvchilar (${total})</b>\n\n🚫 — bloklangan, 👤 — admin, 🟢 — oddiy`;
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
}

async function showUserDetail(
  ctx: MyContext,
  userId: string,
  opts: { sendNew?: boolean } = {},
): Promise<void> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: { select: { applications: true } },
      applications: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { position: true },
      },
    },
  });
  if (!u) return;

  const lines = [
    `<b>${u.isBlocked ? '🚫' : u.isAdmin ? '👤' : '🟢'} Foydalanuvchi</b>`,
    '',
    `Ism: ${u.profileFullName ?? '—'}`,
    `Telefon: ${u.profilePhone ?? '—'}`,
    `Email: ${u.profileEmail ?? '—'}`,
    `Tug‘ilgan: ${u.profileBirthDate ? formatDate(u.profileBirthDate) : '—'}`,
    `Shahar: ${u.profileCity ?? '—'}`,
    `Username: ${u.username ? '@' + u.username : '—'}`,
    `Telegram ID: <code>${u.telegramId}</code>`,
    `Til: ${u.lang}`,
    `Rozilik: ${u.consentGivenAt ? '✅' : '❌'}`,
    `Status: ${u.isBlocked ? '🚫 Bloklangan' : u.isAdmin ? '👤 Admin' : '🟢 Faol'}`,
    `Ro‘yxatdan o‘tgan: ${formatDate(u.createdAt)}`,
    '',
    `📨 Arizalar: ${u._count.applications}`,
  ];

  if (u.applications.length > 0) {
    lines.push('Oxirgi arizalar:');
    for (const a of u.applications) {
      lines.push(`   • <code>${a.refCode}</code> — ${a.position.titleUz} (${a.status})`);
    }
  }

  const kb = new InlineKeyboard()
    .text(u.isBlocked ? '✅ Blokdan chiqarish' : '🚫 Bloklash', `um:block:${u.id}`)
    .row()
    .text('💬 Xabar yuborish', `um:msg:${u.id}`)
    .row()
    .text('⬅️ Orqaga', 'adm:users');

  if (opts.sendNew) {
    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', reply_markup: kb });
    return;
  }
  try {
    await ctx.editMessageText(lines.join('\n'), { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', reply_markup: kb });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Conversations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function searchUserConvo(conversation: Convo, ctx: MyContext): Promise<void> {
  await ctx.reply(
    "🔍 Qidirish:\n\n• Telegram ID (raqam)\n• @username\n• Ism (FIO ning bir qismi)",
  );
  const raw = (await conversation.waitFor('message:text')).message.text.trim();

  const found = await conversation.external(async () => {
    if (/^\d+$/.test(raw)) {
      const u = await prisma.user.findUnique({ where: { telegramId: BigInt(raw) } });
      return u ? [u] : [];
    }
    const name = raw.replace(/^@/, '');
    return prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: name, mode: 'insensitive' } },
          { profileFullName: { contains: name, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
  });

  if (found.length === 0) {
    await ctx.reply('❌ Hech kim topilmadi.');
    return;
  }

  const kb = new InlineKeyboard();
  for (const u of found) {
    const name = u.profileFullName ?? u.username ?? `id${u.telegramId}`;
    kb.text(name, `um:show:${u.id}`).row();
  }
  await ctx.reply(`Topildi: ${found.length} ta`, { reply_markup: kb });
}

adminUsersComposer.use(createConversation(searchUserConvo, 'admin-search-user'));

async function sendMessageConvo(conversation: Convo, ctx: MyContext): Promise<void> {
  const userId = ctx.session.admin?.selectedUserId;
  if (!userId) return;

  await ctx.reply('💬 Yuborilishi kerak bo‘lgan xabar matnini yuboring:');
  const text = (await conversation.waitFor('message:text')).message.text.trim();

  const target = await conversation.external(() =>
    prisma.user.findUnique({ where: { id: userId } }),
  );
  if (!target) {
    await ctx.reply('❌ Foydalanuvchi topilmadi.');
    return;
  }

  try {
    await ctx.api.sendMessage(Number(target.telegramId), `💬 <b>Admin xabari:</b>\n\n${text}`, {
      parse_mode: 'HTML',
    });
    await ctx.reply('✅ Xabar yuborildi.');
  } catch (err) {
    logger.error({ err }, 'Failed to send admin message to user');
    await ctx.reply('❌ Xabar yuborib bo‘lmadi (foydalanuvchi botni bloklagan bo‘lishi mumkin).');
  }
  await conversation.external(() => showUserDetail(ctx, userId, { sendNew: true }));
}

adminUsersComposer.use(createConversation(sendMessageConvo, 'admin-msg-user'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Callbacks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

adminUsersComposer.callbackQuery('adm:users', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showUsersList(ctx, 0);
});

adminUsersComposer.callbackQuery(/^um:p:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showUsersList(ctx, Number(ctx.match![1]));
});

adminUsersComposer.callbackQuery(/^um:show:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showUserDetail(ctx, ctx.match![1]);
});

adminUsersComposer.callbackQuery('um:search', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('admin-search-user');
});

adminUsersComposer.callbackQuery(/^um:block:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return;
  if (u.isAdmin) {
    await ctx.answerCallbackQuery({ text: '⚠️ Adminni bloklab bo‘lmaydi', show_alert: true });
    return;
  }
  await prisma.user.update({ where: { id }, data: { isBlocked: !u.isBlocked } });
  await prisma.adminLog.create({
    data: {
      adminId: ctx.dbUser!.id,
      action: u.isBlocked ? 'UNBLOCK_USER' : 'BLOCK_USER',
      entity: 'User',
      entityId: id,
      details: { telegramId: u.telegramId.toString() },
    },
  });
  await ctx.answerCallbackQuery({ text: u.isBlocked ? '✅ Blokdan chiqarildi' : '🚫 Bloklandi' });
  await showUserDetail(ctx, id);
});

adminUsersComposer.callbackQuery(/^um:msg:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.admin = { ...ctx.session.admin, selectedUserId: ctx.match![1] };
  await ctx.conversation.enter('admin-msg-user');
});

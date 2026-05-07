import { Composer, InlineKeyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../types/context.js';
import { prisma } from '../../services/prisma.js';

export const adminAdminsComposer = new Composer<MyContext>();

type Convo = Conversation<MyContext>;

async function showAdminsList(
  ctx: MyContext,
  opts: { sendNew?: boolean } = {},
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { isAdmin: true },
    orderBy: { createdAt: 'asc' },
  });

  const lines = ['<b>👤 Adminlar</b>', ''];
  const kb = new InlineKeyboard();
  for (const a of admins) {
    const isMe = ctx.dbUser?.id === a.id ? '🟢' : '👤';
    const name = a.profileFullName ?? a.username ?? `id${a.telegramId}`;
    kb.text(`${isMe} ${name}`, `am:show:${a.id}`).row();
  }
  lines.push(`Jami: ${admins.length}`);
  lines.push('');
  lines.push("🟢 — Siz  •  👤 — Boshqa adminlar");

  kb.text("➕ Yangi admin qo'shish", 'am:new').row();
  kb.text('⬅️ Orqaga', 'adm:back');

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

async function showAdminDetail(ctx: MyContext, userId: string): Promise<void> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return;
  const isMe = ctx.dbUser?.id === u.id;
  const lines = [
    `<b>${isMe ? '🟢' : '👤'} Admin</b>`,
    '',
    `Ism: ${u.profileFullName ?? '—'}`,
    `Username: ${u.username ? '@' + u.username : '—'}`,
    `Telegram ID: <code>${u.telegramId}</code>`,
    `Til: ${u.lang}`,
    `Status: ${u.isAdmin ? '✅ Admin' : '⚪ Oddiy'}`,
    isMe ? '\n⚠️ Bu — siz. O‘zingizni adminlikdan olib tashlay olmaysiz.' : '',
  ]
    .filter(Boolean)
    .join('\n');

  const kb = new InlineKeyboard();
  if (!isMe) {
    kb.text('❌ Adminlikdan olib tashlash', `am:remove:${u.id}`).row();
  }
  kb.text('⬅️ Orqaga', 'adm:admins');

  try {
    await ctx.editMessageText(lines, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(lines, { parse_mode: 'HTML', reply_markup: kb });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Yangi admin qo'shish
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function addAdminConvo(conversation: Convo, ctx: MyContext): Promise<void> {
  await ctx.reply(
    'Yangi adminni qanday topamiz?\n\n' +
      '• Telegram ID (raqam) yuboring\n' +
      "• Yoki @username (foydalanuvchi botda /start qilgan bo'lishi shart)",
  );
  const raw = (await conversation.waitFor('message:text')).message.text.trim();

  let user = await conversation.external(async () => {
    if (/^\d+$/.test(raw)) {
      return prisma.user.findUnique({ where: { telegramId: BigInt(raw) } });
    }
    const name = raw.replace(/^@/, '');
    return prisma.user.findFirst({ where: { username: name } });
  });

  if (!user) {
    await ctx.reply(
      "❌ Bu foydalanuvchi topilmadi.\n\nFoydalanuvchi avval botga /start qilgan bo'lishi shart.",
    );
    return;
  }

  if (user.isAdmin) {
    await ctx.reply('⚠️ Bu foydalanuvchi allaqachon admin.');
    return;
  }

  user = await conversation.external(() =>
    prisma.user.update({ where: { id: user!.id }, data: { isAdmin: true } }),
  );

  await conversation.external(() =>
    prisma.adminLog.create({
      data: {
        adminId: ctx.dbUser!.id,
        action: 'ADD_ADMIN',
        entity: 'User',
        entityId: user!.id,
        details: { telegramId: user!.telegramId.toString(), username: user!.username },
      },
    }),
  );

  const name = user.profileFullName ?? user.username ?? `id${user.telegramId}`;
  await ctx.reply(`✅ ${name} admin qilindi.`);
  await conversation.external(() => showAdminsList(ctx, { sendNew: true }));
}

adminAdminsComposer.use(createConversation(addAdminConvo, 'admin-add-admin'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Callbacks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

adminAdminsComposer.callbackQuery('adm:admins', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showAdminsList(ctx);
});

adminAdminsComposer.callbackQuery(/^am:show:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showAdminDetail(ctx, ctx.match![1]);
});

adminAdminsComposer.callbackQuery('am:new', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('admin-add-admin');
});

adminAdminsComposer.callbackQuery(/^am:remove:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) {
    await ctx.answerCallbackQuery({ text: 'Topilmadi' });
    return;
  }
  // Xavfsizlik: o'zini o'zi olib tashlay olmaydi
  if (ctx.dbUser?.id === u.id) {
    await ctx.answerCallbackQuery({
      text: "⚠️ O'zingizni adminlikdan olib tashlay olmaysiz",
      show_alert: true,
    });
    return;
  }
  // Xavfsizlik: oxirgi adminni olib tashlamaslik
  const totalAdmins = await prisma.user.count({ where: { isAdmin: true } });
  if (totalAdmins <= 1) {
    await ctx.answerCallbackQuery({
      text: "⚠️ Oxirgi adminni olib tashlab bo'lmaydi",
      show_alert: true,
    });
    return;
  }

  await prisma.user.update({ where: { id }, data: { isAdmin: false } });
  await prisma.adminLog.create({
    data: {
      adminId: ctx.dbUser!.id,
      action: 'REMOVE_ADMIN',
      entity: 'User',
      entityId: id,
      details: { telegramId: u.telegramId.toString() },
    },
  });
  await ctx.answerCallbackQuery({ text: '✅ Olib tashlandi' });
  await showAdminsList(ctx);
});

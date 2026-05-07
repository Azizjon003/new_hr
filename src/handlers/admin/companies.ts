import { Composer, InlineKeyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../types/context.js';
import { prisma } from '../../services/prisma.js';

export const adminCompaniesComposer = new Composer<MyContext>();

type Convo = Conversation<MyContext>;

async function createCompanyConvo(conversation: Convo, ctx: MyContext): Promise<void> {
  await ctx.reply('🏢 Kompaniya nomi (o‘zbekcha):');
  const nameUz = (await conversation.waitFor('message:text')).message.text.trim();

  await ctx.reply('🏢 Kompaniya nomi (русский):');
  const nameRu = (await conversation.waitFor('message:text')).message.text.trim();

  await ctx.reply('📝 Tavsif (o‘zbekcha) yoki "-" o‘tkazib yuborish:');
  const descUzRaw = (await conversation.waitFor('message:text')).message.text.trim();
  const descUz = descUzRaw === '-' ? null : descUzRaw;

  await ctx.reply('📝 Tavsif (русский) yoki "-":');
  const descRuRaw = (await conversation.waitFor('message:text')).message.text.trim();
  const descRu = descRuRaw === '-' ? null : descRuRaw;

  await ctx.reply(
    '📺 Kanal ID (masalan: <code>-1001234567890</code>) — bot kanalga admin bo‘lishi shart.\n\nYoki "-" — keyin sozlash:',
    { parse_mode: 'HTML' },
  );
  const chRaw = (await conversation.waitFor('message:text')).message.text.trim();
  const channelId = chRaw === '-' ? null : chRaw;

  const company = await conversation.external(() =>
    prisma.company.create({
      data: { nameUz, nameRu, descriptionUz: descUz, descriptionRu: descRu, channelId },
    }),
  );

  await conversation.external(() =>
    prisma.adminLog.create({
      data: {
        adminId: ctx.dbUser!.id,
        action: 'CREATE',
        entity: 'Company',
        entityId: company.id,
        details: { nameUz, nameRu },
      },
    }),
  );

  await ctx.reply(`✅ Kompaniya yaratildi: <b>${nameUz}</b>`, { parse_mode: 'HTML' });
  await conversation.external(() => showCompanies(ctx, { sendNew: true }));
}

adminCompaniesComposer.use(createConversation(createCompanyConvo, 'admin-create-company'));

async function showCompanies(ctx: MyContext, opts: { sendNew?: boolean } = {}): Promise<void> {
  const companies = await prisma.company.findMany({
    where: { isDeleted: false },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  const kb = new InlineKeyboard();
  for (const c of companies) {
    const status = c.isActive ? '🟢' : '⚪';
    kb.text(`${status} ${c.nameUz}`, `cm:show:${c.id}`).row();
  }
  kb.text('➕ Yangi kompaniya', 'cm:new').row();
  kb.text('⬅️ Orqaga', 'adm:back');

  const text = companies.length === 0
    ? 'Hech qanday kompaniya yo‘q. Yangisini qo‘shing.'
    : `<b>🏢 Kompaniyalar (${companies.length}):</b>`;

  if (opts.sendNew) {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
    return;
  }
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
}

adminCompaniesComposer.callbackQuery('adm:companies', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showCompanies(ctx);
});

adminCompaniesComposer.callbackQuery('cm:new', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('admin-create-company');
});

adminCompaniesComposer.callbackQuery(/^cm:show:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showCompanyDetail(ctx, ctx.match![1]);
});

adminCompaniesComposer.callbackQuery(/^cm:toggle:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const c = await prisma.company.findUnique({ where: { id } });
  if (!c) {
    await ctx.answerCallbackQuery({ text: 'Topilmadi' });
    return;
  }
  await prisma.company.update({ where: { id }, data: { isActive: !c.isActive } });
  await prisma.adminLog.create({
    data: {
      adminId: ctx.dbUser!.id,
      action: c.isActive ? 'DEACTIVATE' : 'ACTIVATE',
      entity: 'Company',
      entityId: id,
    },
  });
  await ctx.answerCallbackQuery({ text: '✅' });
  await showCompanies(ctx);
});

adminCompaniesComposer.callbackQuery(/^cm:del:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  await prisma.company.update({ where: { id }, data: { isDeleted: true, isActive: false } });
  await prisma.adminLog.create({
    data: { adminId: ctx.dbUser!.id, action: 'DELETE', entity: 'Company', entityId: id },
  });
  await ctx.answerCallbackQuery({ text: '🗑 O‘chirildi' });
  await showCompanies(ctx);
});

async function setChannelConvo(conversation: Convo, ctx: MyContext): Promise<void> {
  const id = ctx.session.admin?.selectedCompanyId;
  if (!id) return;
  await ctx.reply('Yangi kanal ID kiriting (yoki "-" — bo‘shatish):');
  const m = (await conversation.waitFor('message:text')).message.text.trim();
  const channelId = m === '-' ? null : m;
  await conversation.external(() =>
    prisma.company.update({ where: { id }, data: { channelId } }),
  );
  await ctx.reply('✅ Kanal yangilandi.');
  await conversation.external(() => showCompanyDetail(ctx, id, { sendNew: true }));
}

// Helper — companies callback handler bilan bir xil ekran
async function showCompanyDetail(ctx: MyContext, id: string, opts: { sendNew?: boolean } = {}): Promise<void> {
  const c = await prisma.company.findUnique({
    where: { id },
    include: { _count: { select: { departments: true } } },
  });
  if (!c) return;

  const appsCount = await prisma.application.count({
    where: {
      status: { not: 'DRAFT' },
      position: { department: { companyId: id } },
    },
  });

  const text = [
    `<b>🏢 ${c.nameUz}</b> / ${c.nameRu}`,
    '',
    c.descriptionUz ? `📝 ${c.descriptionUz}` : '',
    c.channelId ? `📺 Kanal: <code>${c.channelId}</code>` : '⚠️ Kanal sozlanmagan',
    `🗂 Bo‘limlar: ${c._count.departments}`,
    `📨 Arizalar: ${appsCount}`,
    `Status: ${c.isActive ? '🟢 Faol' : '⚪ Faolsiz'}`,
    `ID: <code>${c.id}</code>`,
  ]
    .filter(Boolean)
    .join('\n');

  const kb = new InlineKeyboard()
    .text(`🗂 Bo‘limlar (${c._count.departments})`, `dm:list:${c.id}`)
    .row()
    .text(`📨 Arizalar (${appsCount})`, `aps:open:c:${c.id}`)
    .row()
    .text(c.isActive ? '⚪ Faolsizlantirish' : '🟢 Faollashtirish', `cm:toggle:${c.id}`)
    .row()
    .text('📺 Kanal o‘zgartirish', `cm:chset:${c.id}`)
    .row()
    .text('🗑 O‘chirish', `cm:del:${c.id}`)
    .row()
    .text('⬅️ Orqaga', 'adm:companies');

  if (opts.sendNew) {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
    return;
  }
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
}

adminCompaniesComposer.use(createConversation(setChannelConvo, 'admin-set-channel'));

adminCompaniesComposer.callbackQuery(/^cm:chset:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.admin = { ...ctx.session.admin, selectedCompanyId: ctx.match![1] };
  await ctx.conversation.enter('admin-set-channel');
});


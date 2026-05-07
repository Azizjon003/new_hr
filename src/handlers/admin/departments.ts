import { Composer, InlineKeyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { Conversation } from '@grammyjs/conversations';
import { MyContext } from '../../types/context.js';
import { prisma } from '../../services/prisma.js';

export const adminDepartmentsComposer = new Composer<MyContext>();

type Convo = Conversation<MyContext>;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Conversation: yangi bo'lim yaratish
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function createDepartmentConvo(conversation: Convo, ctx: MyContext): Promise<void> {
  const companyId = ctx.session.admin?.selectedCompanyId;
  if (!companyId) {
    await ctx.reply('⚠️ Avval kompaniya tanlang');
    return;
  }

  await ctx.reply("🗂 Bo'lim nomi (o'zbekcha):");
  const nameUz = (await conversation.waitFor('message:text')).message.text.trim();

  await ctx.reply('🗂 Название отдела (русский):');
  const nameRu = (await conversation.waitFor('message:text')).message.text.trim();

  const dept = await conversation.external(() =>
    prisma.department.create({
      data: { companyId, nameUz, nameRu, isActive: true },
    }),
  );

  await conversation.external(() =>
    prisma.adminLog.create({
      data: {
        adminId: ctx.dbUser!.id,
        action: 'CREATE',
        entity: 'Department',
        entityId: dept.id,
        details: { nameUz, nameRu, companyId },
      },
    }),
  );

  await ctx.reply(`✅ Bo'lim yaratildi: <b>${nameUz}</b>`, { parse_mode: 'HTML' });
  await conversation.external(() => showDepartmentList(ctx, companyId, { sendNew: true }));
}

adminDepartmentsComposer.use(createConversation(createDepartmentConvo, 'admin-create-dept'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ekranlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function showDepartmentList(
  ctx: MyContext,
  companyId: string,
  opts: { sendNew?: boolean } = {},
): Promise<void> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    await ctx.reply('Kompaniya topilmadi');
    return;
  }

  const departments = await prisma.department.findMany({
    where: { companyId, isDeleted: false },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { positions: true } } },
  });

  const kb = new InlineKeyboard();
  for (const d of departments) {
    const status = d.isActive ? '🟢' : '⚪';
    kb.text(`${status} ${d.nameUz} (${d._count.positions})`, `dm:show:${d.id}`).row();
  }
  kb.text("➕ Yangi bo'lim", `dm:new:${companyId}`).row();
  kb.text('⬅️ Kompaniyaga qaytish', `cm:show:${companyId}`);

  const text =
    departments.length === 0
      ? `🏢 <b>${company.nameUz}</b>\n\nHech qanday bo'lim yo'q. Yangisini qo'shing.`
      : `🏢 <b>${company.nameUz}</b>\n\n🗂 Bo'limlar (${departments.length}):`;

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

async function showDepartmentDetail(
  ctx: MyContext,
  deptId: string,
  opts: { sendNew?: boolean } = {},
): Promise<void> {
  const dept = await prisma.department.findUnique({
    where: { id: deptId },
    include: {
      company: true,
      _count: { select: { positions: { where: { isDeleted: false } } } },
    },
  });
  if (!dept) {
    await ctx.reply('Topilmadi');
    return;
  }

  const appsCount = await prisma.application.count({
    where: {
      status: { not: 'DRAFT' },
      position: { departmentId: deptId },
    },
  });

  const text = [
    `🗂 <b>${dept.nameUz}</b> / ${dept.nameRu}`,
    '',
    `🏢 ${dept.company.nameUz}`,
    `💼 Lavozimlar: ${dept._count.positions}`,
    `📨 Arizalar: ${appsCount}`,
    `Status: ${dept.isActive ? '🟢 Faol' : '⚪ Faolsiz'}`,
    `ID: <code>${dept.id}</code>`,
  ].join('\n');

  const kb = new InlineKeyboard()
    .text('💼 Lavozimlar', `pm:list:${dept.id}`)
    .row()
    .text(`📨 Arizalar (${appsCount})`, `aps:open:d:${dept.id}`)
    .row()
    .text(dept.isActive ? '⚪ Faolsizlantirish' : '🟢 Faollashtirish', `dm:toggle:${dept.id}`)
    .row()
    .text("✏️ Nomni o'zgartirish", `dm:rename:${dept.id}`)
    .row()
    .text("🗑 O'chirish", `dm:del:${dept.id}`)
    .row()
    .text('⬅️ Orqaga', `dm:list:${dept.companyId}`);

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Callback handlerlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

adminDepartmentsComposer.callbackQuery(/^dm:list:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showDepartmentList(ctx, ctx.match![1]);
});

adminDepartmentsComposer.callbackQuery(/^dm:show:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showDepartmentDetail(ctx, ctx.match![1]);
});

adminDepartmentsComposer.callbackQuery(/^dm:new:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.admin = { ...ctx.session.admin, selectedCompanyId: ctx.match![1] };
  await ctx.conversation.enter('admin-create-dept');
});

adminDepartmentsComposer.callbackQuery(/^dm:toggle:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const d = await prisma.department.findUnique({ where: { id } });
  if (!d) {
    await ctx.answerCallbackQuery({ text: 'Topilmadi' });
    return;
  }
  await prisma.department.update({ where: { id }, data: { isActive: !d.isActive } });
  await prisma.adminLog.create({
    data: {
      adminId: ctx.dbUser!.id,
      action: d.isActive ? 'DEACTIVATE' : 'ACTIVATE',
      entity: 'Department',
      entityId: id,
    },
  });
  await ctx.answerCallbackQuery({ text: '✅' });
  await showDepartmentDetail(ctx, id);
});

adminDepartmentsComposer.callbackQuery(/^dm:del:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const d = await prisma.department.findUnique({ where: { id } });
  if (!d) {
    await ctx.answerCallbackQuery({ text: 'Topilmadi' });
    return;
  }
  await prisma.department.update({ where: { id }, data: { isDeleted: true, isActive: false } });
  await prisma.adminLog.create({
    data: { adminId: ctx.dbUser!.id, action: 'DELETE', entity: 'Department', entityId: id },
  });
  await ctx.answerCallbackQuery({ text: "🗑 O'chirildi" });
  await showDepartmentList(ctx, d.companyId);
});

// Rename conversation
async function renameDeptConvo(conversation: Convo, ctx: MyContext): Promise<void> {
  const id = ctx.session.admin?.selectedDepartmentId;
  if (!id) return;

  await ctx.reply("Yangi nomi (o'zbekcha):");
  const nameUz = (await conversation.waitFor('message:text')).message.text.trim();

  await ctx.reply('Новое название (русский):');
  const nameRu = (await conversation.waitFor('message:text')).message.text.trim();

  await conversation.external(() =>
    prisma.department.update({ where: { id }, data: { nameUz, nameRu } }),
  );
  await ctx.reply(`✅ Yangilandi`);
  await conversation.external(() => showDepartmentDetail(ctx, id, { sendNew: true }));
}
adminDepartmentsComposer.use(createConversation(renameDeptConvo, 'admin-rename-dept'));

adminDepartmentsComposer.callbackQuery(/^dm:rename:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.admin = { ...ctx.session.admin, selectedDepartmentId: ctx.match![1] };
  await ctx.conversation.enter('admin-rename-dept');
});

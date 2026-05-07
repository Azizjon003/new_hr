import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../types/context.js';
import { prisma } from '../../services/prisma.js';

export const adminTrashComposer = new Composer<MyContext>();

type TrashKind = 'co' | 'de' | 'po';

async function showTrashRoot(ctx: MyContext): Promise<void> {
  const [co, de, po] = await Promise.all([
    prisma.company.count({ where: { isDeleted: true } }),
    prisma.department.count({ where: { isDeleted: true } }),
    prisma.position.count({ where: { isDeleted: true } }),
  ]);

  const kb = new InlineKeyboard()
    .text(`🏢 Kompaniyalar (${co})`, 'tr:list:co')
    .row()
    .text(`🗂 Bo'limlar (${de})`, 'tr:list:de')
    .row()
    .text(`💼 Lavozimlar (${po})`, 'tr:list:po')
    .row()
    .text('⬅️ Orqaga', 'adm:back');

  const text = '<b>🗑 O‘chirilganlar</b>\n\nQaysi kategoriyani ochasiz?';
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
}

async function showTrashList(ctx: MyContext, kind: TrashKind): Promise<void> {
  const kb = new InlineKeyboard();
  let title = '';
  let items: Array<{ id: string; name: string }> = [];

  if (kind === 'co') {
    const list = await prisma.company.findMany({
      where: { isDeleted: true },
      orderBy: { updatedAt: 'desc' },
    });
    items = list.map((c) => ({ id: c.id, name: c.nameUz }));
    title = '🏢 O‘chirilgan kompaniyalar';
  } else if (kind === 'de') {
    const list = await prisma.department.findMany({
      where: { isDeleted: true },
      include: { company: true },
      orderBy: { updatedAt: 'desc' },
    });
    items = list.map((d) => ({ id: d.id, name: `${d.nameUz} (${d.company.nameUz})` }));
    title = '🗂 O‘chirilgan bo‘limlar';
  } else {
    const list = await prisma.position.findMany({
      where: { isDeleted: true },
      include: { department: { include: { company: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    items = list.map((p) => ({
      id: p.id,
      name: `${p.titleUz} (${p.department.company.nameUz} → ${p.department.nameUz})`,
    }));
    title = '💼 O‘chirilgan lavozimlar';
  }

  for (const item of items) {
    kb.text(item.name, `tr:show:${kind}:${item.id}`).row();
  }
  kb.text('⬅️ Orqaga', 'adm:trash');

  const text = items.length === 0 ? `${title}\n\nBo‘sh.` : `<b>${title}</b> (${items.length}):`;
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
}

async function showTrashItem(ctx: MyContext, kind: TrashKind, id: string): Promise<void> {
  let text = '';
  if (kind === 'co') {
    const c = await prisma.company.findUnique({ where: { id } });
    if (!c) return;
    text = `🏢 <b>${c.nameUz}</b> / ${c.nameRu}\n\n${c.descriptionUz ?? ''}\n\nID: <code>${c.id}</code>`;
  } else if (kind === 'de') {
    const d = await prisma.department.findUnique({ where: { id }, include: { company: true } });
    if (!d) return;
    text = `🗂 <b>${d.nameUz}</b> / ${d.nameRu}\n🏢 ${d.company.nameUz}\n\nID: <code>${d.id}</code>`;
  } else {
    const p = await prisma.position.findUnique({
      where: { id },
      include: { department: { include: { company: true } } },
    });
    if (!p) return;
    text = `💼 <b>${p.titleUz}</b>\n🏢 ${p.department.company.nameUz} → ${p.department.nameUz}\n\nID: <code>${p.id}</code>`;
  }

  const kb = new InlineKeyboard()
    .text('♻️ Tiklash', `tr:rest:${kind}:${id}`)
    .row()
    .text('⬅️ Orqaga', `tr:list:${kind}`);

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
}

async function restoreItem(kind: TrashKind, id: string, adminId: string): Promise<void> {
  if (kind === 'co') {
    await prisma.company.update({ where: { id }, data: { isDeleted: false, isActive: true } });
  } else if (kind === 'de') {
    await prisma.department.update({ where: { id }, data: { isDeleted: false, isActive: true } });
  } else {
    await prisma.position.update({ where: { id }, data: { isDeleted: false, isActive: true } });
  }
  const entity = kind === 'co' ? 'Company' : kind === 'de' ? 'Department' : 'Position';
  await prisma.adminLog.create({
    data: { adminId, action: 'RESTORE', entity, entityId: id },
  });
}

// Callbacks
adminTrashComposer.callbackQuery('adm:trash', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showTrashRoot(ctx);
});

adminTrashComposer.callbackQuery(/^tr:list:(co|de|po)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showTrashList(ctx, ctx.match![1] as TrashKind);
});

adminTrashComposer.callbackQuery(/^tr:show:(co|de|po):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showTrashItem(ctx, ctx.match![1] as TrashKind, ctx.match![2]);
});

adminTrashComposer.callbackQuery(/^tr:rest:(co|de|po):(.+)$/, async (ctx) => {
  const kind = ctx.match![1] as TrashKind;
  const id = ctx.match![2];
  await restoreItem(kind, id, ctx.dbUser!.id);
  await ctx.answerCallbackQuery({ text: '♻️ Tiklandi' });
  await showTrashList(ctx, kind);
});

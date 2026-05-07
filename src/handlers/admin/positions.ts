import { Composer, InlineKeyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { Conversation } from '@grammyjs/conversations';
import { EmploymentType, ExperienceLevel } from '@prisma/client';
import { MyContext } from '../../types/context.js';
import { prisma } from '../../services/prisma.js';

export const adminPositionsComposer = new Composer<MyContext>();

type Convo = Conversation<MyContext>;

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "To'liq stavka",
  PART_TIME: 'Yarim stavka',
  CONTRACT: 'Shartnoma',
  INTERNSHIP: 'Amaliyot',
  REMOTE: 'Masofadan',
  HYBRID: 'Gibrid',
};

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  NO_EXPERIENCE: 'Tajribasiz',
  JUNIOR: 'Junior',
  MIDDLE: 'Middle',
  SENIOR: 'Senior',
  LEAD: 'Lead/Manager',
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Yangi lavozim yaratish — sodda conversation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function createPositionConvo(conversation: Convo, ctx: MyContext): Promise<void> {
  const departmentId = ctx.session.admin?.selectedDepartmentId;
  if (!departmentId) {
    await ctx.reply("⚠️ Avval bo'lim tanlang");
    return;
  }

  await ctx.reply("💼 Lavozim nomi (o'zbekcha):");
  const titleUz = (await conversation.waitFor('message:text')).message.text.trim();

  await ctx.reply('💼 Название должности (русский):');
  const titleRu = (await conversation.waitFor('message:text')).message.text.trim();

  await ctx.reply("📝 Tavsif (o'zbekcha) yoki '-':");
  const dUzRaw = (await conversation.waitFor('message:text')).message.text.trim();
  const descriptionUz = dUzRaw === '-' ? null : dUzRaw;

  await ctx.reply("📝 Описание (русский) yoki '-':");
  const dRuRaw = (await conversation.waitFor('message:text')).message.text.trim();
  const descriptionRu = dRuRaw === '-' ? null : dRuRaw;

  const pos = await conversation.external(() =>
    prisma.position.create({
      data: {
        departmentId,
        titleUz,
        titleRu,
        descriptionUz,
        descriptionRu,
        salaryNegotiable: true,
        currency: 'UZS',
        employmentType: EmploymentType.FULL_TIME,
        experienceLevel: ExperienceLevel.NO_EXPERIENCE,
        isActive: true,
      },
    }),
  );

  await conversation.external(() =>
    prisma.adminLog.create({
      data: {
        adminId: ctx.dbUser!.id,
        action: 'CREATE',
        entity: 'Position',
        entityId: pos.id,
        details: { titleUz, titleRu, departmentId },
      },
    }),
  );

  await ctx.reply(
    `✅ Lavozim yaratildi: <b>${titleUz}</b>\n\nQolgan parametrlarni (maosh, ish turi va h.k.) lavozim sahifasida sozlashingiz mumkin.`,
    { parse_mode: 'HTML' },
  );
  await conversation.external(() => showPositionDetail(ctx, pos.id, { sendNew: true }));
}

adminPositionsComposer.use(createConversation(createPositionConvo, 'admin-create-pos'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Maydonlarni tahrirlash uchun mini-conversationlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function editPosTextConvo(conversation: Convo, ctx: MyContext): Promise<void> {
  const id = ctx.session.admin?.selectedPositionId;
  const field = ctx.session.admin?.editField;
  if (!id || !field) return;

  const labels: Record<string, string> = {
    titleUz: "Yangi nomi (o'zbekcha):",
    titleRu: 'Новое название (русский):',
    descriptionUz: "Yangi tavsif (o'zbekcha) yoki '-' tozalash:",
    descriptionRu: "Новое описание (русский) или '-' очистить:",
    location: "Joylashuv (masalan: Toshkent) yoki '-':",
    salaryFrom: "Minimal maosh (so'm) yoki '-':",
    salaryTo: "Maksimal maosh (so'm) yoki '-':",
  };

  await ctx.reply(labels[field] ?? `Yangi qiymat:`);
  const raw = (await conversation.waitFor('message:text')).message.text.trim();
  const value = raw === '-' ? null : raw;

  const data: Record<string, unknown> = {};
  if (field === 'salaryFrom' || field === 'salaryTo') {
    if (value === null) {
      data[field] = null;
    } else {
      const n = Number(value.replace(/\s/g, ''));
      if (Number.isNaN(n) || n < 0) {
        await ctx.reply('⚠️ Noto‘g‘ri son');
        return;
      }
      data[field] = Math.round(n);
    }
  } else {
    data[field] = value;
  }

  await conversation.external(() =>
    prisma.position.update({ where: { id }, data }),
  );
  await ctx.reply('✅ Yangilandi');
  await conversation.external(() => showPositionDetail(ctx, id, { sendNew: true }));
}

adminPositionsComposer.use(createConversation(editPosTextConvo, 'admin-edit-pos-text'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ekranlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function showPositionList(
  ctx: MyContext,
  departmentId: string,
  opts: { sendNew?: boolean } = {},
): Promise<void> {
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    include: { company: true },
  });
  if (!dept) {
    await ctx.reply('Topilmadi');
    return;
  }

  const positions = await prisma.position.findMany({
    where: { departmentId, isDeleted: false },
    orderBy: [{ isFeatured: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { questions: true, applications: true } } },
  });

  const kb = new InlineKeyboard();
  for (const p of positions) {
    const status = p.isActive ? '🟢' : '⚪';
    const star = p.isFeatured ? '⭐' : '';
    kb.text(
      `${status}${star} ${p.titleUz} (❓${p._count.questions} 📨${p._count.applications})`,
      `pm:show:${p.id}`,
    ).row();
  }
  kb.text('➕ Yangi lavozim', `pm:new:${departmentId}`).row();
  kb.text('⬅️ Orqaga', `dm:show:${departmentId}`);

  const text = `🏢 ${dept.company.nameUz} → 🗂 <b>${dept.nameUz}</b>\n\n💼 Lavozimlar (${positions.length}):`;

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

function formatSalaryAdmin(p: {
  salaryFrom: number | null;
  salaryTo: number | null;
  currency: string;
  salaryNegotiable: boolean;
}): string {
  if (p.salaryNegotiable) return 'Kelishilgan';
  if (p.salaryFrom && p.salaryTo) return `${p.salaryFrom.toLocaleString()}–${p.salaryTo.toLocaleString()} ${p.currency}`;
  if (p.salaryFrom) return `${p.salaryFrom.toLocaleString()}+ ${p.currency}`;
  if (p.salaryTo) return `0–${p.salaryTo.toLocaleString()} ${p.currency}`;
  return '—';
}

async function showPositionDetail(
  ctx: MyContext,
  posId: string,
  opts: { sendNew?: boolean } = {},
): Promise<void> {
  const p = await prisma.position.findUnique({
    where: { id: posId },
    include: {
      department: { include: { company: true } },
      _count: { select: { questions: true, applications: true } },
    },
  });
  if (!p) {
    await ctx.reply('Topilmadi');
    return;
  }

  const text = [
    `💼 <b>${p.titleUz}</b> / ${p.titleRu}`,
    '',
    `🏢 ${p.department.company.nameUz} → ${p.department.nameUz}`,
    '',
    p.descriptionUz ? `📝 <i>${p.descriptionUz}</i>` : '',
    `💰 ${formatSalaryAdmin(p)}`,
    `📍 ${p.location ?? '—'}`,
    `🕒 ${EMPLOYMENT_LABELS[p.employmentType]}`,
    `🎯 ${EXPERIENCE_LABELS[p.experienceLevel]}`,
    `📸 Rasm talab: ${p.requirePhoto ? 'Ha' : "Yo'q"}`,
    `📄 CV talab: ${p.requireCv ? 'Ha' : "Yo'q"}`,
    `⭐ Featured: ${p.isFeatured ? 'Ha' : "Yo'q"}`,
    `Status: ${p.isActive ? '🟢 Faol' : '⚪ Faolsiz'}`,
    '',
    `❓ Savollar: ${p._count.questions}`,
    `📨 Arizalar: ${p._count.applications}`,
    `ID: <code>${p.id}</code>`,
  ]
    .filter(Boolean)
    .join('\n');

  const kb = new InlineKeyboard()
    .text('❓ Savollar', `qm:list:${p.id}`)
    .text(`📨 Arizalar (${p._count.applications})`, `aps:open:p:${p.id}`)
    .row()
    .text("✏️ Nom (uz)", `pm:edit:${p.id}:titleUz`)
    .text('✏️ Nom (ru)', `pm:edit:${p.id}:titleRu`)
    .row()
    .text('✏️ Tavsif (uz)', `pm:edit:${p.id}:descriptionUz`)
    .text('✏️ Tavsif (ru)', `pm:edit:${p.id}:descriptionRu`)
    .row()
    .text('💰 Maosh', `pm:salary:${p.id}`)
    .text('📍 Joylashuv', `pm:edit:${p.id}:location`)
    .row()
    .text('🕒 Ish turi', `pm:emp:${p.id}`)
    .text('🎯 Tajriba', `pm:exp:${p.id}`)
    .row()
    .text(`📸 ${p.requirePhoto ? '✅' : '⬜'} Rasm`, `pm:tphoto:${p.id}`)
    .text(`📄 ${p.requireCv ? '✅' : '⬜'} CV`, `pm:tcv:${p.id}`)
    .row()
    .text(p.isFeatured ? '⭐ Featured (olib tashlash)' : '⭐ Featured qilish', `pm:tfeat:${p.id}`)
    .row()
    .text(p.isActive ? '⚪ Faolsizlantirish' : '🟢 Faollashtirish', `pm:toggle:${p.id}`)
    .row()
    .text("🗑 O'chirish", `pm:del:${p.id}`)
    .row()
    .text('⬅️ Orqaga', `pm:list:${p.departmentId}`);

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

adminPositionsComposer.callbackQuery(/^pm:list:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showPositionList(ctx, ctx.match![1]);
});

adminPositionsComposer.callbackQuery(/^pm:show:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showPositionDetail(ctx, ctx.match![1]);
});

adminPositionsComposer.callbackQuery(/^pm:new:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.admin = { ...ctx.session.admin, selectedDepartmentId: ctx.match![1] };
  await ctx.conversation.enter('admin-create-pos');
});

adminPositionsComposer.callbackQuery(/^pm:edit:([^:]+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match![1];
  const field = ctx.match![2];
  ctx.session.admin = {
    ...ctx.session.admin,
    selectedPositionId: id,
    editField: field,
  };
  await ctx.conversation.enter('admin-edit-pos-text');
});

// Maosh tahrirlash menu
adminPositionsComposer.callbackQuery(/^pm:salary:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match![1];
  const p = await prisma.position.findUnique({ where: { id } });
  if (!p) return;
  const kb = new InlineKeyboard()
    .text('💰 Min', `pm:edit:${id}:salaryFrom`)
    .text('💰 Max', `pm:edit:${id}:salaryTo`)
    .row()
    .text(p.salaryNegotiable ? '✅ Kelishilgan' : '⬜ Kelishilgan', `pm:tneg:${id}`)
    .row()
    .text(`💱 ${p.currency}`, `pm:cur:${id}`)
    .row()
    .text('⬅️ Orqaga', `pm:show:${id}`);
  const text = `💰 <b>Maosh sozlash</b>\n\nHozir: ${formatSalaryAdmin(p)}`;
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
});

adminPositionsComposer.callbackQuery(/^pm:tneg:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const p = await prisma.position.findUnique({ where: { id } });
  if (!p) return;
  await prisma.position.update({ where: { id }, data: { salaryNegotiable: !p.salaryNegotiable } });
  await ctx.answerCallbackQuery({ text: '✅' });
  await showPositionDetail(ctx, id);
});

// Currency switcher
adminPositionsComposer.callbackQuery(/^pm:cur:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match![1];
  const kb = new InlineKeyboard()
    .text('UZS', `pm:setcur:${id}:UZS`)
    .text('USD', `pm:setcur:${id}:USD`)
    .text('RUB', `pm:setcur:${id}:RUB`)
    .row()
    .text('⬅️ Orqaga', `pm:show:${id}`);
  try {
    await ctx.editMessageText('💱 Valyutani tanlang:', { reply_markup: kb });
  } catch {
    await ctx.reply('💱 Valyutani tanlang:', { reply_markup: kb });
  }
});

adminPositionsComposer.callbackQuery(/^pm:setcur:([^:]+):(UZS|USD|RUB)$/, async (ctx) => {
  const id = ctx.match![1];
  const cur = ctx.match![2];
  await prisma.position.update({ where: { id }, data: { currency: cur } });
  await ctx.answerCallbackQuery({ text: `✅ ${cur}` });
  await showPositionDetail(ctx, id);
});

// Employment type
adminPositionsComposer.callbackQuery(/^pm:emp:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match![1];
  const kb = new InlineKeyboard();
  for (const [key, label] of Object.entries(EMPLOYMENT_LABELS)) {
    kb.text(label, `pm:setemp:${id}:${key}`).row();
  }
  kb.text('⬅️ Orqaga', `pm:show:${id}`);
  try {
    await ctx.editMessageText('🕒 Ish turini tanlang:', { reply_markup: kb });
  } catch {
    await ctx.reply('🕒 Ish turini tanlang:', { reply_markup: kb });
  }
});

adminPositionsComposer.callbackQuery(/^pm:setemp:([^:]+):(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const emp = ctx.match![2] as EmploymentType;
  await prisma.position.update({ where: { id }, data: { employmentType: emp } });
  await ctx.answerCallbackQuery({ text: '✅' });
  await showPositionDetail(ctx, id);
});

// Experience level
adminPositionsComposer.callbackQuery(/^pm:exp:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match![1];
  const kb = new InlineKeyboard();
  for (const [key, label] of Object.entries(EXPERIENCE_LABELS)) {
    kb.text(label, `pm:setexp:${id}:${key}`).row();
  }
  kb.text('⬅️ Orqaga', `pm:show:${id}`);
  try {
    await ctx.editMessageText('🎯 Tajriba darajasini tanlang:', { reply_markup: kb });
  } catch {
    await ctx.reply('🎯 Tajriba darajasini tanlang:', { reply_markup: kb });
  }
});

adminPositionsComposer.callbackQuery(/^pm:setexp:([^:]+):(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const exp = ctx.match![2] as ExperienceLevel;
  await prisma.position.update({ where: { id }, data: { experienceLevel: exp } });
  await ctx.answerCallbackQuery({ text: '✅' });
  await showPositionDetail(ctx, id);
});

// Toggle photo / cv requirement
adminPositionsComposer.callbackQuery(/^pm:tphoto:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const p = await prisma.position.findUnique({ where: { id } });
  if (!p) return;
  await prisma.position.update({ where: { id }, data: { requirePhoto: !p.requirePhoto } });
  await ctx.answerCallbackQuery({ text: '✅' });
  await showPositionDetail(ctx, id);
});

adminPositionsComposer.callbackQuery(/^pm:tcv:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const p = await prisma.position.findUnique({ where: { id } });
  if (!p) return;
  await prisma.position.update({ where: { id }, data: { requireCv: !p.requireCv } });
  await ctx.answerCallbackQuery({ text: '✅' });
  await showPositionDetail(ctx, id);
});

// Toggle featured / active
adminPositionsComposer.callbackQuery(/^pm:tfeat:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const p = await prisma.position.findUnique({ where: { id } });
  if (!p) return;
  await prisma.position.update({ where: { id }, data: { isFeatured: !p.isFeatured } });
  await ctx.answerCallbackQuery({ text: '✅' });
  await showPositionDetail(ctx, id);
});

adminPositionsComposer.callbackQuery(/^pm:toggle:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const p = await prisma.position.findUnique({ where: { id } });
  if (!p) return;
  await prisma.position.update({ where: { id }, data: { isActive: !p.isActive } });
  await prisma.adminLog.create({
    data: {
      adminId: ctx.dbUser!.id,
      action: p.isActive ? 'DEACTIVATE' : 'ACTIVATE',
      entity: 'Position',
      entityId: id,
    },
  });
  await ctx.answerCallbackQuery({ text: '✅' });
  await showPositionDetail(ctx, id);
});

adminPositionsComposer.callbackQuery(/^pm:del:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const p = await prisma.position.findUnique({ where: { id } });
  if (!p) return;
  await prisma.position.update({ where: { id }, data: { isDeleted: true, isActive: false } });
  await prisma.adminLog.create({
    data: { adminId: ctx.dbUser!.id, action: 'DELETE', entity: 'Position', entityId: id },
  });
  await ctx.answerCallbackQuery({ text: "🗑 O'chirildi" });
  await showPositionList(ctx, p.departmentId);
});

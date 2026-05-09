import path from 'node:path';
import { Composer, InlineKeyboard, InputFile } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { Conversation } from '@grammyjs/conversations';
import { QuestionType } from '@prisma/client';
import { MyContext } from '../../types/context.js';
import { prisma } from '../../services/prisma.js';
import { questionTemplates, applyTemplate } from '../../data/question-templates.js';
import {
  generateQuestionsTemplate,
  importQuestionsFromExcel,
} from '../../services/questions-template.service.js';
import { FILES, downloadToFile, safeFileName } from '../../utils/files.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export const adminQuestionsComposer = new Composer<MyContext>();

type Convo = Conversation<MyContext>;

const TYPE_LABELS: Record<QuestionType, string> = {
  TEXT: '📝 Qisqa matn',
  LONG_TEXT: '📄 Uzun matn',
  NUMBER: '🔢 Son',
  DATE: '📅 Sana',
  PHONE: '📞 Telefon',
  EMAIL: '📧 Email',
  SINGLE_CHOICE: '☑️ Bitta tanlov',
  MULTI_CHOICE: '✅ Ko‘p tanlov',
  FILE: '📎 Fayl',
  PHOTO: '📸 Rasm',
  BOOLEAN: '🟢 Ha/Yo‘q',
  LOCATION: '📍 Joylashuv',
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Yangi savol yaratish
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function createQuestionConvo(conversation: Convo, ctx: MyContext): Promise<void> {
  const positionId = ctx.session.admin?.selectedPositionId;
  if (!positionId) {
    await ctx.reply('⚠️ Avval lavozim tanlang');
    return;
  }

  // 1. Type
  const typeKb = new InlineKeyboard();
  for (const [key, label] of Object.entries(TYPE_LABELS)) {
    typeKb.text(label, `qmnew:type:${key}`).row();
  }
  await ctx.reply('Savol turini tanlang:', { reply_markup: typeKb });
  const typeUpd = await conversation.waitFor('callback_query:data');
  await typeUpd.answerCallbackQuery();
  const typeMatch = typeUpd.callbackQuery.data.match(/^qmnew:type:(.+)$/);
  if (!typeMatch) return;
  const type = typeMatch[1] as QuestionType;
  try {
    await typeUpd.editMessageReplyMarkup({ reply_markup: undefined });
  } catch {
    /* ignore */
  }

  // 2. Text uz
  await ctx.reply("Savol matni (o'zbekcha):");
  const textUz = (await conversation.waitFor('message:text')).message.text.trim();

  // 3. Text ru
  await ctx.reply('Текст вопроса (русский):');
  const textRu = (await conversation.waitFor('message:text')).message.text.trim();

  // 4. Required
  const reqKb = new InlineKeyboard()
    .text('✅ Ha, majburiy', 'qmnew:req:1')
    .text("❌ Yo'q, ixtiyoriy", 'qmnew:req:0');
  await ctx.reply('Bu savol majburiymi?', { reply_markup: reqKb });
  const reqUpd = await conversation.waitFor('callback_query:data');
  await reqUpd.answerCallbackQuery();
  const required = reqUpd.callbackQuery.data === 'qmnew:req:1';
  try {
    await reqUpd.editMessageReplyMarkup({ reply_markup: undefined });
  } catch {
    /* ignore */
  }

  // 5. Options for choice types
  let options: Array<{ value: string; labelUz: string; labelRu: string }> | undefined;
  if (type === 'SINGLE_CHOICE' || type === 'MULTI_CHOICE') {
    await ctx.reply(
      'Tanlovlarni quyidagi formatda kiriting:\n' +
        '<code>value|labelUz|labelRu</code>\n' +
        'Har bir tanlov yangi qatorda.\n\n' +
        'Misol:\n' +
        '<code>yes|Ha|Да\nno|Yo‘q|Нет\nmaybe|Balki|Возможно</code>',
      { parse_mode: 'HTML' },
    );
    while (!options) {
      const raw = (await conversation.waitFor('message:text')).message.text.trim();
      const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
      const parsed: Array<{ value: string; labelUz: string; labelRu: string }> = [];
      let hasError = false;
      for (const line of lines) {
        const parts = line.split('|').map((p) => p.trim());
        if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
          await ctx.reply(`⚠️ Format xato: <code>${line}</code>`, { parse_mode: 'HTML' });
          hasError = true;
          break;
        }
        parsed.push({ value: parts[0], labelUz: parts[1], labelRu: parts[2] });
      }
      if (!hasError && parsed.length > 0) {
        options = parsed;
      } else if (!hasError) {
        await ctx.reply('⚠️ Hech bo‘lmasa 1 ta tanlov kiriting');
      }
    }
  }

  // 6. Save
  const lastOrder = await conversation.external(() =>
    prisma.question.findFirst({
      where: { positionId },
      orderBy: { order: 'desc' },
      select: { order: true },
    }),
  );
  const nextOrder = (lastOrder?.order ?? -1) + 1;

  const q = await conversation.external(() =>
    prisma.question.create({
      data: {
        positionId,
        order: nextOrder,
        textUz,
        textRu,
        type,
        required,
        options: options ?? undefined,
      },
    }),
  );

  await conversation.external(() =>
    prisma.adminLog.create({
      data: {
        adminId: ctx.dbUser!.id,
        action: 'CREATE',
        entity: 'Question',
        entityId: q.id,
        details: { positionId, type, textUz },
      },
    }),
  );

  await ctx.reply(`✅ Savol qo‘shildi: <b>${textUz}</b>`, { parse_mode: 'HTML' });
  await conversation.external(() => showQuestionList(ctx, positionId, { sendNew: true }));
}

adminQuestionsComposer.use(createConversation(createQuestionConvo, 'admin-create-q'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ekranlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function showQuestionList(
  ctx: MyContext,
  positionId: string,
  opts: { sendNew?: boolean } = {},
): Promise<void> {
  const pos = await prisma.position.findUnique({
    where: { id: positionId },
    include: { department: { include: { company: true } } },
  });
  if (!pos) return;

  const questions = await prisma.question.findMany({
    where: { positionId },
    orderBy: { order: 'asc' },
  });

  const kb = new InlineKeyboard();
  for (const q of questions) {
    const reqMark = q.required ? '🔴' : '⚪';
    const shortText = q.textUz.length > 35 ? q.textUz.slice(0, 32) + '…' : q.textUz;
    kb.text(`${reqMark} ${q.order + 1}. ${shortText}`, `qm:show:${q.id}`).row();
  }
  kb.text('➕ Yangi savol', `qm:new:${positionId}`).row();
  kb.text('📋 Shablon qo‘llash', `qm:tpl:${positionId}`).row();
  kb.text('📥 Excel shablon', `qm:xldl:${positionId}`)
    .text('📤 Excel yuklash', `qm:xlup:${positionId}`)
    .row();
  kb.text('⬅️ Orqaga', `pm:show:${positionId}`);

  const text = `🏢 ${pos.department.company.nameUz} → ${pos.department.nameUz} → 💼 <b>${pos.titleUz}</b>\n\n❓ Savollar (${questions.length}):`;

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

async function showQuestionDetail(ctx: MyContext, qId: string): Promise<void> {
  const q = await prisma.question.findUnique({
    where: { id: qId },
    include: { _count: { select: { answers: true } } },
  });
  if (!q) return;

  const optsText = Array.isArray(q.options)
    ? (q.options as Array<{ value: string; labelUz?: string; labelRu?: string }>)
        .map((o, i) => `   ${i + 1}. ${o.labelUz ?? o.value}`)
        .join('\n')
    : '';

  const text = [
    `❓ <b>Savol #${q.order + 1}</b>`,
    '',
    `🏷 Tur: ${TYPE_LABELS[q.type]}`,
    `${q.required ? '🔴 Majburiy' : '⚪ Ixtiyoriy'}`,
    '',
    `🇺🇿 ${q.textUz}`,
    `🇷🇺 ${q.textRu}`,
    optsText ? `\n📋 Tanlovlar:\n${optsText}` : '',
    `\n📨 Javoblar: ${q._count.answers}`,
    `ID: <code>${q.id}</code>`,
  ]
    .filter(Boolean)
    .join('\n');

  const kb = new InlineKeyboard()
    .text('⬆️', `qm:up:${q.id}`)
    .text('⬇️', `qm:down:${q.id}`)
    .text(q.required ? '⚪ Ixtiyoriy' : '🔴 Majburiy', `qm:treq:${q.id}`)
    .row()
    .text('🗑 O‘chirish', `qm:del:${q.id}`)
    .row()
    .text('⬅️ Orqaga', `qm:list:${q.positionId}`);

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Callback handlerlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

adminQuestionsComposer.callbackQuery(/^qm:list:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showQuestionList(ctx, ctx.match![1]);
});

adminQuestionsComposer.callbackQuery(/^qm:show:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showQuestionDetail(ctx, ctx.match![1]);
});

adminQuestionsComposer.callbackQuery(/^qm:new:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.admin = { ...ctx.session.admin, selectedPositionId: ctx.match![1] };
  await ctx.conversation.enter('admin-create-q');
});

adminQuestionsComposer.callbackQuery(/^qm:treq:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q) return;
  await prisma.question.update({ where: { id }, data: { required: !q.required } });
  await ctx.answerCallbackQuery({ text: '✅' });
  await showQuestionDetail(ctx, id);
});

// Reorder up
adminQuestionsComposer.callbackQuery(/^qm:up:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q) return;
  const prev = await prisma.question.findFirst({
    where: { positionId: q.positionId, order: { lt: q.order } },
    orderBy: { order: 'desc' },
  });
  if (!prev) {
    await ctx.answerCallbackQuery({ text: '⬆️ Eng yuqorida' });
    return;
  }
  await prisma.$transaction([
    prisma.question.update({ where: { id: q.id }, data: { order: -1 } }),
    prisma.question.update({ where: { id: prev.id }, data: { order: q.order } }),
    prisma.question.update({ where: { id: q.id }, data: { order: prev.order } }),
  ]);
  await ctx.answerCallbackQuery({ text: '⬆️' });
  await showQuestionList(ctx, q.positionId);
});

// Reorder down
adminQuestionsComposer.callbackQuery(/^qm:down:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q) return;
  const next = await prisma.question.findFirst({
    where: { positionId: q.positionId, order: { gt: q.order } },
    orderBy: { order: 'asc' },
  });
  if (!next) {
    await ctx.answerCallbackQuery({ text: '⬇️ Eng pastida' });
    return;
  }
  await prisma.$transaction([
    prisma.question.update({ where: { id: q.id }, data: { order: -1 } }),
    prisma.question.update({ where: { id: next.id }, data: { order: q.order } }),
    prisma.question.update({ where: { id: q.id }, data: { order: next.order } }),
  ]);
  await ctx.answerCallbackQuery({ text: '⬇️' });
  await showQuestionList(ctx, q.positionId);
});

// Delete (only if no answers)
adminQuestionsComposer.callbackQuery(/^qm:del:(.+)$/, async (ctx) => {
  const id = ctx.match![1];
  const q = await prisma.question.findUnique({
    where: { id },
    include: { _count: { select: { answers: true } } },
  });
  if (!q) return;
  if (q._count.answers > 0) {
    await ctx.answerCallbackQuery({
      text: `⚠️ Bu savolda ${q._count.answers} ta javob bor — o‘chirib bo‘lmaydi`,
      show_alert: true,
    });
    return;
  }
  await prisma.question.delete({ where: { id } });
  await prisma.adminLog.create({
    data: { adminId: ctx.dbUser!.id, action: 'DELETE', entity: 'Question', entityId: id },
  });
  await ctx.answerCallbackQuery({ text: '🗑 O‘chirildi' });
  await showQuestionList(ctx, q.positionId);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shablonlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

adminQuestionsComposer.callbackQuery(/^qm:tpl:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const positionId = ctx.match![1];
  const kb = new InlineKeyboard();
  for (const tplName of Object.keys(questionTemplates)) {
    const count = questionTemplates[tplName].length;
    kb.text(`📋 ${tplName} (${count})`, `qm:tplapp:${positionId}:${tplName}`).row();
  }
  kb.text('⬅️ Orqaga', `qm:list:${positionId}`);
  const text =
    '<b>📋 Tayyor shablonlar</b>\n\nShablonni tanlang — uning savollari joriy lavozim oxiriga qo‘shiladi:';
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Excel template download / upload
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

adminQuestionsComposer.callbackQuery(/^qm:xldl:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ Tayyorlanmoqda...' });
  try {
    const filePath = await generateQuestionsTemplate();
    await ctx.replyWithDocument(new InputFile(filePath), {
      caption:
        '📥 <b>Savollar shabloni</b>\n\n' +
        "1. Faylni yuklab oling va to'ldiring\n" +
        "2. Qo'llanma varag'ida tushuntirishlar bor\n" +
        '3. Tayyor bo\'lgach "📤 Excel yuklash" ni bosib qaytaring',
      parse_mode: 'HTML',
    });
  } catch (err) {
    logger.error({ err }, 'Failed to generate questions template');
    await ctx.reply('❌ Shablonni yaratib bo‘lmadi.');
  }
});

async function importExcelConvo(conversation: Convo, ctx: MyContext): Promise<void> {
  const positionId = ctx.session.admin?.selectedPositionId;
  if (!positionId) {
    await ctx.reply('⚠️ Avval lavozim tanlang');
    return;
  }

  await ctx.reply('📤 To‘ldirilgan Excel faylni yuboring (.xlsx):');
  const upd = await conversation.waitFor('message:document');
  const doc = upd.message.document;

  if (!doc.file_name?.toLowerCase().endsWith('.xlsx')) {
    await ctx.reply('❌ Faqat .xlsx fayl qabul qilinadi.');
    return;
  }

  const sizeMb = (doc.file_size ?? 0) / (1024 * 1024);
  if (sizeMb > env.MAX_FILE_SIZE_MB) {
    await ctx.reply(`❌ Fayl juda katta (${sizeMb.toFixed(1)} MB).`);
    return;
  }

  await ctx.reply('⏳ Yuklanmoqda va tekshirilmoqda...');

  const result = await conversation.external(async () => {
    const file = await ctx.api.getFile(doc.file_id);
    const url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.file_path}`;
    const dest = path.join(FILES.files, `import_${Date.now()}_${safeFileName(doc.file_name ?? 'questions.xlsx')}`);
    await downloadToFile(url, dest);
    try {
      return await importQuestionsFromExcel(dest, positionId);
    } catch (err) {
      logger.error({ err }, 'Excel import error');
      return { added: 0, errors: [(err as Error).message ?? 'Noma‘lum xatolik'] };
    }
  });

  const lines = [`✅ Qo'shildi: <b>${result.added}</b> ta savol`];
  if (result.errors.length > 0) {
    lines.push('');
    lines.push('⚠️ <b>Xatolar:</b>');
    for (const e of result.errors.slice(0, 20)) lines.push(`   • ${e}`);
    if (result.errors.length > 20) lines.push(`   ... va yana ${result.errors.length - 20} ta`);
  }
  await ctx.reply(lines.join('\n'), { parse_mode: 'HTML' });

  if (result.added > 0) {
    await conversation.external(() => showQuestionList(ctx, positionId, { sendNew: true }));
  }
}

adminQuestionsComposer.use(createConversation(importExcelConvo, 'admin-import-q-excel'));

adminQuestionsComposer.callbackQuery(/^qm:xlup:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.admin = { ...ctx.session.admin, selectedPositionId: ctx.match![1] };
  await ctx.conversation.enter('admin-import-q-excel');
});

adminQuestionsComposer.callbackQuery(/^qm:tplapp:([^:]+):(.+)$/, async (ctx) => {
  const positionId = ctx.match![1];
  const tplName = ctx.match![2];
  const seeds = applyTemplate(tplName);
  if (seeds.length === 0) {
    await ctx.answerCallbackQuery({ text: '⚠️ Bo‘sh shablon' });
    return;
  }

  const last = await prisma.question.findFirst({
    where: { positionId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  let nextOrder = (last?.order ?? -1) + 1;

  for (const s of seeds) {
    await prisma.question.create({
      data: {
        positionId,
        order: nextOrder++,
        textUz: s.textUz,
        textRu: s.textRu,
        type: s.type,
        required: s.required ?? true,
        options: s.options ?? undefined,
        validation: (s.validation as object | undefined) ?? undefined,
        placeholderUz: s.placeholderUz,
        placeholderRu: s.placeholderRu,
      },
    });
  }

  await prisma.adminLog.create({
    data: {
      adminId: ctx.dbUser!.id,
      action: 'TEMPLATE_APPLY',
      entity: 'Position',
      entityId: positionId,
      details: { template: tplName, count: seeds.length },
    },
  });

  await ctx.answerCallbackQuery({ text: `✅ ${seeds.length} ta savol qo‘shildi` });
  await showQuestionList(ctx, positionId);
});

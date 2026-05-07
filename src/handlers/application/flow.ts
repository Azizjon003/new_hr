import path from 'node:path';
import { InlineKeyboard, Keyboard } from 'grammy';
import type { Conversation } from '@grammyjs/conversations';
import { Position, Question } from '@prisma/client';
import { MyContext } from '../../types/context.js';
import {
  getPositionWithRelations,
  getPositionTitle,
} from '../../services/company.service.js';
import {
  findOrCreateDraft,
  saveAnswer,
  setApplicationFiles,
  submitApplication,
} from '../../services/application.service.js';
import { postApplicationToChannel } from '../../services/channel.service.js';
import { generateApplicationPdf } from '../../services/pdf.service.js';
import { mainMenuKeyboard } from '../../keyboards/main-menu.js';
import { FILES, downloadToFile, safeFileName } from '../../utils/files.js';
import { parseDate, formatDate, normalizePhone, phoneRegex, emailRegex } from '../../utils/validators.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

type Convo = Conversation<MyContext>;

function isCancel(text?: string): boolean {
  return text === '/cancel' || text === '/menu';
}

function questionText(q: Question, lang: 'UZ' | 'RU'): string {
  return lang === 'RU' ? q.textRu : q.textUz;
}

function buildQuestionKeyboard(
  q: Question,
  lang: 'UZ' | 'RU',
  t: MyContext['t'],
): InlineKeyboard | undefined {
  if (q.type === 'SINGLE_CHOICE' && Array.isArray(q.options)) {
    const kb = new InlineKeyboard();
    for (const opt of q.options as Array<{
      value: string;
      labelUz?: string;
      labelRu?: string;
      label?: string;
    }>) {
      const label =
        lang === 'RU'
          ? opt.labelRu ?? opt.label ?? opt.value
          : opt.labelUz ?? opt.label ?? opt.value;
      kb.text(label, `qopt:${opt.value}`).row();
    }
    if (!q.required) kb.text(t('apply-skip'), 'qskip');
    return kb;
  }
  if (q.type === 'BOOLEAN') {
    const kb = new InlineKeyboard()
      .text(t('boolean-yes'), 'qopt:true')
      .text(t('boolean-no'), 'qopt:false');
    if (!q.required) kb.row().text(t('apply-skip'), 'qskip');
    return kb;
  }
  return undefined;
}

async function askMultiChoice(
  conversation: Convo,
  ctx: MyContext,
  q: Question,
  index: number,
  total: number,
  applicationId: string,
): Promise<void> {
  const lang = ctx.dbUser!.lang;
  const opts = (q.options ?? []) as Array<{
    value: string;
    labelUz?: string;
    labelRu?: string;
    label?: string;
  }>;
  if (opts.length === 0) {
    // tanlovlar yo'q — savolni o'tkazib yuboramiz
    await ctx.reply('⚠️ Bu savolda tanlovlar topilmadi.');
    return;
  }
  const selected = new Set<string>();

  const optLabel = (opt: (typeof opts)[number]): string =>
    (lang === 'RU' ? opt.labelRu : opt.labelUz) ?? opt.label ?? opt.value;

  const buildKb = (): InlineKeyboard => {
    const kb = new InlineKeyboard();
    for (const opt of opts) {
      const mark = selected.has(opt.value) ? '✅' : '⬜';
      kb.text(`${mark} ${optLabel(opt)}`, `qmcopt:${opt.value}`).row();
    }
    kb.text(ctx.t('choice-done'), 'qmcdone');
    if (!q.required) kb.row().text(ctx.t('apply-skip'), 'qskip');
    return kb;
  };

  const progress = ctx.t('apply-progress', { current: index + 1, total });
  const hint =
    lang === 'RU'
      ? '<i>(можно выбрать несколько)</i>'
      : '<i>(bir nechta tanlovni belgilashingiz mumkin)</i>';
  const text = `<b>${progress}</b>\n\n${questionText(q, lang)}\n${hint}`;

  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: buildKb() });

  while (true) {
    const upd = await conversation.waitFor('callback_query:data');
    const data = upd.callbackQuery.data;

    if (data === 'qmcdone') {
      if (q.required && selected.size === 0) {
        await upd.answerCallbackQuery({
          text: lang === 'RU' ? 'Выберите хотя бы один' : 'Kamida bitta tanlang',
          show_alert: true,
        });
        continue;
      }
      await upd.answerCallbackQuery();
      const values = Array.from(selected);
      await conversation.external(() =>
        saveAnswer(applicationId, q.id, { valueJson: values }),
      );
      try {
        await upd.editMessageReplyMarkup({ reply_markup: undefined });
      } catch {
        /* ignore */
      }
      return;
    }

    if (data === 'qskip') {
      if (q.required) {
        await upd.answerCallbackQuery({ text: ctx.t('apply-required'), show_alert: true });
        continue;
      }
      await upd.answerCallbackQuery();
      try {
        await upd.editMessageReplyMarkup({ reply_markup: undefined });
      } catch {
        /* ignore */
      }
      return;
    }

    const m = data.match(/^qmcopt:(.+)$/);
    if (m) {
      const value = m[1];
      if (selected.has(value)) selected.delete(value);
      else selected.add(value);
      await upd.answerCallbackQuery();
      try {
        await upd.editMessageReplyMarkup({ reply_markup: buildKb() });
      } catch {
        /* ignore */
      }
      continue;
    }

    await upd.answerCallbackQuery();
  }
}

async function askQuestion(
  conversation: Convo,
  ctx: MyContext,
  q: Question,
  index: number,
  total: number,
  applicationId: string,
): Promise<void> {
  // MULTI_CHOICE alohida flow (toggle bilan)
  if (q.type === 'MULTI_CHOICE') {
    return askMultiChoice(conversation, ctx, q, index, total, applicationId);
  }

  const lang = ctx.dbUser!.lang;
  const progress = ctx.t('apply-progress', { current: index + 1, total });
  const required = q.required ? '' : ` <i>(${ctx.t('apply-skip')})</i>`;
  const text = `<b>${progress}</b>\n\n${questionText(q, lang)}${required}`;

  const validation = (q.validation ?? {}) as {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };

  const skipLabel = ctx.t('apply-skip');

  while (true) {
    const inlineKb = buildQuestionKeyboard(q, lang, ctx.t.bind(ctx));
    if (inlineKb) {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: inlineKb });
    } else if (q.type === 'PHONE') {
      const kb = new Keyboard().requestContact(ctx.t('profile-ask-phone-button')).row();
      if (!q.required) kb.text(skipLabel);
      kb.resized().oneTime();
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
    } else if (q.type === 'LOCATION') {
      const kb = new Keyboard().requestLocation('📍').row();
      if (!q.required) kb.text(skipLabel);
      kb.resized().oneTime();
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
    } else if (!q.required) {
      // Boshqa text/file turlari uchun ixtiyoriy bo'lsa — skip tugmasi
      const kb = new Keyboard().text(skipLabel).resized().oneTime();
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
    } else {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } });
    }

    const upd = await conversation.wait();
    const cqData = upd.callbackQuery?.data;
    if (cqData) {
      await upd.answerCallbackQuery().catch(() => undefined);
      if (cqData === 'qskip') {
        if (q.required) {
          await ctx.reply(ctx.t('apply-required'));
          continue;
        }
        return;
      }
      const optMatch = cqData.match(/^qopt:(.+)$/);
      if (optMatch) {
        const value = optMatch[1];
        if (q.type === 'SINGLE_CHOICE' || q.type === 'BOOLEAN') {
          await conversation.external(() =>
            saveAnswer(applicationId, q.id, { valueText: value }),
          );
          // tugma bosilgach inline keyboardni olib tashlash
          try {
            await upd.editMessageReplyMarkup({ reply_markup: undefined });
          } catch {
            /* ignore */
          }
          return;
        }
      }
      continue;
    }

    const msg = upd.message;
    if (!msg) continue;
    if (msg.text && isCancel(msg.text)) {
      throw new Error('CANCEL');
    }

    // Reply-keyboard "Skip" tugmasi bosilganda
    if (msg.text && msg.text.trim() === skipLabel) {
      if (q.required) {
        await ctx.reply(ctx.t('apply-required'));
        continue;
      }
      return;
    }

    switch (q.type) {
      case 'TEXT':
      case 'LONG_TEXT': {
        const t = msg.text?.trim();
        if (!t) {
          await ctx.reply(ctx.t('apply-invalid'));
          continue;
        }
        if (validation.minLength && t.length < validation.minLength) {
          await ctx.reply(ctx.t('val-text-too-short', { min: validation.minLength }));
          continue;
        }
        if (validation.maxLength && t.length > validation.maxLength) {
          await ctx.reply(ctx.t('val-text-too-long', { max: validation.maxLength }));
          continue;
        }
        await conversation.external(() => saveAnswer(applicationId, q.id, { valueText: t }));
        return;
      }
      case 'NUMBER': {
        const t = msg.text?.trim();
        const n = Number(t);
        if (!t || Number.isNaN(n)) {
          await ctx.reply(ctx.t('val-not-number'));
          continue;
        }
        if (validation.min != null && n < validation.min) {
          await ctx.reply(ctx.t('val-number-too-small', { min: validation.min }));
          continue;
        }
        if (validation.max != null && n > validation.max) {
          await ctx.reply(ctx.t('val-number-too-large', { max: validation.max }));
          continue;
        }
        await conversation.external(() => saveAnswer(applicationId, q.id, { valueNumber: n }));
        return;
      }
      case 'DATE': {
        const t = msg.text?.trim();
        const d = t ? parseDate(t) : null;
        if (!d) {
          await ctx.reply(ctx.t('val-bad-date'));
          continue;
        }
        await conversation.external(() => saveAnswer(applicationId, q.id, { valueDate: d }));
        return;
      }
      case 'PHONE': {
        let phone = '';
        if (msg.contact?.phone_number) {
          phone = msg.contact.phone_number;
          if (!phone.startsWith('+')) phone = '+' + phone;
        } else if (msg.text) {
          phone = normalizePhone(msg.text.trim());
          if (!phoneRegex.test(phone)) {
            await ctx.reply(ctx.t('val-bad-phone'));
            continue;
          }
        } else {
          await ctx.reply(ctx.t('val-bad-phone'));
          continue;
        }
        await conversation.external(() => saveAnswer(applicationId, q.id, { valueText: phone }));
        return;
      }
      case 'EMAIL': {
        const t = msg.text?.trim();
        if (!t || !emailRegex.test(t)) {
          await ctx.reply(ctx.t('val-bad-email'));
          continue;
        }
        await conversation.external(() => saveAnswer(applicationId, q.id, { valueText: t }));
        return;
      }
      case 'LOCATION': {
        if (msg.location) {
          await conversation.external(() =>
            saveAnswer(applicationId, q.id, {
              valueJson: {
                latitude: msg.location!.latitude,
                longitude: msg.location!.longitude,
              },
            }),
          );
          return;
        }
        await ctx.reply(ctx.t('apply-invalid'));
        continue;
      }
      case 'PHOTO': {
        if (!msg.photo || msg.photo.length === 0) {
          await ctx.reply(ctx.t('val-bad-photo'));
          continue;
        }
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const file = await ctx.api.getFile(fileId);
        const url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.file_path}`;
        const dest = path.join(FILES.photos, `${applicationId}_${q.id}.jpg`);
        await downloadToFile(url, dest);
        await conversation.external(() => saveAnswer(applicationId, q.id, { filePath: dest }));
        return;
      }
      case 'FILE': {
        if (!msg.document) {
          await ctx.reply(ctx.t('val-bad-file'));
          continue;
        }
        const doc = msg.document;
        const sizeMb = (doc.file_size ?? 0) / (1024 * 1024);
        if (sizeMb > env.MAX_FILE_SIZE_MB) {
          await ctx.reply(ctx.t('val-file-too-large', { max: env.MAX_FILE_SIZE_MB }));
          continue;
        }
        const file = await ctx.api.getFile(doc.file_id);
        const url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.file_path}`;
        const ext = path.extname(doc.file_name ?? '') || '.bin';
        const dest = path.join(
          FILES.files,
          `${applicationId}_${q.id}_${safeFileName(doc.file_name ?? 'file')}${ext}`,
        );
        await downloadToFile(url, dest);
        await conversation.external(() => saveAnswer(applicationId, q.id, { filePath: dest }));
        return;
      }
      default:
        await ctx.reply(ctx.t('apply-invalid'));
        continue;
    }
  }
}

async function askPhoto(
  conversation: Convo,
  ctx: MyContext,
  applicationId: string,
): Promise<void> {
  while (true) {
    await ctx.reply(ctx.t('apply-photo-request'), {
      reply_markup: { remove_keyboard: true },
    });
    const upd = await conversation.waitFor('message');
    if (upd.message.text && isCancel(upd.message.text)) throw new Error('CANCEL');
    if (!upd.message.photo || upd.message.photo.length === 0) {
      await ctx.reply(ctx.t('val-bad-photo'));
      continue;
    }
    const fileId = upd.message.photo[upd.message.photo.length - 1].file_id;
    const file = await ctx.api.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.file_path}`;
    const dest = path.join(FILES.photos, `${applicationId}_main.jpg`);
    await downloadToFile(url, dest);
    await conversation.external(() => setApplicationFiles(applicationId, { photoFilePath: dest }));
    return;
  }
}

async function askCv(
  conversation: Convo,
  ctx: MyContext,
  applicationId: string,
): Promise<void> {
  while (true) {
    await ctx.reply(ctx.t('apply-cv-request'), { reply_markup: { remove_keyboard: true } });
    const upd = await conversation.waitFor('message');
    if (upd.message.text && isCancel(upd.message.text)) throw new Error('CANCEL');
    if (!upd.message.document) {
      await ctx.reply(ctx.t('val-bad-file'));
      continue;
    }
    const doc = upd.message.document;
    const sizeMb = (doc.file_size ?? 0) / (1024 * 1024);
    if (sizeMb > env.MAX_FILE_SIZE_MB) {
      await ctx.reply(ctx.t('val-file-too-large', { max: env.MAX_FILE_SIZE_MB }));
      continue;
    }
    const file = await ctx.api.getFile(doc.file_id);
    const url = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.file_path}`;
    const ext = path.extname(doc.file_name ?? '') || '.pdf';
    const dest = path.join(FILES.cvs, `${applicationId}_cv${ext}`);
    await downloadToFile(url, dest);
    await conversation.external(() => setApplicationFiles(applicationId, { cvFilePath: dest }));
    return;
  }
}

async function confirmAndSubmit(
  conversation: Convo,
  ctx: MyContext,
  pos: Position,
): Promise<boolean> {
  const lang = ctx.dbUser!.lang;
  const u = ctx.dbUser!;
  const lines = [
    ctx.t('apply-confirm-title'),
    '',
    `💼 <b>${getPositionTitle(pos, lang)}</b>`,
    '',
    `👤 ${u.profileFullName ?? '-'}`,
    `📞 ${u.profilePhone ?? '-'}`,
    u.profileBirthDate ? `🎂 ${formatDate(u.profileBirthDate)}` : '',
    u.profileEmail ? `📧 ${u.profileEmail}` : '',
    u.profileCity ? `🏙 ${u.profileCity}` : '',
  ].filter(Boolean);

  const kb = new InlineKeyboard()
    .text(ctx.t('apply-confirm-submit'), 'apply:submit')
    .row()
    .text(ctx.t('apply-confirm-cancel'), 'apply:abort');

  await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', reply_markup: kb });
  const upd = await conversation.waitFor('callback_query:data');
  await upd.answerCallbackQuery();
  try {
    await upd.editMessageReplyMarkup({ reply_markup: undefined });
  } catch {
    /* ignore */
  }
  return upd.callbackQuery.data === 'apply:submit';
}

/**
 * Asosiy questionnaire conversation — `select.ts` dan keyin chaqiriladi.
 * Kompaniya/bo'lim/lavozim allaqachon `ctx.session.applyState` da tanlanagan bo'ladi.
 */
export async function questionnaireConversation(
  conversation: Convo,
  ctx: MyContext,
): Promise<void> {
  if (!ctx.dbUser) return;
  const positionId = ctx.session.applyState?.positionId;
  if (!positionId) {
    await ctx.reply(ctx.t('error-unknown'));
    return;
  }

  try {
    const userId = ctx.dbUser.id;
    const positionFull = await conversation.external(() => getPositionWithRelations(positionId));
    if (!positionFull) {
      await ctx.reply(ctx.t('error-unknown'));
      return;
    }

    const application = await conversation.external(() => findOrCreateDraft(userId, positionId));

    const total = positionFull.questions.length;
    for (let i = 0; i < total; i++) {
      await askQuestion(conversation, ctx, positionFull.questions[i], i, total, application.id);
    }

    if (positionFull.requirePhoto) {
      await askPhoto(conversation, ctx, application.id);
    }
    if (positionFull.requireCv) {
      await askCv(conversation, ctx, application.id);
    }

    const submitted = await confirmAndSubmit(conversation, ctx, positionFull);
    if (!submitted) {
      ctx.session.applyState = undefined;
      await ctx.reply(ctx.t('apply-cancelled'), { reply_markup: mainMenuKeyboard(ctx) });
      return;
    }

    const finalApp = await conversation.external(() => submitApplication(application.id));

    await conversation.external(async () => {
      try {
        const pdfPath = await generateApplicationPdf(finalApp.id);
        await setApplicationFiles(finalApp.id, { pdfFilePath: pdfPath });
        await postApplicationToChannel(ctx.api, finalApp.id);
      } catch (err) {
        logger.error({ err, applicationId: finalApp.id }, 'PDF/channel post failed');
      }
    });

    ctx.session.applyState = undefined;
    await ctx.reply(ctx.t('apply-submitted', { ref: finalApp.refCode }), {
      parse_mode: 'HTML',
      reply_markup: mainMenuKeyboard(ctx),
    });
  } catch (err) {
    if ((err as Error).message === 'CANCEL') {
      ctx.session.applyState = undefined;
      await ctx.reply(ctx.t('apply-cancelled'), { reply_markup: mainMenuKeyboard(ctx) });
      return;
    }
    logger.error({ err }, 'questionnaire flow error');
    ctx.session.applyState = undefined;
    await ctx.reply(ctx.t('error-unknown'), { reply_markup: mainMenuKeyboard(ctx) });
  }
}

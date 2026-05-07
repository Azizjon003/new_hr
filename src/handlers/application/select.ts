import { Composer, InlineKeyboard } from 'grammy';
import { MyContext } from '../../types/context.js';
import { Lang } from '@prisma/client';
import {
  listActiveCompanies,
  listActiveDepartments,
  listActivePositions,
  getPositionWithRelations,
  getCompanyName,
  getDepartmentName,
  getPositionTitle,
  getPositionDescription,
  formatSalary,
} from '../../services/company.service.js';
import { logger } from '../../utils/logger.js';

export const selectComposer = new Composer<MyContext>();

const PER_PAGE = 8;

/**
 * Bitta xabarni edit qiladi. Agar saqlangan messageId mavjud bo'lsa — uni edit qiladi.
 * Edit muvaffaqiyatsiz bo'lsa — eski xabarni o'chirib, yangi yuboradi (chat tozaligi uchun).
 */
async function showScreen(
  ctx: MyContext,
  text: string,
  keyboard: InlineKeyboard,
): Promise<void> {
  const state = ctx.session.applyState ?? (ctx.session.applyState = {});
  const chatId = state.chatId ?? ctx.chat?.id ?? ctx.callbackQuery?.message?.chat.id;
  if (!chatId) {
    logger.error('No chatId — cannot show screen');
    return;
  }

  // 1. Saqlangan menu xabari bo'lsa — uni edit qilamiz (asosiy yo'l)
  if (state.messageId && state.chatId) {
    try {
      await ctx.api.editMessageText(state.chatId, state.messageId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
      logger.debug(
        { chatId: state.chatId, messageId: state.messageId },
        '✅ Menu edited (stored id)',
      );
      return;
    } catch (err) {
      const msg = (err as Error).message ?? '';
      // "message is not modified" — edit muvaffaqiyatli sanaymiz
      if (msg.includes('message is not modified')) {
        return;
      }
      logger.warn({ err: msg }, '⚠️  Edit failed (stored id) — will recreate');
      // Eski xabarni o'chirishga harakat qilamiz
      try {
        await ctx.api.deleteMessage(state.chatId, state.messageId);
      } catch {
        /* ignore */
      }
      state.messageId = undefined;
      state.chatId = undefined;
    }
  }

  // 2. Saqlanmagan, lekin callbackQuery bor — callbackdagi xabarni edit
  if (!state.messageId && ctx.callbackQuery?.message) {
    try {
      await ctx.api.editMessageText(
        ctx.callbackQuery.message.chat.id,
        ctx.callbackQuery.message.message_id,
        text,
        { parse_mode: 'HTML', reply_markup: keyboard },
      );
      state.messageId = ctx.callbackQuery.message.message_id;
      state.chatId = ctx.callbackQuery.message.chat.id;
      logger.debug({ messageId: state.messageId }, '✅ Menu edited (callback fallback)');
      return;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, '⚠️  Callback edit failed');
    }
  }

  // 3. Yangi xabar yuboramiz va ID ni saqlaymiz
  const sent = await ctx.api.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
  state.messageId = sent.message_id;
  state.chatId = sent.chat.id;
  logger.debug({ messageId: sent.message_id }, '📩 Menu sent (new)');
}

async function deleteMenuMsg(ctx: MyContext): Promise<void> {
  const state = ctx.session.applyState;
  if (state?.messageId && state.chatId) {
    try {
      await ctx.api.deleteMessage(state.chatId, state.messageId);
    } catch {
      /* ignore */
    }
    state.messageId = undefined;
    state.chatId = undefined;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ekranlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function showCompanyScreen(ctx: MyContext, page = 0): Promise<void> {
  const lang: Lang = ctx.dbUser?.lang ?? 'UZ';
  const companies = await listActiveCompanies();
  if (companies.length === 0) {
    await ctx.reply(ctx.t('apply-no-companies'));
    return;
  }

  const totalPages = Math.max(1, Math.ceil(companies.length / PER_PAGE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const slice = companies.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  const kb = new InlineKeyboard();
  for (const c of slice) {
    kb.text(getCompanyName(c, lang), `as:c:${c.id}`).row();
  }
  if (totalPages > 1) {
    if (safePage > 0) kb.text('⬅️', `as:cp:${safePage - 1}`);
    kb.text(`${safePage + 1}/${totalPages}`, 'noop');
    if (safePage < totalPages - 1) kb.text('➡️', `as:cp:${safePage + 1}`);
    kb.row();
  }
  kb.text(ctx.t('apply-cancel'), 'as:abort');

  await showScreen(ctx, ctx.t('apply-choose-company'), kb);
}

export async function showDepartmentScreen(ctx: MyContext, page = 0): Promise<void> {
  const lang: Lang = ctx.dbUser?.lang ?? 'UZ';
  const companyId = ctx.session.applyState?.companyId;
  if (!companyId) return showCompanyScreen(ctx);

  const depts = await listActiveDepartments(companyId);
  if (depts.length === 0) {
    const kb = new InlineKeyboard().text(ctx.t('apply-back'), 'as:back:c').row().text(ctx.t('apply-cancel'), 'as:abort');
    await showScreen(ctx, ctx.t('apply-no-departments'), kb);
    return;
  }

  const totalPages = Math.max(1, Math.ceil(depts.length / PER_PAGE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const slice = depts.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  const kb = new InlineKeyboard();
  for (const d of slice) {
    kb.text(getDepartmentName(d, lang), `as:d:${d.id}`).row();
  }
  if (totalPages > 1) {
    if (safePage > 0) kb.text('⬅️', `as:dp:${safePage - 1}`);
    kb.text(`${safePage + 1}/${totalPages}`, 'noop');
    if (safePage < totalPages - 1) kb.text('➡️', `as:dp:${safePage + 1}`);
    kb.row();
  }
  kb.text(ctx.t('apply-back'), 'as:back:c').text(ctx.t('apply-cancel'), 'as:abort');

  await showScreen(ctx, ctx.t('apply-choose-department'), kb);
}

export async function showPositionScreen(ctx: MyContext, page = 0): Promise<void> {
  const lang: Lang = ctx.dbUser?.lang ?? 'UZ';
  const departmentId = ctx.session.applyState?.departmentId;
  if (!departmentId) return showDepartmentScreen(ctx);

  const positions = await listActivePositions(departmentId);
  if (positions.length === 0) {
    const kb = new InlineKeyboard().text(ctx.t('apply-back'), 'as:back:d').row().text(ctx.t('apply-cancel'), 'as:abort');
    await showScreen(ctx, ctx.t('apply-no-positions'), kb);
    return;
  }

  const totalPages = Math.max(1, Math.ceil(positions.length / PER_PAGE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const slice = positions.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  const kb = new InlineKeyboard();
  for (const p of slice) {
    const star = p.isFeatured ? '⭐ ' : '';
    kb.text(star + getPositionTitle(p, lang), `as:p:${p.id}`).row();
  }
  if (totalPages > 1) {
    if (safePage > 0) kb.text('⬅️', `as:pp:${safePage - 1}`);
    kb.text(`${safePage + 1}/${totalPages}`, 'noop');
    if (safePage < totalPages - 1) kb.text('➡️', `as:pp:${safePage + 1}`);
    kb.row();
  }
  kb.text(ctx.t('apply-back'), 'as:back:d').text(ctx.t('apply-cancel'), 'as:abort');

  await showScreen(ctx, ctx.t('apply-choose-position'), kb);
}

export async function showPositionInfoScreen(ctx: MyContext): Promise<void> {
  const lang: Lang = ctx.dbUser?.lang ?? 'UZ';
  const positionId = ctx.session.applyState?.positionId;
  if (!positionId) return showPositionScreen(ctx);

  const pos = await getPositionWithRelations(positionId);
  if (!pos) return showPositionScreen(ctx);

  const text = ctx.t('apply-position-info', {
    title: getPositionTitle(pos, lang),
    description: getPositionDescription(pos, lang) || '—',
    salary: formatSalary(pos, lang),
    location: pos.location ?? '—',
    employment: ctx.t(`emp-${pos.employmentType}`),
    experience: ctx.t(`exp-${pos.experienceLevel}`),
  });

  const kb = new InlineKeyboard()
    .text(ctx.t('apply-position-start'), 'as:start')
    .row()
    .text(ctx.t('apply-back'), 'as:back:p')
    .text(ctx.t('apply-position-cancel'), 'as:abort');

  await showScreen(ctx, text, kb);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Callback handlerlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

selectComposer.callbackQuery(/^as:cp:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showCompanyScreen(ctx, Number(ctx.match![1]));
});

selectComposer.callbackQuery(/^as:c:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.applyState = { ...ctx.session.applyState, companyId: ctx.match![1], departmentId: undefined, positionId: undefined };
  await showDepartmentScreen(ctx);
});

selectComposer.callbackQuery(/^as:dp:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showDepartmentScreen(ctx, Number(ctx.match![1]));
});

selectComposer.callbackQuery(/^as:d:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.applyState = { ...ctx.session.applyState, departmentId: ctx.match![1], positionId: undefined };
  await showPositionScreen(ctx);
});

selectComposer.callbackQuery(/^as:pp:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showPositionScreen(ctx, Number(ctx.match![1]));
});

selectComposer.callbackQuery(/^as:p:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.applyState = { ...ctx.session.applyState, positionId: ctx.match![1] };
  await showPositionInfoScreen(ctx);
});

selectComposer.callbackQuery('as:back:c', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.applyState = { ...ctx.session.applyState, companyId: undefined, departmentId: undefined, positionId: undefined };
  await showCompanyScreen(ctx);
});

selectComposer.callbackQuery('as:back:d', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.applyState = { ...ctx.session.applyState, departmentId: undefined, positionId: undefined };
  await showDepartmentScreen(ctx);
});

selectComposer.callbackQuery('as:back:p', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.applyState = { ...ctx.session.applyState, positionId: undefined };
  await showPositionScreen(ctx);
});

selectComposer.callbackQuery('as:abort', async (ctx) => {
  await ctx.answerCallbackQuery();
  await deleteMenuMsg(ctx);
  ctx.session.applyState = undefined;
  const { mainMenuKeyboard } = await import('../../keyboards/main-menu.js');
  await ctx.reply(ctx.t('apply-cancelled'), { reply_markup: mainMenuKeyboard(ctx) });
});

// "Boshlash" — tanlangan menyu xabarini o'chiramiz va questionnaire ga o'tamiz
selectComposer.callbackQuery('as:start', async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.session.applyState?.positionId) {
    await ctx.reply(ctx.t('error-unknown'));
    return;
  }
  await deleteMenuMsg(ctx);
  await ctx.conversation.enter('apply-questionnaire');
});

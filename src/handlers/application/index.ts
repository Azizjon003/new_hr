import { Composer } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import { MyContext } from '../../types/context.js';
import { questionnaireConversation } from './flow.js';
import { selectComposer, showCompanyScreen } from './select.js';
import { findUserDraft } from '../../services/application.service.js';
import { isProfileComplete } from '../../services/user.service.js';
import { mainMenuKeyboard } from '../../keyboards/main-menu.js';
import { LABELS } from '../../keyboards/labels.js';

export const applyComposer = new Composer<MyContext>();

applyComposer.use(createConversation(questionnaireConversation, 'apply-questionnaire'));
applyComposer.use(selectComposer);

applyComposer.hears([...LABELS.apply], async (ctx) => {
  if (!ctx.dbUser) return;

  if (!ctx.dbUser.consentGivenAt) {
    const { showConsent } = await import('../start.js');
    await showConsent(ctx);
    return;
  }

  if (!isProfileComplete(ctx.dbUser)) {
    await ctx.reply(ctx.t('profile-empty'), {
      reply_markup: {
        inline_keyboard: [[{ text: ctx.t('profile-fill'), callback_data: 'profile:edit' }]],
      },
    });
    return;
  }

  // Draft borligini tekshirish
  const draft = await findUserDraft(ctx.dbUser.id);
  if (draft) {
    await ctx.reply(ctx.t('apply-draft-found'), {
      reply_markup: {
        inline_keyboard: [
          [{ text: ctx.t('apply-draft-continue'), callback_data: `apply:resume:${draft.id}` }],
          [{ text: ctx.t('apply-draft-restart'), callback_data: 'apply:restart' }],
        ],
      },
    });
    return;
  }

  // Yangi flow boshlash — eski orphan menu xabarini o'chiramiz
  const oldState = ctx.session.applyState;
  if (oldState?.messageId && oldState.chatId) {
    try {
      await ctx.api.deleteMessage(oldState.chatId, oldState.messageId);
    } catch {
      /* ignore */
    }
  }
  ctx.session.applyState = {};
  await showCompanyScreen(ctx);
});

applyComposer.callbackQuery('apply:restart', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.applyState = {};
  // Hozirgi xabarni edit qilamiz (draft savol xabari edi)
  await showCompanyScreen(ctx);
});

applyComposer.callbackQuery(/^apply:resume:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const { prisma } = await import('../../services/prisma.js');
  const draft = await prisma.application.findUnique({
    where: { id: ctx.match![1] },
    include: { position: { include: { department: true } } },
  });
  if (!draft) {
    await ctx.reply(ctx.t('error-unknown'));
    return;
  }
  // Draft state ni tiklab olib questionnaire ga o'tamiz
  ctx.session.applyState = {
    companyId: draft.position.department.companyId,
    departmentId: draft.position.departmentId,
    positionId: draft.positionId,
  };
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  } catch {
    /* ignore */
  }
  await ctx.conversation.enter('apply-questionnaire');
});

applyComposer.command('menu', async (ctx) => {
  ctx.session.applyState = undefined;
  await ctx.reply(ctx.t('menu-title'), { reply_markup: mainMenuKeyboard(ctx) });
});

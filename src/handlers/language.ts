import { Composer } from 'grammy';
import { MyContext } from '../types/context.js';
import { setUserLang } from '../services/user.service.js';
import { languageKeyboard } from '../keyboards/language.js';
import { mainMenuKeyboard } from '../keyboards/main-menu.js';
import { consentKeyboard } from '../keyboards/consent.js';
import { LABELS } from '../keyboards/labels.js';

export const languageComposer = new Composer<MyContext>();

// "🌐 Til/Язык" tugmasi
languageComposer.hears([...LABELS.language], async (ctx) => {
  await ctx.reply(ctx.t('choose-language'), { reply_markup: languageKeyboard() });
});

languageComposer.callbackQuery(/^lang:(UZ|RU)$/, async (ctx) => {
  if (!ctx.dbUser) return;
  const lang = ctx.match![1] as 'UZ' | 'RU';
  ctx.dbUser = await setUserLang(ctx.dbUser.id, lang);
  await ctx.i18n.renegotiateLocale();

  await ctx.answerCallbackQuery();
  try {
    await ctx.editMessageText(ctx.t('language-changed'));
  } catch {
    await ctx.reply(ctx.t('language-changed'));
  }

  // Birinchi marta — rozilik so'raladi
  if (!ctx.dbUser.consentGivenAt) {
    await ctx.reply(`${ctx.t('consent-title')}\n\n${ctx.t('consent-text')}`, {
      parse_mode: 'HTML',
      reply_markup: consentKeyboard(ctx),
    });
    return;
  }

  await ctx.reply(ctx.t('menu-title'), { reply_markup: mainMenuKeyboard(ctx) });
});

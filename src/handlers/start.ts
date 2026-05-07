import { Composer } from 'grammy';
import { MyContext } from '../types/context.js';
import { languageKeyboard } from '../keyboards/language.js';
import { mainMenuKeyboard } from '../keyboards/main-menu.js';
import { consentKeyboard } from '../keyboards/consent.js';
import { LABELS } from '../keyboards/labels.js';

export const startComposer = new Composer<MyContext>();

startComposer.command('start', async (ctx) => {
  const user = ctx.dbUser;
  if (!user) return;

  // Birinchi marta: tilni so'raymiz (yoki Telegram ko'rsatgan tilni qo'llaymiz)
  if (!user.consentGivenAt) {
    // Avval til
    await ctx.reply(ctx.t('choose-language'), { reply_markup: languageKeyboard() });
    return;
  }

  await ctx.reply(ctx.t('welcome'), { reply_markup: mainMenuKeyboard(ctx) });
});

startComposer.command('menu', async (ctx) => {
  await ctx.reply(ctx.t('menu-title'), { reply_markup: mainMenuKeyboard(ctx) });
});

// "ℹ️ Bot haqida" / "О боте"
startComposer.hears([...LABELS.about], async (ctx) => {
  await ctx.reply(ctx.t('about-text'), { parse_mode: 'HTML' });
});

// Rozilik tugmasi
startComposer.callbackQuery('consent:accept', async (ctx) => {
  if (!ctx.dbUser) return;
  if (ctx.dbUser.consentGivenAt) {
    await ctx.answerCallbackQuery({ text: ctx.t('consent-already') });
    return;
  }
  const { setUserConsent } = await import('../services/user.service.js');
  ctx.dbUser = await setUserConsent(ctx.dbUser.id);
  await ctx.answerCallbackQuery();
  try {
    await ctx.editMessageText(ctx.t('welcome'));
  } catch {
    /* nothing */
  }
  await ctx.reply(ctx.t('menu-title'), { reply_markup: mainMenuKeyboard(ctx) });
});

// "Bot haqida" tugma fallback (helper)
export async function showConsent(ctx: MyContext): Promise<void> {
  await ctx.reply(`${ctx.t('consent-title')}\n\n${ctx.t('consent-text')}`, {
    parse_mode: 'HTML',
    reply_markup: consentKeyboard(ctx),
  });
}

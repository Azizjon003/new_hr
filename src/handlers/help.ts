import { Composer } from 'grammy';
import { MyContext } from '../types/context.js';
import { LABELS } from '../keyboards/labels.js';

export const helpComposer = new Composer<MyContext>();

helpComposer.command('help', async (ctx) => {
  await ctx.reply(ctx.t('help-text'), { parse_mode: 'HTML' });
});

helpComposer.hears([...LABELS.help], async (ctx) => {
  await ctx.reply(ctx.t('help-text'), { parse_mode: 'HTML' });
});

helpComposer.command('cancel', async (ctx) => {
  ctx.session.applyState = undefined;
  ctx.session.profileEdit = undefined;
  await ctx.reply(ctx.t('cancelled'));
});

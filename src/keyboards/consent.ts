import { InlineKeyboard } from 'grammy';
import { MyContext } from '../types/context.js';

export function consentKeyboard(ctx: MyContext): InlineKeyboard {
  return new InlineKeyboard().text(ctx.t('consent-accept'), 'consent:accept');
}

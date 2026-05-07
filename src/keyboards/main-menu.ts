import { Keyboard } from 'grammy';
import { MyContext } from '../types/context.js';

export function mainMenuKeyboard(ctx: MyContext): Keyboard {
  return new Keyboard()
    .text(ctx.t('menu-apply'))
    .row()
    .text(ctx.t('menu-profile'))
    .text(ctx.t('menu-my-applications'))
    .row()
    .text(ctx.t('menu-language'))
    .text(ctx.t('menu-help'))
    .row()
    .text(ctx.t('menu-about'))
    .resized()
    .persistent();
}

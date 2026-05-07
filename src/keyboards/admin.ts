import { InlineKeyboard } from 'grammy';
import { MyContext } from '../types/context.js';

export function adminMainMenu(ctx: MyContext): InlineKeyboard {
  return new InlineKeyboard()
    .text(ctx.t('admin-menu-companies'), 'adm:companies')
    .text(ctx.t('admin-menu-applications'), 'adm:applications')
    .row()
    .text(ctx.t('admin-menu-stats'), 'adm:stats')
    .text(ctx.t('admin-menu-users'), 'adm:users')
    .row()
    .text(ctx.t('admin-menu-admins'), 'adm:admins')
    .text(ctx.t('admin-menu-trash'), 'adm:trash')
    .row()
    .text(ctx.t('admin-menu-log'), 'adm:log')
    .text(ctx.t('admin-menu-setup'), 'adm:setup');
}

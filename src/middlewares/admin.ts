import { NextFunction } from 'grammy';
import { MyContext } from '../types/context.js';

export async function requireAdmin(ctx: MyContext, next: NextFunction): Promise<void> {
  if (!ctx.isAdmin) {
    await ctx.reply(ctx.t('admin-only'));
    return;
  }
  await next();
}

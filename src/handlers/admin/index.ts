import { Composer } from 'grammy';
import { MyContext } from '../../types/context.js';
import { adminMainMenu } from '../../keyboards/admin.js';
import { requireAdmin } from '../../middlewares/admin.js';
import { adminCompaniesComposer } from './companies.js';
import { adminDepartmentsComposer } from './departments.js';
import { adminPositionsComposer } from './positions.js';
import { adminQuestionsComposer } from './questions.js';
import { adminApplicationsComposer } from './applications.js';
import { adminAppsScopedComposer } from './applications-scoped.js';
import { adminStatsComposer } from './stats.js';
import { adminAdminsComposer } from './admins.js';
import { adminTrashComposer } from './trash.js';
import { adminActionLogComposer } from './action-log.js';
import { adminUsersComposer } from './users.js';
import { adminSetupWizardComposer, suggestSetupIfEmpty } from './setup-wizard.js';

export const adminComposer = new Composer<MyContext>();
adminComposer.use(requireAdmin);

// Setup wizard birinchi bo'lib (conversation handlerini qo'shadi)
adminComposer.use(adminSetupWizardComposer);

adminComposer.use(adminCompaniesComposer);
adminComposer.use(adminDepartmentsComposer);
adminComposer.use(adminPositionsComposer);
adminComposer.use(adminQuestionsComposer);
adminComposer.use(adminApplicationsComposer);
adminComposer.use(adminAppsScopedComposer);
adminComposer.use(adminStatsComposer);
adminComposer.use(adminAdminsComposer);
adminComposer.use(adminTrashComposer);
adminComposer.use(adminActionLogComposer);
adminComposer.use(adminUsersComposer);

adminComposer.command('admin', async (ctx) => {
  // Agar kompaniya hali yo'q bo'lsa, setup wizard taklif qilamiz
  const suggested = await suggestSetupIfEmpty(ctx);
  if (suggested) return;

  await ctx.reply(ctx.t('admin-menu-title'), {
    parse_mode: 'HTML',
    reply_markup: adminMainMenu(ctx),
  });
});

adminComposer.callbackQuery('adm:back', async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    await ctx.editMessageText(ctx.t('admin-menu-title'), {
      parse_mode: 'HTML',
      reply_markup: adminMainMenu(ctx),
    });
  } catch {
    await ctx.reply(ctx.t('admin-menu-title'), {
      parse_mode: 'HTML',
      reply_markup: adminMainMenu(ctx),
    });
  }
});


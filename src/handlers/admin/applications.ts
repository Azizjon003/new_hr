import { Composer, InlineKeyboard, InputFile } from 'grammy';
import { AppStatus, Prisma } from '@prisma/client';
import { MyContext } from '../../types/context.js';
import { prisma } from '../../services/prisma.js';
import { changeStatus, getApplicationFull } from '../../services/application.service.js';
import { getCompanyName, getDepartmentName, getPositionTitle } from '../../services/company.service.js';
import { exportApplicationsToExcel } from '../../services/export.service.js';
import { generateApplicationsBatchPdf } from '../../services/pdf.service.js';
import { formatDate } from '../../utils/validators.js';
import { logger } from '../../utils/logger.js';

export const adminApplicationsComposer = new Composer<MyContext>();

const PAGE_SIZE = 10;

const STATUS_EMOJI: Record<AppStatus, string> = {
  PENDING: '⏳',
  VIEWED: '👁',
  ACCEPTED: '✅',
  REJECTED: '❌',
  WITHDRAWN: '↩️',
  DRAFT: '📝',
};

const FILTERS: Array<{ key: string; label: string; status: AppStatus | null }> = [
  { key: 'all', label: '📋 Hammasi', status: null },
  { key: 'PENDING', label: '⏳ Yangi', status: 'PENDING' },
  { key: 'VIEWED', label: '👁 Ko‘rilgan', status: 'VIEWED' },
  { key: 'ACCEPTED', label: '✅ Qabul', status: 'ACCEPTED' },
  { key: 'REJECTED', label: '❌ Rad', status: 'REJECTED' },
  { key: 'WITHDRAWN', label: '↩️ Qaytarib olingan', status: 'WITHDRAWN' },
];

function buildWhere(filterKey: string): Prisma.ApplicationWhereInput {
  const f = FILTERS.find((x) => x.key === filterKey);
  if (!f || f.status === null) {
    return { status: { not: 'DRAFT' } };
  }
  return { status: f.status };
}

async function showApplicationsList(
  ctx: MyContext,
  page = 0,
  filterKey = 'all',
): Promise<void> {
  const where = buildWhere(filterKey);
  const total = await prisma.application.count({ where });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);

  const apps = await prisma.application.findMany({
    where,
    include: {
      user: true,
      position: { include: { department: { include: { company: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    skip: safePage * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const lang = ctx.dbUser!.lang;
  const filterLabel = FILTERS.find((f) => f.key === filterKey)?.label ?? '📋 Hammasi';
  const lines = [
    `<b>📨 Arizalar</b>`,
    `Filter: ${filterLabel}  •  Jami: ${total}`,
    '',
  ];

  const kb = new InlineKeyboard();

  // Filter qatori (2 ta qatorga)
  for (let i = 0; i < FILTERS.length; i++) {
    const f = FILTERS[i];
    const active = f.key === filterKey ? '🔘 ' : '';
    kb.text(active + f.label, `app:f:${f.key}`);
    if (i === 2 || i === 5) kb.row();
  }
  kb.row();

  // Arizalar
  if (apps.length === 0) {
    lines.push('— Bu filterga mos arizalar yo‘q —');
  } else {
    for (const a of apps) {
      const emoji = STATUS_EMOJI[a.status];
      const title = `${emoji} ${a.refCode} · ${getPositionTitle(a.position, lang)}`;
      kb.text(title, `app:open:${a.id}`).row();
    }
  }

  // Pagination
  if (totalPages > 1) {
    if (safePage > 0) kb.text('⬅️', `app:list:${safePage - 1}:${filterKey}`);
    kb.text(`${safePage + 1}/${totalPages}`, 'noop');
    if (safePage < totalPages - 1) kb.text('➡️', `app:list:${safePage + 1}:${filterKey}`);
    kb.row();
  }
  kb.text(`📊 Excel`, `app:export:${filterKey}`)
    .text(`📄 PDF`, `app:pdf:${filterKey}`)
    .row();
  kb.text('⬅️ Orqaga', 'adm:back');

  try {
    await ctx.editMessageText(lines.join('\n'), { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', reply_markup: kb });
  }
}

adminApplicationsComposer.callbackQuery('adm:applications', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showApplicationsList(ctx, 0, 'all');
});

// Filter tugmasi
adminApplicationsComposer.callbackQuery(/^app:f:(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showApplicationsList(ctx, 0, ctx.match![1]);
});

// Sahifa: yangi format `app:list:<page>:<filter>` + eski `app:list:<page>` (backward compat)
adminApplicationsComposer.callbackQuery(/^app:list:(\d+)(?::(\w+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const page = Number(ctx.match![1]);
  const filter = ctx.match![2] ?? 'all';
  await showApplicationsList(ctx, page, filter);
});

adminApplicationsComposer.callbackQuery(/^app:open:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match![1];
  const app = await getApplicationFull(id);
  if (!app) {
    await ctx.reply('Topilmadi');
    return;
  }
  const lang = ctx.dbUser!.lang;
  const text = [
    `<b>📨 Ariza ${app.refCode}</b>`,
    `Status: ${app.status}`,
    '',
    `🏢 ${getCompanyName(app.position.department.company, lang)}`,
    `🗂 ${getDepartmentName(app.position.department, lang)}`,
    `💼 ${getPositionTitle(app.position, lang)}`,
    '',
    `👤 <b>${app.user.profileFullName ?? '-'}</b>`,
    `📞 ${app.user.profilePhone ?? '-'}`,
    app.user.profileEmail ? `📧 ${app.user.profileEmail}` : '',
    app.user.username ? `💬 @${app.user.username}` : '',
    `📅 ${formatDate(app.submittedAt ?? app.createdAt)}`,
    '',
    `📋 Javoblar: ${app.answers.length}`,
  ]
    .filter(Boolean)
    .join('\n');

  const kb = new InlineKeyboard()
    .text('👁 Ko‘rildi', `app:viewed:${app.id}`)
    .row()
    .text('✅ Qabul', `app:accept:${app.id}`)
    .text('❌ Rad', `app:reject:${app.id}`)
    .row()
    .text('⬅️ Orqaga', 'adm:applications');

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
});

async function handleStatusChange(
  ctx: MyContext,
  applicationId: string,
  toStatus: AppStatus,
): Promise<void> {
  if (!ctx.dbUser) return;
  try {
    const updated = await changeStatus(applicationId, toStatus, ctx.dbUser.id);
    await ctx.answerCallbackQuery({ text: `✅ ${toStatus}` });

    // Foydalanuvchiga xabar
    const app = await getApplicationFull(applicationId);
    if (app) {
      const userLang = app.user.lang;
      const statusKey = `my-apps-status-${toStatus}`;
      const msg =
        userLang === 'RU'
          ? `📬 Статус вашей заявки <code>${app.refCode}</code> изменён: ${ctx.t(statusKey)}`
          : `📬 Arizangiz holati o‘zgardi <code>${app.refCode}</code>: ${ctx.t(statusKey)}`;
      try {
        await ctx.api.sendMessage(Number(app.user.telegramId), msg, { parse_mode: 'HTML' });
      } catch (err) {
        logger.warn({ err }, 'Failed to notify user about status change');
      }
    }

    void updated;
  } catch (err) {
    logger.error({ err, applicationId }, 'Failed to change application status');
    await ctx.answerCallbackQuery({ text: '⚠️ Xatolik' });
  }
}

adminApplicationsComposer.callbackQuery(/^app:viewed:(.+)$/, (ctx) => handleStatusChange(ctx, ctx.match![1], 'VIEWED'));
adminApplicationsComposer.callbackQuery(/^app:accept:(.+)$/, (ctx) => handleStatusChange(ctx, ctx.match![1], 'ACCEPTED'));
adminApplicationsComposer.callbackQuery(/^app:reject:(.+)$/, (ctx) => handleStatusChange(ctx, ctx.match![1], 'REJECTED'));

adminApplicationsComposer.callbackQuery(/^app:export(?::(\w+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ Tayyorlanmoqda...' });
  const filterKey = ctx.match![1] ?? 'all';
  const f = FILTERS.find((x) => x.key === filterKey);
  const filterLabel = f?.label ?? '📋 Hammasi';
  try {
    const filePath = await exportApplicationsToExcel(
      f?.status ? { status: f.status } : {},
    );
    await ctx.replyWithDocument(new InputFile(filePath), {
      caption: `📊 Arizalar — ${filterLabel}`,
    });
  } catch (err) {
    logger.error({ err }, 'Excel export failed');
    await ctx.reply('❌ Excel yaratib bo‘lmadi.');
  }
});

adminApplicationsComposer.callbackQuery(/^app:pdf(?::(\w+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ PDF yaratilyapti...' });
  const filterKey = ctx.match![1] ?? 'all';
  const f = FILTERS.find((x) => x.key === filterKey);
  const filterLabel = f?.label ?? '📋 Hammasi';
  const where: Prisma.ApplicationWhereInput = f?.status
    ? { status: f.status }
    : { status: { not: 'DRAFT' } };
  try {
    const { path: filePath, count } = await generateApplicationsBatchPdf(where);
    await ctx.replyWithDocument(new InputFile(filePath), {
      caption: `📄 Arizalar PDF (${count} ta) — ${filterLabel}`,
    });
  } catch (err) {
    logger.error({ err }, 'Batch PDF failed');
    const msg = (err as Error).message ?? '';
    if (msg.includes('No applications')) {
      await ctx.reply('⚠️ Arizalar yo‘q.');
    } else {
      await ctx.reply('❌ PDF yaratib bo‘lmadi.');
    }
  }
});

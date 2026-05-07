import fs from 'node:fs';
import { Composer, InlineKeyboard, InputFile } from 'grammy';
import { AppStatus, Prisma, QuestionType } from '@prisma/client';
import { MyContext } from '../types/context.js';
import { withdrawApplication, getApplicationFull } from '../services/application.service.js';
import {
  getCompanyName,
  getDepartmentName,
  getPositionTitle,
} from '../services/company.service.js';
import { generateApplicationPdf } from '../services/pdf.service.js';
import { prisma } from '../services/prisma.js';
import { formatDate } from '../utils/validators.js';
import { LABELS } from '../keyboards/labels.js';
import { logger } from '../utils/logger.js';

export const myAppsComposer = new Composer<MyContext>();

const PAGE_SIZE = 8;

const STATUS_EMOJI: Record<AppStatus, string> = {
  PENDING: '⏳',
  VIEWED: '👁',
  ACCEPTED: '✅',
  REJECTED: '❌',
  WITHDRAWN: '↩️',
  DRAFT: '📝',
};

const FILTER_KEYS: Array<{ key: string; status: AppStatus | null; tKey: string }> = [
  { key: 'all', status: null, tKey: 'my-apps-filter-all' },
  { key: 'PENDING', status: 'PENDING', tKey: 'my-apps-status-PENDING' },
  { key: 'VIEWED', status: 'VIEWED', tKey: 'my-apps-status-VIEWED' },
  { key: 'ACCEPTED', status: 'ACCEPTED', tKey: 'my-apps-status-ACCEPTED' },
  { key: 'REJECTED', status: 'REJECTED', tKey: 'my-apps-status-REJECTED' },
  { key: 'WITHDRAWN', status: 'WITHDRAWN', tKey: 'my-apps-status-WITHDRAWN' },
];

function buildWhere(userId: string, filterKey: string): Prisma.ApplicationWhereInput {
  const f = FILTER_KEYS.find((x) => x.key === filterKey);
  if (!f || f.status === null) {
    return { userId, status: { not: 'DRAFT' } };
  }
  return { userId, status: f.status };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ro'yxat — filter + pagination
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function showMyAppsList(
  ctx: MyContext,
  page = 0,
  filterKey = 'all',
  opts: { sendNew?: boolean } = {},
): Promise<void> {
  if (!ctx.dbUser) return;
  const lang = ctx.dbUser.lang;
  const where = buildWhere(ctx.dbUser.id, filterKey);

  const total = await prisma.application.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);

  const apps = await prisma.application.findMany({
    where,
    include: {
      position: { include: { department: { include: { company: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    skip: safePage * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const filterDef = FILTER_KEYS.find((f) => f.key === filterKey) ?? FILTER_KEYS[0];
  const filterLabel = ctx.t(filterDef.tKey);

  const lines = [ctx.t('my-apps-title'), '', `🔍 ${filterLabel}  •  ${total}`];

  const kb = new InlineKeyboard();

  // Filter qatorlari
  for (let i = 0; i < FILTER_KEYS.length; i++) {
    const f = FILTER_KEYS[i];
    const active = f.key === filterKey ? '🔘 ' : '';
    kb.text(active + ctx.t(f.tKey), `my:f:${f.key}`);
    if (i === 2 || i === 5) kb.row();
  }
  kb.row();

  if (apps.length === 0) {
    lines.push('', `— ${ctx.t('my-apps-empty-filter')} —`);
  } else {
    for (const a of apps) {
      const emoji = STATUS_EMOJI[a.status];
      const title = `${emoji} ${a.refCode} · ${getPositionTitle(a.position, lang)}`;
      kb.text(title, `my:open:${a.id}`).row();
    }
  }

  if (totalPages > 1) {
    if (safePage > 0) kb.text('⬅️', `my:list:${safePage - 1}:${filterKey}`);
    kb.text(ctx.t('my-apps-page', { current: safePage + 1, total: totalPages }), 'noop');
    if (safePage < totalPages - 1) kb.text('➡️', `my:list:${safePage + 1}:${filterKey}`);
    kb.row();
  }

  const text = lines.join('\n');
  if (opts.sendNew) {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
    return;
  }
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Ariza tafsiloti — savol-javoblar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function answerToText(
  type: QuestionType,
  ans: {
    valueText: string | null;
    valueNumber: number | null;
    valueDate: Date | null;
    valueJson: unknown;
    filePath: string | null;
  },
  lang: 'UZ' | 'RU',
): string {
  switch (type) {
    case 'TEXT':
    case 'LONG_TEXT':
    case 'PHONE':
    case 'EMAIL':
      return ans.valueText ?? '—';
    case 'NUMBER':
      return ans.valueNumber != null ? String(ans.valueNumber) : '—';
    case 'DATE':
      return ans.valueDate ? formatDate(ans.valueDate) : '—';
    case 'BOOLEAN':
      return ans.valueText === 'true'
        ? lang === 'RU'
          ? 'Да'
          : 'Ha'
        : lang === 'RU'
          ? 'Нет'
          : "Yo'q";
    case 'SINGLE_CHOICE':
      return ans.valueText ?? '—';
    case 'MULTI_CHOICE':
      return Array.isArray(ans.valueJson) ? (ans.valueJson as string[]).join(', ') : '—';
    case 'FILE':
    case 'PHOTO':
      return ans.filePath ? '📎 (fayl)' : '—';
    case 'LOCATION':
      if (ans.valueJson && typeof ans.valueJson === 'object') {
        const v = ans.valueJson as { latitude?: number; longitude?: number };
        return `📍 ${v.latitude}, ${v.longitude}`;
      }
      return '—';
    default:
      return '—';
  }
}

async function showMyAppDetail(ctx: MyContext, appId: string): Promise<void> {
  if (!ctx.dbUser) return;
  const lang = ctx.dbUser.lang;

  const app = await getApplicationFull(appId);
  if (!app || app.userId !== ctx.dbUser.id) {
    await ctx.reply(ctx.t('error-unknown'));
    return;
  }

  const lines = [
    `<b>${ctx.t('my-apps-detail-title')}</b>`,
    `🆔 <code>${app.refCode}</code>`,
    '',
    `🏢 <b>${getCompanyName(app.position.department.company, lang)}</b>`,
    `🗂 ${getDepartmentName(app.position.department, lang)}`,
    `💼 ${getPositionTitle(app.position, lang)}`,
    '',
    `${STATUS_EMOJI[app.status]} ${ctx.t('my-apps-status-label')}: ${ctx.t(`my-apps-status-${app.status}`)}`,
    `📅 ${ctx.t('my-apps-submitted')}: ${formatDate(app.submittedAt ?? app.createdAt)}`,
  ];

  if (app.position.questions.length > 0) {
    lines.push('', `<b>${ctx.t('my-apps-answers-label')}:</b>`);
    for (let i = 0; i < app.position.questions.length; i++) {
      const q = app.position.questions[i];
      const a = app.answers.find((x) => x.questionId === q.id);
      const qText = lang === 'RU' ? q.textRu : q.textUz;
      const value = a ? answerToText(q.type, a, lang) : '—';
      lines.push('', `<i>${i + 1}. ${qText}</i>`, value);
    }
  }

  // Tugmalar
  const kb = new InlineKeyboard();
  kb.text(ctx.t('my-apps-pdf'), `my:pdf:${app.id}`).row();

  // Qaytarib olish — faqat PENDING va 24 soat ichida
  if (
    app.status === 'PENDING' &&
    app.submittedAt &&
    Date.now() - app.submittedAt.getTime() < 24 * 60 * 60 * 1000
  ) {
    kb.text(ctx.t('my-apps-withdraw'), `my:withdraw:${app.id}`).row();
  }

  kb.text('⬅️ ' + ctx.t('back'), 'my:back');

  const text = lines.join('\n');
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Callback handlerlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

myAppsComposer.hears([...LABELS.myApplications], async (ctx) => {
  if (!ctx.dbUser) return;
  // Yangi xabar yuboriladi (chunki text message orqali kirildi)
  await showMyAppsList(ctx, 0, 'all', { sendNew: true });
});

myAppsComposer.callbackQuery(/^my:f:(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showMyAppsList(ctx, 0, ctx.match![1]);
});

myAppsComposer.callbackQuery(/^my:list:(\d+)(?::(\w+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const page = Number(ctx.match![1]);
  const filter = ctx.match![2] ?? 'all';
  await showMyAppsList(ctx, page, filter);
});

myAppsComposer.callbackQuery(/^my:open:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showMyAppDetail(ctx, ctx.match![1]);
});

myAppsComposer.callbackQuery('my:back', async (ctx) => {
  await ctx.answerCallbackQuery();
  await showMyAppsList(ctx, 0, 'all');
});

myAppsComposer.callbackQuery(/^my:pdf:(.+)$/, async (ctx) => {
  if (!ctx.dbUser) return;
  await ctx.answerCallbackQuery({ text: '⏳' });
  const appId = ctx.match![1];
  const app = await prisma.application.findUnique({ where: { id: appId } });
  if (!app || app.userId !== ctx.dbUser.id) {
    await ctx.reply(ctx.t('error-unknown'));
    return;
  }

  let pdfPath = app.pdfFilePath;
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    try {
      pdfPath = await generateApplicationPdf(appId);
      await prisma.application.update({ where: { id: appId }, data: { pdfFilePath: pdfPath } });
    } catch (err) {
      logger.error({ err, appId }, 'Failed to generate user PDF');
      await ctx.reply(ctx.t('my-apps-no-pdf'));
      return;
    }
  }

  try {
    await ctx.replyWithDocument(new InputFile(pdfPath), {
      caption: `📄 ${app.refCode}`,
    });
  } catch (err) {
    logger.error({ err, appId }, 'Failed to send PDF to user');
    await ctx.reply(ctx.t('my-apps-no-pdf'));
  }
});

myAppsComposer.callbackQuery(/^my:withdraw:(.+)$/, async (ctx) => {
  if (!ctx.dbUser) return;
  const id = ctx.match![1];
  const result = await withdrawApplication(id, ctx.dbUser.id);
  await ctx.answerCallbackQuery({
    text: result ? ctx.t('my-apps-withdrawn') : ctx.t('error-unknown'),
    show_alert: true,
  });
  if (result) {
    await showMyAppDetail(ctx, id);
  }
});

import { Composer, InlineKeyboard, InputFile } from 'grammy';
import { AppStatus, Prisma } from '@prisma/client';
import { MyContext } from '../../types/context.js';
import { prisma } from '../../services/prisma.js';
import { getPositionTitle } from '../../services/company.service.js';
import { exportApplicationsToExcel, type ExportFilter } from '../../services/export.service.js';
import { generateApplicationsBatchPdf } from '../../services/pdf.service.js';
import { logger } from '../../utils/logger.js';

export const adminAppsScopedComposer = new Composer<MyContext>();

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
  { key: 'WITHDRAWN', label: '↩️ Qaytarib', status: 'WITHDRAWN' },
];

type Scope = 'c' | 'd' | 'p';

function buildWhere(scope: Scope, scopeId: string, filterKey: string): Prisma.ApplicationWhereInput {
  const where: Prisma.ApplicationWhereInput = { status: { not: 'DRAFT' } };
  if (scope === 'c') {
    where.position = { department: { companyId: scopeId } };
  } else if (scope === 'd') {
    where.position = { departmentId: scopeId };
  } else if (scope === 'p') {
    where.positionId = scopeId;
  }
  const f = FILTERS.find((x) => x.key === filterKey);
  if (f?.status) where.status = f.status;
  return where;
}

function buildExportFilter(scope: Scope, scopeId: string, filterKey: string): ExportFilter {
  const f: ExportFilter = {};
  if (scope === 'c') f.companyId = scopeId;
  else if (scope === 'd') f.departmentId = scopeId;
  else if (scope === 'p') f.positionId = scopeId;
  const fk = FILTERS.find((x) => x.key === filterKey);
  if (fk?.status) f.status = fk.status;
  return f;
}

async function getScopeTitle(scope: Scope, scopeId: string, lang: 'UZ' | 'RU'): Promise<string> {
  if (scope === 'c') {
    const c = await prisma.company.findUnique({ where: { id: scopeId } });
    return c ? `🏢 ${lang === 'RU' ? c.nameRu : c.nameUz}` : '🏢 ???';
  }
  if (scope === 'd') {
    const d = await prisma.department.findUnique({
      where: { id: scopeId },
      include: { company: true },
    });
    return d
      ? `🏢 ${lang === 'RU' ? d.company.nameRu : d.company.nameUz} → 🗂 ${lang === 'RU' ? d.nameRu : d.nameUz}`
      : '🗂 ???';
  }
  const p = await prisma.position.findUnique({
    where: { id: scopeId },
    include: { department: { include: { company: true } } },
  });
  return p
    ? `🏢 ${lang === 'RU' ? p.department.company.nameRu : p.department.company.nameUz} → 🗂 ${
        lang === 'RU' ? p.department.nameRu : p.department.nameUz
      } → 💼 ${lang === 'RU' ? p.titleRu : p.titleUz}`
    : '💼 ???';
}

function backCallback(scope: Scope, scopeId: string): string {
  if (scope === 'c') return `cm:show:${scopeId}`;
  if (scope === 'd') return `dm:show:${scopeId}`;
  return `pm:show:${scopeId}`;
}

async function showScopedApplications(
  ctx: MyContext,
  scope: Scope,
  scopeId: string,
  page = 0,
  filterKey = 'all',
): Promise<void> {
  const lang = ctx.dbUser!.lang;
  const where = buildWhere(scope, scopeId, filterKey);
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

  const scopeTitle = await getScopeTitle(scope, scopeId, lang);
  const filterLabel = FILTERS.find((f) => f.key === filterKey)?.label ?? '📋';

  // Status bo'yicha qisqa hisobot (joriy scope ichida)
  const statusCounts = await prisma.application.groupBy({
    by: ['status'],
    where: buildWhere(scope, scopeId, 'all'),
    _count: true,
  });
  const countMap = new Map(statusCounts.map((s) => [s.status, s._count]));
  const statsLine =
    `⏳ ${countMap.get('PENDING') ?? 0}  ` +
    `👁 ${countMap.get('VIEWED') ?? 0}  ` +
    `✅ ${countMap.get('ACCEPTED') ?? 0}  ` +
    `❌ ${countMap.get('REJECTED') ?? 0}  ` +
    `↩️ ${countMap.get('WITHDRAWN') ?? 0}`;

  const lines = [
    `<b>📨 Arizalar</b>`,
    scopeTitle,
    '',
    `📊 ${statsLine}`,
    `🔍 ${filterLabel}  •  ${total}`,
  ];

  const kb = new InlineKeyboard();

  // Filter qatori
  for (let i = 0; i < FILTERS.length; i++) {
    const f = FILTERS[i];
    const active = f.key === filterKey ? '🔘 ' : '';
    kb.text(active + f.label, `aps:f:${scope}:${scopeId}:${f.key}`);
    if (i === 2 || i === 5) kb.row();
  }
  kb.row();

  if (apps.length === 0) {
    lines.push('', '— Bu filterga mos arizalar yo‘q —');
  } else {
    for (const a of apps) {
      const emoji = STATUS_EMOJI[a.status];
      const title = `${emoji} ${a.refCode} · ${getPositionTitle(a.position, lang)}`;
      kb.text(title, `app:open:${a.id}`).row();
    }
  }

  if (totalPages > 1) {
    if (safePage > 0)
      kb.text('⬅️', `aps:list:${scope}:${scopeId}:${safePage - 1}:${filterKey}`);
    kb.text(`${safePage + 1}/${totalPages}`, 'noop');
    if (safePage < totalPages - 1)
      kb.text('➡️', `aps:list:${scope}:${scopeId}:${safePage + 1}:${filterKey}`);
    kb.row();
  }

  kb.text('📊 Excel', `aps:xlsx:${scope}:${scopeId}:${filterKey}`)
    .text('📄 PDF', `aps:pdf:${scope}:${scopeId}:${filterKey}`)
    .row();
  kb.text('⬅️ Orqaga', backCallback(scope, scopeId));

  const text = lines.join('\n');
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: kb });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Callbacks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// `aps:open:<scope>:<scopeId>` — boshlang'ich
adminAppsScopedComposer.callbackQuery(/^aps:open:([cdp]):([^:]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showScopedApplications(ctx, ctx.match![1] as Scope, ctx.match![2], 0, 'all');
});

// `aps:f:<scope>:<scopeId>:<filter>`
adminAppsScopedComposer.callbackQuery(/^aps:f:([cdp]):([^:]+):(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showScopedApplications(ctx, ctx.match![1] as Scope, ctx.match![2], 0, ctx.match![3]);
});

// `aps:list:<scope>:<scopeId>:<page>:<filter>`
adminAppsScopedComposer.callbackQuery(/^aps:list:([cdp]):([^:]+):(\d+):(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showScopedApplications(
    ctx,
    ctx.match![1] as Scope,
    ctx.match![2],
    Number(ctx.match![3]),
    ctx.match![4],
  );
});

// `aps:xlsx:<scope>:<scopeId>:<filter>` — Excel eksport
adminAppsScopedComposer.callbackQuery(/^aps:xlsx:([cdp]):([^:]+):(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ Tayyorlanmoqda...' });
  const scope = ctx.match![1] as Scope;
  const scopeId = ctx.match![2];
  const filterKey = ctx.match![3];
  try {
    const filePath = await exportApplicationsToExcel(buildExportFilter(scope, scopeId, filterKey));
    const lang = ctx.dbUser!.lang;
    const title = await getScopeTitle(scope, scopeId, lang);
    await ctx.replyWithDocument(new InputFile(filePath), {
      caption: `📊 Hisobot\n${title}`,
      parse_mode: 'HTML',
    });
  } catch (err) {
    logger.error({ err, scope, scopeId }, 'Scoped Excel export failed');
    await ctx.reply('❌ Excel yaratib bo‘lmadi.');
  }
});

// `aps:pdf:<scope>:<scopeId>:<filter>` — Batch PDF
adminAppsScopedComposer.callbackQuery(/^aps:pdf:([cdp]):([^:]+):(\w+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '⏳ PDF yaratilyapti...' });
  const scope = ctx.match![1] as Scope;
  const scopeId = ctx.match![2];
  const filterKey = ctx.match![3];
  try {
    const { path: filePath, count } = await generateApplicationsBatchPdf(
      buildWhere(scope, scopeId, filterKey),
    );
    const lang = ctx.dbUser!.lang;
    const title = await getScopeTitle(scope, scopeId, lang);
    await ctx.replyWithDocument(new InputFile(filePath), {
      caption: `📄 Arizalar PDF (${count} ta)\n${title}`,
      parse_mode: 'HTML',
    });
  } catch (err) {
    logger.error({ err, scope, scopeId }, 'Scoped batch PDF failed');
    const msg = (err as Error).message ?? '';
    if (msg.includes('No applications')) {
      await ctx.reply('⚠️ Arizalar yo‘q.');
    } else {
      await ctx.reply('❌ PDF yaratib bo‘lmadi.');
    }
  }
});

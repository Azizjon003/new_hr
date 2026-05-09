import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { Lang, Prisma, QuestionType } from '@prisma/client';
import { FILES } from '../utils/files.js';
import { logger } from '../utils/logger.js';
import { formatDate } from '../utils/validators.js';
import { getApplicationFull } from './application.service.js';
import {
  getCompanyName,
  getDepartmentName,
  getPositionTitle,
} from './company.service.js';
import { prisma } from './prisma.js';

const requireCjs = createRequire(import.meta.url);
const vfs: Record<string, string> = requireCjs('pdfmake/build/vfs_fonts.js');

function fontBuffer(name: string): Buffer {
  const b64 = vfs[name];
  if (!b64) throw new Error(`Font not found in pdfmake vfs: ${name}`);
  return Buffer.from(b64, 'base64');
}

const fonts = {
  Roboto: {
    normal: fontBuffer('Roboto-Regular.ttf'),
    bold: fontBuffer('Roboto-Medium.ttf'),
    italics: fontBuffer('Roboto-Italic.ttf'),
    bolditalics: fontBuffer('Roboto-MediumItalic.ttf'),
  },
};

const printer = new PdfPrinter(fonts);

export async function closeBrowser(): Promise<void> {
  /* no-op */
}

function answerToText(
  type: QuestionType,
  ans: {
    valueText: string | null;
    valueNumber: number | null;
    valueDate: Date | null;
    valueJson: unknown;
    filePath: string | null;
  },
  lang: Lang,
): string {
  switch (type) {
    case 'TEXT':
    case 'LONG_TEXT':
    case 'PHONE':
    case 'EMAIL':
      return ans.valueText ?? '';
    case 'NUMBER':
      return ans.valueNumber != null ? String(ans.valueNumber) : '';
    case 'DATE':
      return ans.valueDate ? formatDate(ans.valueDate) : '';
    case 'BOOLEAN':
      return ans.valueText === 'true'
        ? lang === 'RU'
          ? 'Да'
          : 'Ha'
        : lang === 'RU'
          ? 'Нет'
          : "Yo'q";
    case 'SINGLE_CHOICE':
      return ans.valueText ?? '';
    case 'MULTI_CHOICE':
      if (Array.isArray(ans.valueJson)) return (ans.valueJson as string[]).join(', ');
      return '';
    case 'FILE':
    case 'PHOTO':
      return ans.filePath ? path.basename(ans.filePath) : '';
    case 'LOCATION':
      if (ans.valueJson && typeof ans.valueJson === 'object') {
        const v = ans.valueJson as { latitude?: number; longitude?: number };
        return `${v.latitude}, ${v.longitude}`;
      }
      return '';
    default:
      return '';
  }
}

function questionText(q: { textUz: string; textRu: string }, lang: Lang): string {
  return lang === 'RU' ? q.textRu : q.textUz;
}

function imageToDataUri(filePath: string): string | null {
  try {
    const buf = fs.readFileSync(filePath);
    const ext = (path.extname(filePath).toLowerCase().replace('.', '') || 'jpeg').replace(
      'jpg',
      'jpeg',
    );
    const mime = ext === 'png' ? 'png' : 'jpeg';
    return `data:image/${mime};base64,${buf.toString('base64')}`;
  } catch (err) {
    logger.warn({ err, file: filePath }, 'Failed to read image');
    return null;
  }
}

const STR = {
  uz: {
    title: 'Anketa',
    candidate: 'Nomzod',
    fullName: 'F.I.O.',
    phone: 'Telefon',
    birthDate: "Tug'ilgan sana",
    email: 'Email',
    city: 'Shahar',
    telegram: 'Telegram',
    company: 'Kompaniya',
    department: "Bo'lim",
    position: 'Lavozim',
    answers: 'Javoblar',
    submitted: 'Topshirilgan',
    refCode: 'Ariza raqami',
    photo: 'Rasm',
    notSet: '—',
  },
  ru: {
    title: 'Анкета',
    candidate: 'Кандидат',
    fullName: 'ФИО',
    phone: 'Телефон',
    birthDate: 'Дата рождения',
    email: 'Email',
    city: 'Город',
    telegram: 'Telegram',
    company: 'Компания',
    department: 'Отдел',
    position: 'Должность',
    answers: 'Ответы',
    submitted: 'Отправлено',
    refCode: 'Номер заявки',
    photo: 'Фото',
    notSet: '—',
  },
};

const STYLES: TDocumentDefinitions['styles'] = {
  pageTitle: { fontSize: 22, bold: true, color: '#2563eb' },
  subTitle: { fontSize: 10, color: '#555555' },
  refCode: { fontSize: 10, color: '#1e40af', bold: true },
  small: { fontSize: 9, color: '#64748b' },
  sectionTitle: {
    fontSize: 12,
    bold: true,
    color: '#1e40af',
    margin: [0, 4, 0, 6],
  },
  positionName: { fontSize: 13, bold: true, color: '#0f172a', margin: [0, 0, 0, 2] },
  kvKey: { color: '#555555', bold: true },
  qLabel: { color: '#334155', bold: true, fontSize: 10 },
  qValue: { color: '#0f172a', fontSize: 10 },
};

const DEFAULT_STYLE = { font: 'Roboto', fontSize: 10, lineHeight: 1.3, color: '#1a1a1a' };

type AppFull = NonNullable<Awaited<ReturnType<typeof getApplicationFull>>>;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Per-application content (umumiy helper)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildAppContent(app: AppFull, options: { pageBreakBefore?: boolean } = {}): Content[] {
  const lang = app.user.lang;
  const t = lang === 'RU' ? STR.ru : STR.uz;
  const company = app.position.department.company;
  const refRow = formatDate(app.submittedAt ?? app.createdAt);

  const profileTable: Content = {
    table: {
      widths: [120, '*'],
      body: [
        [{ text: t.fullName, style: 'kvKey' }, app.user.profileFullName ?? t.notSet],
        [{ text: t.phone, style: 'kvKey' }, app.user.profilePhone ?? t.notSet],
        [
          { text: t.birthDate, style: 'kvKey' },
          app.user.profileBirthDate ? formatDate(app.user.profileBirthDate) : t.notSet,
        ],
        [{ text: t.email, style: 'kvKey' }, app.user.profileEmail ?? t.notSet],
        [{ text: t.city, style: 'kvKey' }, app.user.profileCity ?? t.notSet],
        [
          { text: t.telegram, style: 'kvKey' },
          `${app.user.username ? '@' + app.user.username : t.notSet} (ID: ${app.user.telegramId.toString()})`,
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#e2e8f0',
    },
    margin: [0, 0, 0, 12],
  };

  let primaryPhotoUri: string | null = null;
  let primaryPhotoQuestionId: string | null = null;
  if (app.photoFilePath && fs.existsSync(app.photoFilePath)) {
    primaryPhotoUri = imageToDataUri(app.photoFilePath);
  }
  if (!primaryPhotoUri) {
    for (const q of app.position.questions) {
      if (q.type === 'PHOTO') {
        const a = app.answers.find((x) => x.questionId === q.id);
        if (a?.filePath && fs.existsSync(a.filePath)) {
          primaryPhotoUri = imageToDataUri(a.filePath);
          if (primaryPhotoUri) {
            primaryPhotoQuestionId = q.id;
            break;
          }
        }
      }
    }
  }
  const photoBlock: Content | null = primaryPhotoUri
    ? { image: primaryPhotoUri, fit: [140, 170], alignment: 'center' }
    : null;

  const answersContent: Content[] = [];
  for (let i = 0; i < app.position.questions.length; i++) {
    const q = app.position.questions[i];
    const a = app.answers.find((x) => x.questionId === q.id);
    const stackItems: Content[] = [
      { text: `${i + 1}. ${questionText(q, lang)}`, style: 'qLabel' },
    ];
    if (q.type === 'PHOTO' && a?.filePath && fs.existsSync(a.filePath)) {
      if (q.id === primaryPhotoQuestionId) {
        stackItems.push({
          text: lang === 'RU' ? '(см. фото вверху)' : '(yuqorida ko‘ring)',
          style: 'qValue',
          italics: true,
        });
      } else {
        const uri = imageToDataUri(a.filePath);
        if (uri) {
          stackItems.push({ image: uri, fit: [180, 220], margin: [0, 4, 0, 0] });
        } else {
          stackItems.push({ text: t.notSet, style: 'qValue' });
        }
      }
    } else {
      const valueText = a ? answerToText(q.type, a, lang) : '';
      stackItems.push({ text: valueText || t.notSet, style: 'qValue' });
    }
    answersContent.push({ stack: stackItems, margin: [0, 0, 0, 10] });
  }

  const header: Content = {
    columns: [
      {
        stack: [
          { text: t.title, style: 'pageTitle' },
          { text: getCompanyName(company, lang), style: 'subTitle' },
        ],
      },
      {
        alignment: 'right',
        stack: [
          { text: `${t.refCode}: ${app.refCode}`, style: 'refCode' },
          { text: `${t.submitted}: ${refRow}`, style: 'small' },
        ],
      },
    ],
    margin: [0, 0, 0, 12],
    ...(options.pageBreakBefore ? { pageBreak: 'before' } : {}),
  };

  const sections: Content[] = [
    header,
    {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#2563eb' },
      ],
      margin: [0, 0, 0, 16],
    },

    { text: t.position, style: 'sectionTitle' },
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                { text: getPositionTitle(app.position, lang), style: 'positionName' },
                {
                  text: `${getCompanyName(company, lang)} → ${getDepartmentName(app.position.department, lang)}`,
                  style: 'small',
                },
              ],
              fillColor: '#f8fafc',
              margin: [10, 8, 10, 8],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 14],
    },

    { text: t.candidate, style: 'sectionTitle' },
    photoBlock
      ? {
          columns: [
            { width: '*', stack: [profileTable] },
            { width: 150, stack: [photoBlock] },
          ],
          margin: [0, 0, 0, 12],
        }
      : profileTable,

    ...(app.position.questions.length > 0
      ? [{ text: t.answers, style: 'sectionTitle' } as Content, ...answersContent]
      : []),
  ];

  return sections;
}

async function writePdf(docDefinition: TDocumentDefinitions, outPath: string): Promise<void> {
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(outPath);
    pdfDoc.pipe(stream);
    pdfDoc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Yagona ariza PDF
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateApplicationPdf(applicationId: string): Promise<string> {
  const app = await getApplicationFull(applicationId);
  if (!app) throw new Error(`Application not found: ${applicationId}`);

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: DEFAULT_STYLE,
    content: buildAppContent(app),
    footer: (currentPage: number, pageCount: number) => ({
      text: `HR Bot · ${app.refCode} · ${currentPage}/${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      color: '#94a3b8',
      margin: [0, 10, 0, 0],
    }),
    styles: STYLES,
  };

  const outPath = path.join(FILES.pdfs, `${app.refCode}.pdf`);
  await writePdf(docDefinition, outPath);
  logger.info({ applicationId, path: outPath }, 'PDF generated (pdfmake)');
  return outPath;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Batch PDF — bir nechta ariza birlashtirilgan
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateApplicationsBatchPdf(
  filter: Prisma.ApplicationWhereInput,
  outName?: string,
): Promise<{ path: string; count: number }> {
  const apps = await prisma.application.findMany({
    where: filter,
    include: {
      user: true,
      position: {
        include: {
          department: { include: { company: true } },
          questions: { orderBy: { order: 'asc' } },
        },
      },
      answers: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (apps.length === 0) {
    throw new Error('No applications match filter');
  }

  // Cover page
  const coverContent: Content[] = [
    {
      stack: [
        { text: '📨 Arizalar to‘plami', style: 'pageTitle', alignment: 'center' },
        { text: `Jami: ${apps.length} ta`, style: 'subTitle', alignment: 'center' },
        { text: formatDate(new Date()), style: 'small', alignment: 'center', margin: [0, 4, 0, 0] },
      ],
      margin: [0, 100, 0, 24],
    },
    {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#cbd5e1' },
      ],
      margin: [0, 0, 0, 12],
    },
    {
      ul: apps.map(
        (a) =>
          `${a.refCode} — ${a.position.titleUz} (${a.position.department.company.nameUz}) — ${a.status}`,
      ),
      fontSize: 9,
      color: '#475569',
    },
  ];

  // Har bir ariza yangi sahifada
  const allContent: Content[] = [...coverContent];
  for (let i = 0; i < apps.length; i++) {
    const app = apps[i];
    allContent.push(...buildAppContent(app as AppFull, { pageBreakBefore: true }));
  }

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: DEFAULT_STYLE,
    content: allContent,
    footer: (currentPage: number, pageCount: number) => ({
      text: `HR Bot · arizalar to‘plami · ${currentPage}/${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      color: '#94a3b8',
      margin: [0, 10, 0, 0],
    }),
    styles: STYLES,
  };

  const filename = outName ?? `applications-batch-${Date.now()}.pdf`;
  const outPath = path.join(FILES.pdfs, filename);
  await writePdf(docDefinition, outPath);
  logger.info({ count: apps.length, path: outPath }, 'Batch PDF generated');
  return { path: outPath, count: apps.length };
}

import path from 'node:path';
import ExcelJS from 'exceljs';
import { Prisma, AppStatus, QuestionType } from '@prisma/client';
import { prisma } from './prisma.js';
import { FILES } from '../utils/files.js';
import { formatDate } from '../utils/validators.js';

export interface ExportFilter {
  companyId?: string;
  departmentId?: string;
  positionId?: string;
  status?: AppStatus;
  fromDate?: Date;
  toDate?: Date;
}

function answerValueAsString(
  type: QuestionType,
  ans: { valueText: string | null; valueNumber: number | null; valueDate: Date | null; valueJson: Prisma.JsonValue | null; filePath: string | null },
): string {
  switch (type) {
    case 'TEXT':
    case 'LONG_TEXT':
    case 'PHONE':
    case 'EMAIL':
    case 'SINGLE_CHOICE':
      return ans.valueText ?? '';
    case 'NUMBER':
      return ans.valueNumber != null ? String(ans.valueNumber) : '';
    case 'DATE':
      return ans.valueDate ? formatDate(ans.valueDate) : '';
    case 'BOOLEAN':
      return ans.valueText === 'true' ? 'Ha' : ans.valueText === 'false' ? "Yo'q" : '';
    case 'MULTI_CHOICE':
      return Array.isArray(ans.valueJson) ? (ans.valueJson as string[]).join(', ') : '';
    case 'FILE':
    case 'PHOTO':
      return ans.filePath ? path.basename(ans.filePath) : '';
    case 'LOCATION':
      if (ans.valueJson && typeof ans.valueJson === 'object') {
        const v = ans.valueJson as { latitude?: number; longitude?: number };
        return `${v.latitude},${v.longitude}`;
      }
      return '';
    default:
      return '';
  }
}

export async function exportApplicationsToExcel(filter: ExportFilter = {}): Promise<string> {
  const where: Prisma.ApplicationWhereInput = {
    status: { not: 'DRAFT' },
  };
  if (filter.status) where.status = filter.status;
  if (filter.positionId) where.positionId = filter.positionId;
  if (filter.companyId || filter.departmentId) {
    const positionWhere: Prisma.PositionWhereInput = {};
    if (filter.departmentId) positionWhere.departmentId = filter.departmentId;
    if (filter.companyId) positionWhere.department = { companyId: filter.companyId };
    where.position = positionWhere;
  }
  if (filter.fromDate || filter.toDate) {
    where.createdAt = {};
    if (filter.fromDate) (where.createdAt as Prisma.DateTimeFilter).gte = filter.fromDate;
    if (filter.toDate) (where.createdAt as Prisma.DateTimeFilter).lte = filter.toDate;
  }

  const apps = await prisma.application.findMany({
    where,
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

  const wb = new ExcelJS.Workbook();
  wb.creator = 'HR Bot';
  wb.created = new Date();

  const ws = wb.addWorksheet('Arizalar');

  // Bir nechta lavozim bo'lishi mumkin — har biri o'zining savollar to'plamiga ega.
  // Yagona varaqada birlashtirish uchun barcha unique savollarni column qilamiz.
  const allQuestionTexts = new Map<string, string>(); // qId -> textUz
  for (const app of apps) {
    for (const q of app.position.questions) {
      allQuestionTexts.set(q.id, q.textUz);
    }
  }

  const baseHeaders = [
    'Ariza №',
    'Sana',
    'Status',
    'Kompaniya',
    "Bo'lim",
    'Lavozim',
    'F.I.O.',
    'Telefon',
    'Email',
    'Tug‘ilgan',
    'Shahar',
    'Username',
    'Telegram ID',
  ];

  const questionHeaders = Array.from(allQuestionTexts.entries()); // [qId, textUz][]
  const headers = [...baseHeaders, ...questionHeaders.map(([, t]) => t)];

  ws.addRow(headers);
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { wrapText: true, vertical: 'middle' };
  ws.getRow(1).height = 40;

  for (const app of apps) {
    const answersById = new Map(app.answers.map((a) => [a.questionId, a]));
    const baseRow = [
      app.refCode,
      formatDate(app.submittedAt ?? app.createdAt),
      app.status,
      app.position.department.company.nameUz,
      app.position.department.nameUz,
      app.position.titleUz,
      app.user.profileFullName ?? '',
      app.user.profilePhone ?? '',
      app.user.profileEmail ?? '',
      app.user.profileBirthDate ? formatDate(app.user.profileBirthDate) : '',
      app.user.profileCity ?? '',
      app.user.username ?? '',
      app.user.telegramId.toString(),
    ];
    const qRow = questionHeaders.map(([qId]) => {
      const a = answersById.get(qId);
      if (!a) return '';
      const q = app.position.questions.find((x) => x.id === qId);
      if (!q) return '';
      return answerValueAsString(q.type, a);
    });
    ws.addRow([...baseRow, ...qRow]);
  }

  // Auto-width
  ws.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 2, 50);
  });

  const filename = `applications_${Date.now()}.xlsx`;
  const dest = path.join(FILES.pdfs, filename);
  await wb.xlsx.writeFile(dest);
  return dest;
}

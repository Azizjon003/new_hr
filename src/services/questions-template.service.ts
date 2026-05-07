import path from 'node:path';
import ExcelJS from 'exceljs';
import { Prisma, QuestionType } from '@prisma/client';
import { prisma } from './prisma.js';
import { FILES } from '../utils/files.js';

const VALID_TYPES: QuestionType[] = [
  'TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DATE',
  'PHONE',
  'EMAIL',
  'SINGLE_CHOICE',
  'MULTI_CHOICE',
  'FILE',
  'PHOTO',
  'BOOLEAN',
  'LOCATION',
];

const HEADERS: Array<{
  key: string;
  label: string;
  required?: boolean;
  comment: string;
  width: number;
}> = [
  { key: 'order', label: 'Order', comment: "Tartib raqami (1, 2, 3...). Bo'sh qoldirilsa avtomatik tartiblanadi.", width: 8 },
  { key: 'type', label: 'Type', required: true, comment: 'Savol turi. Katakni bossangiz dropdown chiqadi.', width: 16 },
  { key: 'textUz', label: 'TextUz', required: true, comment: "Savol matni o'zbekcha. MAJBURIY.", width: 35 },
  { key: 'textRu', label: 'TextRu', required: true, comment: 'Текст вопроса на русском. ОБЯЗАТЕЛЬНО.', width: 35 },
  { key: 'required', label: 'Required', comment: 'yes — majburiy, no — ixtiyoriy. Default: yes', width: 10 },
  {
    key: 'options',
    label: 'Options',
    comment:
      "SINGLE_CHOICE va MULTI_CHOICE uchun.\nFormat: value|labelUz|labelRu — har bir tanlov yangi qatorda.\nMisol:\nyes|Ha|Да\nno|Yo'q|Нет",
    width: 40,
  },
  { key: 'minLength', label: 'MinLength', comment: 'TEXT/LONG_TEXT: minimal belgilar soni', width: 10 },
  { key: 'maxLength', label: 'MaxLength', comment: 'TEXT/LONG_TEXT: maksimal belgilar soni', width: 10 },
  { key: 'min', label: 'Min', comment: 'NUMBER: minimal qiymat', width: 8 },
  { key: 'max', label: 'Max', comment: 'NUMBER: maksimal qiymat', width: 8 },
  { key: 'placeholderUz', label: 'PlaceholderUz', comment: "Yo'riqnoma matni (ixtiyoriy)", width: 25 },
  { key: 'placeholderRu', label: 'PlaceholderRu', comment: 'Подсказка (опционально)', width: 25 },
];

const COLOR = {
  primaryBg: 'FF2563EB',
  primaryText: 'FFFFFFFF',
  zebraEven: 'FFF8FAFC',
  zebraOdd: 'FFFFFFFF',
  helpBg: 'FFFEF3C7',
  borderColor: 'FFE2E8F0',
};

function applyBorders(cell: ExcelJS.Cell): void {
  cell.border = {
    top: { style: 'thin', color: { argb: COLOR.borderColor } },
    left: { style: 'thin', color: { argb: COLOR.borderColor } },
    bottom: { style: 'thin', color: { argb: COLOR.borderColor } },
    right: { style: 'thin', color: { argb: COLOR.borderColor } },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Bitta sheet'li shablon
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateQuestionsTemplate(): Promise<string> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HR Bot';
  wb.created = new Date();

  const ws = wb.addWorksheet('Savollar', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
  });

  const colCount = HEADERS.length;

  // 1-qator: SARLAVHA
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = '📋 SAVOLLAR SHABLONI';
  titleCell.font = { bold: true, size: 16, color: { argb: COLOR.primaryText } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.primaryBg } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 30;

  // 2-qator: QISQA YO'RIQNOMA
  ws.mergeCells(2, 1, 2, colCount);
  const tipCell = ws.getCell(2, 1);
  tipCell.value =
    "💡 🔴 — majburiy ustunlar  •  Type/Required katagiga bossangiz dropdown chiqadi  •  Header ustiga qo'l qo'ysangiz — yo'riqnoma  •  Order bo'sh = avtomatik";
  tipCell.font = { size: 10, italic: true, color: { argb: 'FF334155' } };
  tipCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.helpBg } };
  tipCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  ws.getRow(2).height = 30;

  // 3-qator: ajratuvchi (kichik bo'sh joy)
  ws.getRow(3).height = 6;

  // 4-qator: HEADER
  const headerRow = ws.getRow(4);
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.label + (h.required ? ' 🔴' : '');
    cell.font = { bold: true, color: { argb: COLOR.primaryText }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.primaryBg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: COLOR.primaryBg } },
      left: { style: 'thin', color: { argb: COLOR.primaryText } },
      bottom: { style: 'medium', color: { argb: COLOR.primaryBg } },
      right: { style: 'thin', color: { argb: COLOR.primaryText } },
    };
    cell.note = {
      texts: [{ text: h.comment }],
      margins: { insetmode: 'auto' },
    };
  });
  headerRow.height = 30;

  HEADERS.forEach((h, i) => {
    ws.getColumn(i + 1).width = h.width;
  });

  // 5-qatordan boshlab — misol qatorlar
  const examples: Array<(string | number | boolean)[]> = [
    [1, 'TEXT', 'F.I.O.', 'ФИО', 'yes', '', 5, 100, '', '', 'Familiya Ism Otasi', 'Фамилия Имя Отчество'],
    [2, 'NUMBER', 'Yoshingiz', 'Возраст', 'yes', '', '', '', 16, 80, '', ''],
    [
      3,
      'SINGLE_CHOICE',
      "Ta'lim darajasi",
      'Уровень образования',
      'yes',
      "bachelor|Bakalavr|Бакалавр\nmaster|Magistr|Магистр\nphd|PhD|PhD",
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [4, 'BOOLEAN', 'Ish tajribangiz bormi?', 'Есть ли опыт работы?', 'yes', '', '', '', '', '', '', ''],
    [5, 'LONG_TEXT', "O'zingiz haqingizda", 'О себе', 'no', '', 30, 1500, '', '', '', ''],
    [
      6,
      'MULTI_CHOICE',
      'Qaysi tillarni bilasiz?',
      'Какие языки знаете?',
      'no',
      "uz|O‘zbek|Узбекский\nru|Rus|Русский\nen|Ingliz|Английский",
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [7, 'PHONE', "Qo'shimcha telefon", 'Доп. телефон', 'no', '', '', '', '', '', '+998...', '+998...'],
    [8, 'DATE', "Boshlash mumkin bo'lgan sana", 'Дата начала', 'no', '', '', '', '', '', 'DD.MM.YYYY', 'DD.MM.YYYY'],
  ];

  const FIRST_DATA_ROW = 5;
  examples.forEach((rowData, i) => {
    const r = ws.getRow(FIRST_DATA_ROW + i);
    rowData.forEach((v, ci) => {
      r.getCell(ci + 1).value = v as ExcelJS.CellValue;
    });
    const isEven = i % 2 === 0;
    r.alignment = { wrapText: true, vertical: 'top' };
    r.height = 36;
    for (let c = 1; c <= colCount; c++) {
      const cell = r.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? COLOR.zebraEven : COLOR.zebraOdd },
      };
      applyBorders(cell);
    }
  });

  // Bo'sh styled qatorlar (foydalanuvchi to'ldirishi uchun)
  const FIRST_EMPTY_ROW = FIRST_DATA_ROW + examples.length;
  const EMPTY_ROWS_COUNT = 50;
  for (let i = 0; i < EMPTY_ROWS_COUNT; i++) {
    const rowNum = FIRST_EMPTY_ROW + i;
    const isEven = (i + examples.length) % 2 === 0;
    for (let c = 1; c <= colCount; c++) {
      const cell = ws.getCell(rowNum, c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? COLOR.zebraEven : COLOR.zebraOdd },
      };
      applyBorders(cell);
    }
  }

  // Data validation — barcha data qatorlarga (5 dan oxirgisigacha)
  const LAST_DATA_ROW = FIRST_EMPTY_ROW + EMPTY_ROWS_COUNT - 1;
  // Inline list — bitta sheetda cross-sheet reference shart emas
  const TYPE_LIST = `"${VALID_TYPES.join(',')}"`;
  for (let r = FIRST_DATA_ROW; r <= LAST_DATA_ROW; r++) {
    ws.getCell(`B${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [TYPE_LIST],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: "Noto'g'ri tur",
      error: "Iltimos, ro'yxatdan tanlang",
      showInputMessage: true,
      promptTitle: 'Savol turi',
      prompt: "Katakni bossangiz ro'yxat chiqadi",
    };

    ws.getCell(`E${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"yes,no"'],
      showErrorMessage: true,
      errorTitle: "Noto'g'ri qiymat",
      error: 'Faqat yes yoki no',
      showInputMessage: true,
      promptTitle: 'Majburiymi?',
      prompt: 'yes — majburiy, no — ixtiyoriy',
    };

    for (const col of ['G', 'H', 'I', 'J']) {
      ws.getCell(`${col}${r}`).dataValidation = {
        type: 'whole',
        operator: 'greaterThanOrEqual',
        allowBlank: true,
        formulae: [0],
        showErrorMessage: true,
        errorTitle: "Noto'g'ri qiymat",
        error: 'Faqat musbat son kiriting',
      };
    }
  }

  // Pastda — kichik ma'lumotnoma
  const REF_START = LAST_DATA_ROW + 3;

  ws.mergeCells(REF_START, 1, REF_START, colCount);
  const refTitle = ws.getCell(REF_START, 1);
  refTitle.value = "📚 MA'LUMOTNOMA";
  refTitle.font = { bold: true, size: 12, color: { argb: COLOR.primaryBg } };
  refTitle.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(REF_START).height = 22;

  ws.mergeCells(REF_START + 1, 1, REF_START + 1, colCount);
  const typesTitle = ws.getCell(REF_START + 1, 1);
  typesTitle.value = "🏷 Mumkin bo'lgan turlar (Type ustuni uchun):";
  typesTitle.font = { bold: true, size: 10 };

  const typeDesc: Record<QuestionType, [string, string]> = {
    TEXT: ['Qisqa matn (1 qator)', 'Toshkent shahri'],
    LONG_TEXT: ['Uzun matn (bir nechta qator)', "O'zim haqimda..."],
    NUMBER: ['Son', '25'],
    DATE: ['Sana (DD.MM.YYYY)', '01.01.2000'],
    PHONE: ['Telefon raqami', '+998901234567'],
    EMAIL: ['Email manzil', 'me@example.com'],
    SINGLE_CHOICE: ['Tanlovlardan biri', 'bachelor'],
    MULTI_CHOICE: ['Bir nechta tanlovlar', 'uz, ru'],
    FILE: ['Fayl yuklash', 'cv.pdf'],
    PHOTO: ['Rasm yuklash', 'photo.jpg'],
    BOOLEAN: ["Ha / Yo'q", 'true'],
    LOCATION: ['Telegram joylashuv', '41.31, 69.27'],
  };

  // Mini-jadval header
  const typesHeaderRow = REF_START + 2;
  const typesHeader = ws.getRow(typesHeaderRow);
  typesHeader.getCell(1).value = 'Type';
  typesHeader.getCell(2).value = 'Tavsif';
  typesHeader.getCell(4).value = 'Misol';
  for (const c of [1, 2, 4]) {
    const cell = typesHeader.getCell(c);
    cell.font = { bold: true, color: { argb: COLOR.primaryText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.primaryBg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyBorders(cell);
  }
  ws.mergeCells(typesHeaderRow, 2, typesHeaderRow, 3);
  ws.mergeCells(typesHeaderRow, 4, typesHeaderRow, 5);
  typesHeader.height = 22;

  VALID_TYPES.forEach((t, i) => {
    const r = typesHeaderRow + 1 + i;
    const row = ws.getRow(r);
    row.getCell(1).value = t;
    row.getCell(1).font = { bold: true, color: { argb: COLOR.primaryBg } };
    row.getCell(2).value = typeDesc[t][0];
    ws.mergeCells(r, 2, r, 3);
    row.getCell(4).value = typeDesc[t][1];
    ws.mergeCells(r, 4, r, 5);
    const isEven = i % 2 === 0;
    for (const c of [1, 2, 4]) {
      const cell = row.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? COLOR.zebraEven : COLOR.zebraOdd },
      };
      applyBorders(cell);
      cell.alignment = { vertical: 'middle', wrapText: true };
    }
  });

  // Options format izohi
  const OPTS_ROW = typesHeaderRow + VALID_TYPES.length + 2;
  ws.mergeCells(OPTS_ROW, 1, OPTS_ROW, colCount);
  const optsTitle = ws.getCell(OPTS_ROW, 1);
  optsTitle.value = '📝 Options ustuni formati (SINGLE_CHOICE / MULTI_CHOICE uchun):';
  optsTitle.font = { bold: true, size: 10 };

  ws.mergeCells(OPTS_ROW + 1, 1, OPTS_ROW + 1, colCount);
  const optsDesc = ws.getCell(OPTS_ROW + 1, 1);
  optsDesc.value =
    'Har bir tanlov yangi qatorda. Format: value|labelUz|labelRu\n' +
    'Misol:\n' +
    'yes|Ha|Да\n' +
    "no|Yo'q|Нет";
  optsDesc.font = { size: 10, italic: true };
  optsDesc.alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(OPTS_ROW + 1).height = 80;
  optsDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.helpBg } };

  const filename = `questions-template-${Date.now()}.xlsx`;
  const dest = path.join(FILES.pdfs, filename);
  await wb.xlsx.writeFile(dest);
  return dest;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Excel ni o'qib savollarga aylantirish
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ImportResult {
  added: number;
  errors: string[];
}

function parseBool(v: unknown): boolean {
  const s = String(v ?? '').trim().toLowerCase();
  return ['yes', 'y', 'true', '1', 'ha', 'да', 'da'].includes(s);
}

function cellString(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object' && 'richText' in v) {
    return (v as { richText: Array<{ text: string }> }).richText.map((p) => p.text).join('');
  }
  return String(v);
}

function cellNumber(cell: ExcelJS.Cell): number | null {
  const v = cell.value;
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isNaN(n) ? null : n;
}

const HEADER_ROW = 4;

export async function importQuestionsFromExcel(
  filePath: string,
  positionId: string,
): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const ws =
    wb.getWorksheet('Savollar') ??
    wb.getWorksheet('📋 Savollar') ??
    wb.worksheets.find((w) => w.name.toLowerCase().includes('savol')) ??
    wb.worksheets[0];
  if (!ws) {
    return { added: 0, errors: ['Excel da varaq topilmadi'] };
  }

  // Header qatorini avtomatik aniqlash — Type/TextUz/TextRu so'zlari bor qator
  let detectedHeaderRow = HEADER_ROW;
  for (let r = 1; r <= 10; r++) {
    const row = ws.getRow(r);
    const a = cellString(row.getCell(1)).trim();
    const b = cellString(row.getCell(2)).trim();
    if (
      (a.toUpperCase().startsWith('ORDER') || a === '') &&
      b.toUpperCase().startsWith('TYPE')
    ) {
      detectedHeaderRow = r;
      break;
    }
  }

  const errors: string[] = [];
  const toCreate: Prisma.QuestionCreateManyInput[] = [];

  const last = await prisma.question.findFirst({
    where: { positionId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  let nextAutoOrder = (last?.order ?? -1) + 1;

  ws.eachRow((row, rowNum) => {
    if (rowNum <= detectedHeaderRow) return;

    const rawType = cellString(row.getCell(2)).trim().toUpperCase();
    const textUz = cellString(row.getCell(3)).trim();
    const textRu = cellString(row.getCell(4)).trim();

    if (!rawType && !textUz && !textRu) return;

    // "MA'LUMOTNOMA" yoki shunga o'xshash ref bloklarini o'tkazib yuboramiz
    const c1 = cellString(row.getCell(1)).trim();
    if (c1.startsWith('📚') || c1.startsWith('🏷') || c1.startsWith('📝') || c1.startsWith('Type')) {
      return;
    }

    if (!textUz || !textRu) {
      errors.push(`Qator ${rowNum}: TextUz va TextRu majburiy`);
      return;
    }
    if (!VALID_TYPES.includes(rawType as QuestionType)) {
      errors.push(`Qator ${rowNum}: noma'lum Type "${rawType}"`);
      return;
    }
    const type = rawType as QuestionType;

    const orderRaw = cellNumber(row.getCell(1));
    const order = orderRaw != null ? Math.round(orderRaw) - 1 : nextAutoOrder++;

    const reqCellText = cellString(row.getCell(5)).trim();
    const required = reqCellText === '' ? true : parseBool(reqCellText);

    let options: Prisma.InputJsonValue | undefined;
    const optsRaw = cellString(row.getCell(6)).trim();
    if (optsRaw) {
      if (type !== 'SINGLE_CHOICE' && type !== 'MULTI_CHOICE') {
        errors.push(
          `Qator ${rowNum}: Options faqat SINGLE_CHOICE/MULTI_CHOICE uchun, lekin Type = ${type}`,
        );
        return;
      }
      const lines = optsRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const parsed: Array<{ value: string; labelUz: string; labelRu: string }> = [];
      for (const line of lines) {
        const parts = line.split('|').map((p) => p.trim());
        if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
          errors.push(`Qator ${rowNum}: Options format xato — "${line}"`);
          return;
        }
        parsed.push({ value: parts[0], labelUz: parts[1], labelRu: parts[2] });
      }
      options = parsed;
    } else if (type === 'SINGLE_CHOICE' || type === 'MULTI_CHOICE') {
      errors.push(`Qator ${rowNum}: ${type} uchun Options majburiy`);
      return;
    }

    const minLength = cellNumber(row.getCell(7));
    const maxLength = cellNumber(row.getCell(8));
    const min = cellNumber(row.getCell(9));
    const max = cellNumber(row.getCell(10));

    const validation: Record<string, number> = {};
    if (minLength != null) validation.minLength = minLength;
    if (maxLength != null) validation.maxLength = maxLength;
    if (min != null) validation.min = min;
    if (max != null) validation.max = max;

    const placeholderUz = cellString(row.getCell(11)).trim() || null;
    const placeholderRu = cellString(row.getCell(12)).trim() || null;

    toCreate.push({
      positionId,
      order,
      textUz,
      textRu,
      type,
      required,
      options,
      validation:
        Object.keys(validation).length > 0 ? (validation as Prisma.InputJsonValue) : undefined,
      placeholderUz,
      placeholderRu,
    });
  });

  if (toCreate.length === 0) {
    return {
      added: 0,
      errors: errors.length > 0 ? errors : ['Hech qanday yaroqli qator topilmadi'],
    };
  }

  await prisma.question.createMany({ data: toCreate });

  return { added: toCreate.length, errors };
}

import { QuestionType } from '@prisma/client';

export interface QuestionSeed {
  textUz: string;
  textRu: string;
  type: QuestionType;
  required?: boolean;
  options?: Array<{ value: string; labelUz: string; labelRu: string }>;
  validation?: Record<string, unknown>;
  placeholderUz?: string;
  placeholderRu?: string;
}

/**
 * Tayyor anketa shablonlari — har bir lavozim uchun qulay tanlovlar.
 * Yangi lavozimga shablonni `useTemplate: 'frontend-developer'` orqali ulash mumkin.
 */
export const questionTemplates: Record<string, QuestionSeed[]> = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1) UMUMIY — har bir lavozim uchun mos
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  common: [
    {
      textUz: "O'zingiz haqingizda qisqacha ma'lumot bering.",
      textRu: 'Расскажите кратко о себе.',
      type: QuestionType.LONG_TEXT,
      validation: { minLength: 30, maxLength: 1500 },
    },
    {
      textUz: 'Eng yuqori ma\'lumotingiz qanday?',
      textRu: 'Какое у вас образование?',
      type: QuestionType.SINGLE_CHOICE,
      options: [
        { value: 'school', labelUz: "O'rta", labelRu: 'Среднее' },
        { value: 'college', labelUz: "O'rta-maxsus", labelRu: 'Среднее специальное' },
        { value: 'bachelor', labelUz: 'Bakalavr', labelRu: 'Бакалавр' },
        { value: 'master', labelUz: 'Magistr', labelRu: 'Магистр' },
        { value: 'phd', labelUz: 'PhD / Aspirant', labelRu: 'PhD / Аспирант' },
      ],
    },
    {
      textUz: 'Qaysi shaharda yashayasiz?',
      textRu: 'В каком городе проживаете?',
      type: QuestionType.TEXT,
      validation: { minLength: 2, maxLength: 50 },
    },
    {
      textUz: 'Ko\'chib o\'tishga tayyormisiz?',
      textRu: 'Готовы ли к переезду?',
      type: QuestionType.BOOLEAN,
    },
    {
      textUz: 'Kutilayotgan oylik maosh (so\'m):',
      textRu: 'Ожидаемая зарплата (сум):',
      type: QuestionType.NUMBER,
      validation: { min: 1000000, max: 100000000 },
    },
  ],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2) DEVELOPER (Frontend / Backend / Full-stack)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  developer: [
    {
      textUz: "Necha yillik dasturlash tajribangiz bor?",
      textRu: 'Сколько лет вы программируете?',
      type: QuestionType.NUMBER,
      validation: { min: 0, max: 50 },
    },
    {
      textUz: 'Asosiy texnologiya/stack ingiz qanday?',
      textRu: 'Ваш основной стек технологий?',
      type: QuestionType.LONG_TEXT,
      validation: { minLength: 5, maxLength: 500 },
      placeholderUz: 'Masalan: React, Node.js, PostgreSQL...',
      placeholderRu: 'Например: React, Node.js, PostgreSQL...',
    },
    {
      textUz: 'GitHub yoki portfolio havolasi:',
      textRu: 'Ссылка на GitHub или портфолио:',
      type: QuestionType.TEXT,
      required: false,
      validation: { maxLength: 200 },
    },
    {
      textUz: 'Ingliz tili darajasi:',
      textRu: 'Уровень английского:',
      type: QuestionType.SINGLE_CHOICE,
      options: [
        { value: 'A1', labelUz: 'A1 — Beginner', labelRu: 'A1 — Начальный' },
        { value: 'A2', labelUz: 'A2 — Elementary', labelRu: 'A2 — Базовый' },
        { value: 'B1', labelUz: 'B1 — Intermediate', labelRu: 'B1 — Средний' },
        { value: 'B2', labelUz: 'B2 — Upper-Intermediate', labelRu: 'B2 — Выше среднего' },
        { value: 'C1', labelUz: 'C1 — Advanced', labelRu: 'C1 — Продвинутый' },
        { value: 'C2', labelUz: 'C2 — Native', labelRu: 'C2 — Свободный' },
      ],
    },
    {
      textUz: 'Eng faxrlanadigan loyihangiz haqida ayting:',
      textRu: 'Расскажите о проекте, которым вы гордитесь:',
      type: QuestionType.LONG_TEXT,
      required: false,
      validation: { maxLength: 2000 },
    },
  ],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3) MARKETING / SMM
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  marketing: [
    {
      textUz: 'Marketing/SMM sohasidagi tajribangiz necha yil?',
      textRu: 'Сколько лет опыта в маркетинге/SMM?',
      type: QuestionType.NUMBER,
      validation: { min: 0, max: 50 },
    },
    {
      textUz: 'Qaysi platformalarda ishlaganingizni belgilang:',
      textRu: 'На каких платформах вы работали:',
      type: QuestionType.MULTI_CHOICE,
      options: [
        { value: 'instagram', labelUz: 'Instagram', labelRu: 'Instagram' },
        { value: 'telegram', labelUz: 'Telegram', labelRu: 'Telegram' },
        { value: 'facebook', labelUz: 'Facebook', labelRu: 'Facebook' },
        { value: 'tiktok', labelUz: 'TikTok', labelRu: 'TikTok' },
        { value: 'youtube', labelUz: 'YouTube', labelRu: 'YouTube' },
        { value: 'google_ads', labelUz: 'Google Ads', labelRu: 'Google Ads' },
      ],
    },
    {
      textUz: 'Eng muvaffaqiyatli kampaniyangiz haqida ayting:',
      textRu: 'Расскажите о самой успешной кампании:',
      type: QuestionType.LONG_TEXT,
      validation: { maxLength: 2000 },
    },
    {
      textUz: 'Portfolio yoki keyslar havolasi:',
      textRu: 'Ссылка на портфолио или кейсы:',
      type: QuestionType.TEXT,
      required: false,
    },
  ],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4) SOTUV MENEJERI / SALES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sales: [
    {
      textUz: 'Sotuvdagi tajribangiz:',
      textRu: 'Опыт в продажах:',
      type: QuestionType.NUMBER,
      validation: { min: 0, max: 50 },
    },
    {
      textUz: 'Qaysi sohada sotuv qilgansiz?',
      textRu: 'В какой сфере продавали?',
      type: QuestionType.LONG_TEXT,
      validation: { maxLength: 1000 },
    },
    {
      textUz: 'Eng yirik bitimingiz haqida qisqacha:',
      textRu: 'О крупнейшей сделке:',
      type: QuestionType.LONG_TEXT,
      required: false,
      validation: { maxLength: 1500 },
    },
    {
      textUz: 'CRM tizimlari bilan ishlay olasizmi?',
      textRu: 'Работали ли с CRM системами?',
      type: QuestionType.BOOLEAN,
    },
  ],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5) DIZAYNER (UI/UX, Graphic)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  designer: [
    {
      textUz: 'Dizayn tajribangiz necha yil?',
      textRu: 'Опыт в дизайне:',
      type: QuestionType.NUMBER,
      validation: { min: 0, max: 50 },
    },
    {
      textUz: 'Qaysi dasturlardan foydalanasiz?',
      textRu: 'Какими инструментами пользуетесь?',
      type: QuestionType.MULTI_CHOICE,
      options: [
        { value: 'figma', labelUz: 'Figma', labelRu: 'Figma' },
        { value: 'photoshop', labelUz: 'Photoshop', labelRu: 'Photoshop' },
        { value: 'illustrator', labelUz: 'Illustrator', labelRu: 'Illustrator' },
        { value: 'sketch', labelUz: 'Sketch', labelRu: 'Sketch' },
        { value: 'after_effects', labelUz: 'After Effects', labelRu: 'After Effects' },
        { value: 'blender', labelUz: 'Blender / 3D', labelRu: 'Blender / 3D' },
      ],
    },
    {
      textUz: 'Portfolio havolasi (Behance, Dribbble, web):',
      textRu: 'Ссылка на портфолио:',
      type: QuestionType.TEXT,
      validation: { minLength: 5, maxLength: 200 },
    },
  ],

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6) HAYDOVCHI / KURYER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  driver: [
    {
      textUz: 'Haydovchilik tajribangiz necha yil?',
      textRu: 'Стаж вождения:',
      type: QuestionType.NUMBER,
      validation: { min: 0, max: 60 },
    },
    {
      textUz: 'Qaysi toifadagi guvohnomalar bor?',
      textRu: 'Какие категории прав?',
      type: QuestionType.MULTI_CHOICE,
      options: [
        { value: 'B', labelUz: 'B', labelRu: 'B' },
        { value: 'C', labelUz: 'C', labelRu: 'C' },
        { value: 'D', labelUz: 'D', labelRu: 'D' },
        { value: 'E', labelUz: 'E', labelRu: 'E' },
      ],
    },
    {
      textUz: 'Shaxsiy avtomobilingiz bormi?',
      textRu: 'Есть ли личный автомобиль?',
      type: QuestionType.BOOLEAN,
    },
  ],
};

/**
 * Bir nechta shablonni birlashtiradi (masalan: common + developer).
 */
export function applyTemplate(name: string | string[]): QuestionSeed[] {
  const names = Array.isArray(name) ? name : [name];
  const result: QuestionSeed[] = [];
  for (const n of names) {
    const tpl = questionTemplates[n];
    if (!tpl) {
      console.warn(`⚠️  Shablon topilmadi: "${n}"`);
      continue;
    }
    result.push(...tpl);
  }
  return result;
}

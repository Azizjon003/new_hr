import { EmploymentType, ExperienceLevel } from '@prisma/client';
import { QuestionSeed } from './question-templates.js';

export interface PositionSeed {
  titleUz: string;
  titleRu: string;
  descriptionUz?: string;
  descriptionRu?: string;
  salaryFrom?: number;
  salaryTo?: number;
  currency?: 'UZS' | 'USD' | 'RUB';
  salaryNegotiable?: boolean;
  location?: string;
  employmentType?: EmploymentType;
  experienceLevel?: ExperienceLevel;
  requirePhoto?: boolean;
  requireCv?: boolean;
  isFeatured?: boolean;
  order?: number;
  /** Tayyor savol shabloni nomi yoki ro'yxati ('common', 'developer', ...) */
  useTemplate?: string | string[];
  /** Yoki shablonsiz qo'lda savollar */
  questions?: QuestionSeed[];
}

export interface DepartmentSeed {
  nameUz: string;
  nameRu: string;
  order?: number;
  positions: PositionSeed[];
}

export interface CompanySeed {
  nameUz: string;
  nameRu: string;
  descriptionUz?: string;
  descriptionRu?: string;
  /** Telegram kanal ID — admindan keyin sozlanadi */
  channelId?: string;
  order?: number;
  departments: DepartmentSeed[];
}

export const companiesSeed: CompanySeed[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1) IT KOMPANIYA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    nameUz: 'TechSolutions',
    nameRu: 'TechSolutions',
    descriptionUz:
      "Toshkentda joylashgan IT-kompaniya. Web va mobil ilovalarni ishlab chiqamiz. Zamonaviy ofis, do'stona jamoa.",
    descriptionRu:
      'IT-компания в Ташкенте. Разрабатываем веб и мобильные приложения. Современный офис, дружная команда.',
    order: 1,
    departments: [
      {
        nameUz: 'Dasturlash',
        nameRu: 'Разработка',
        order: 1,
        positions: [
          {
            titleUz: 'Frontend dasturchi (React)',
            titleRu: 'Frontend разработчик (React)',
            descriptionUz:
              "React, TypeScript, Tailwind bilan ishlovchi frontend dasturchi qidiramiz. Ofis: Toshkent, Mirzo Ulug'bek tumani.",
            descriptionRu:
              'Ищем Frontend разработчика со знанием React, TypeScript, Tailwind. Офис: Ташкент, Мирзо-Улугбек.',
            salaryFrom: 8000000,
            salaryTo: 18000000,
            currency: 'UZS',
            location: 'Toshkent',
            employmentType: EmploymentType.FULL_TIME,
            experienceLevel: ExperienceLevel.MIDDLE,
            requireCv: true,
            isFeatured: true,
            useTemplate: ['common', 'developer'],
          },
          {
            titleUz: 'Backend dasturchi (Node.js)',
            titleRu: 'Backend разработчик (Node.js)',
            descriptionUz: 'Node.js, NestJS, PostgreSQL. Microservices arxitekturasi.',
            descriptionRu: 'Node.js, NestJS, PostgreSQL. Микросервисная архитектура.',
            salaryFrom: 10000000,
            salaryTo: 22000000,
            location: 'Toshkent',
            experienceLevel: ExperienceLevel.MIDDLE,
            requireCv: true,
            useTemplate: ['common', 'developer'],
          },
          {
            titleUz: 'QA Engineer (Junior)',
            titleRu: 'QA Engineer (Junior)',
            descriptionUz: "Test yozish va manual testlash bo'yicha junior pozitsiya.",
            descriptionRu: 'Junior позиция в тестировании ПО (manual + автотесты).',
            salaryFrom: 4000000,
            salaryTo: 7000000,
            location: 'Toshkent',
            experienceLevel: ExperienceLevel.JUNIOR,
            useTemplate: ['common'],
          },
        ],
      },
      {
        nameUz: 'Dizayn',
        nameRu: 'Дизайн',
        order: 2,
        positions: [
          {
            titleUz: 'UI/UX dizayner',
            titleRu: 'UI/UX дизайнер',
            descriptionUz:
              'Mobil va web ilovalar uchun UI/UX dizaynlar yaratish. Figma, prototyping.',
            descriptionRu: 'Дизайн UI/UX для мобильных и веб приложений. Figma, прототипирование.',
            salaryFrom: 7000000,
            salaryTo: 15000000,
            location: 'Toshkent',
            employmentType: EmploymentType.HYBRID,
            experienceLevel: ExperienceLevel.MIDDLE,
            requirePhoto: true,
            useTemplate: ['common', 'designer'],
          },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2) MARKETING AGENTLIGI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    nameUz: 'BrandUp Agency',
    nameRu: 'BrandUp Agency',
    descriptionUz: "O'zbekistondagi yetakchi marketing agentligi. SMM, brending, reklama.",
    descriptionRu: 'Ведущее маркетинговое агентство Узбекистана. SMM, брендинг, реклама.',
    order: 2,
    departments: [
      {
        nameUz: 'Marketing',
        nameRu: 'Маркетинг',
        positions: [
          {
            titleUz: 'SMM mutaxassisi',
            titleRu: 'SMM специалист',
            descriptionUz: 'Instagram, Telegram kontentini yaratish va boshqarish.',
            descriptionRu: 'Создание и ведение контента в Instagram, Telegram.',
            salaryFrom: 5000000,
            salaryTo: 10000000,
            location: 'Toshkent',
            experienceLevel: ExperienceLevel.JUNIOR,
            requirePhoto: true,
            useTemplate: ['common', 'marketing'],
          },
          {
            titleUz: 'Marketing menejer',
            titleRu: 'Маркетинг менеджер',
            descriptionUz: 'Marketing strategiyalari ishlab chiqish, jamoani boshqarish.',
            descriptionRu: 'Разработка маркетинговых стратегий, управление командой.',
            salaryFrom: 12000000,
            salaryTo: 25000000,
            location: 'Toshkent',
            experienceLevel: ExperienceLevel.SENIOR,
            requireCv: true,
            useTemplate: ['common', 'marketing'],
          },
        ],
      },
      {
        nameUz: 'Sotuv',
        nameRu: 'Продажи',
        positions: [
          {
            titleUz: 'Sotuv menejeri',
            titleRu: 'Менеджер по продажам',
            descriptionUz: "Mijozlar bilan ishlash, B2B sotuvlar. Bonus tizimi: maosh + %.",
            descriptionRu: 'Работа с клиентами, B2B продажи. Бонусы: оклад + %.',
            salaryFrom: 5000000,
            salaryNegotiable: true,
            location: 'Toshkent',
            experienceLevel: ExperienceLevel.JUNIOR,
            useTemplate: ['common', 'sales'],
          },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3) LOGISTIKA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    nameUz: 'FastDelivery',
    nameRu: 'FastDelivery',
    descriptionUz: "O'zbekiston bo'ylab tez yetkazib berish xizmati.",
    descriptionRu: 'Служба быстрой доставки по всему Узбекистану.',
    order: 3,
    departments: [
      {
        nameUz: 'Yetkazib berish',
        nameRu: 'Доставка',
        positions: [
          {
            titleUz: 'Kuryer (mototsikl)',
            titleRu: 'Курьер (мотоцикл)',
            descriptionUz: "Toshkent bo'ylab buyurtmalarni yetkazish. Mototsikl va yoqilg'i kompaniyadan.",
            descriptionRu: 'Доставка заказов по Ташкенту. Мотоцикл и топливо от компании.',
            salaryFrom: 4000000,
            salaryTo: 8000000,
            location: 'Toshkent',
            employmentType: EmploymentType.FULL_TIME,
            experienceLevel: ExperienceLevel.NO_EXPERIENCE,
            requirePhoto: true,
            useTemplate: ['common', 'driver'],
          },
          {
            titleUz: 'Yuk haydovchisi',
            titleRu: 'Водитель грузовика',
            descriptionUz: "Mintaqalararo yuk tashish (C/CE toifa).",
            descriptionRu: 'Межрегиональные грузоперевозки (C/CE категории).',
            salaryFrom: 8000000,
            salaryTo: 14000000,
            location: "O'zbekiston bo'ylab",
            experienceLevel: ExperienceLevel.MIDDLE,
            useTemplate: ['common', 'driver'],
          },
        ],
      },
    ],
  },
];

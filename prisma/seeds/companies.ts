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

// Qisqa yordamchi — har bir lavozimga 'common' shabloni qo'shiladi
function pos(titleUz: string, titleRu: string, order: number): PositionSeed {
  return {
    titleUz,
    titleRu,
    salaryNegotiable: true,
    currency: 'UZS',
    employmentType: EmploymentType.FULL_TIME,
    experienceLevel: ExperienceLevel.NO_EXPERIENCE,
    order,
    useTemplate: 'common',
  };
}

// Restoran bo'limlari — Arzum va Gnomik uchun bir xil
function restaurantDepartments(): DepartmentSeed[] {
  return [
    {
      nameUz: "Rahbariyat bo'limi",
      nameRu: 'Руководство',
      order: 1,
      positions: [
        pos('Direktor', 'Директор', 1),
        pos('Boshqaruvchi (Manager)', 'Управляющий (Менеджер)', 2),
        pos('Administrator', 'Администратор', 3),
        pos('HR menejer', 'HR менеджер', 4),
        pos('Moliyachi / Buxgalter', 'Финансист / Бухгалтер', 5),
      ],
    },
    {
      nameUz: "Oshxona bo'limi",
      nameRu: 'Кухня',
      order: 2,
      positions: [
        pos('Bosh oshpaz (Chef)', 'Шеф-повар', 1),
        pos('Oshpaz', 'Повар', 2),
        pos('Qandolatchi', 'Кондитер', 3),
        pos('Pitsa ustasi', 'Пиццамейкер', 4),
        pos('Fastfood ustasi', 'Фастфуд повар', 5),
        pos('Yordamchi oshpaz', 'Помощник повара', 6),
        pos('Idish-tovoq yuvuvchi', 'Посудомойщик', 7),
      ],
    },
    {
      nameUz: "Xizmat ko'rsatish bo'limi",
      nameRu: 'Обслуживание',
      order: 3,
      positions: [
        pos('Ofitsiant(ka)', 'Официант(ка)', 1),
        pos('Barista', 'Бариста', 2),
        pos('Barmen', 'Бармен', 3),
        pos('Kassir', 'Кассир', 4),
        pos('Hostes', 'Хостес', 5),
      ],
    },
    {
      nameUz: "Texnik va yordamchi xodimlar bo'limi",
      nameRu: 'Технический и вспомогательный персонал',
      order: 4,
      positions: [
        pos('Tozalovchi', 'Уборщик', 1),
        pos('Omborchi', 'Кладовщик', 2),
        pos('Yetkazib beruvchi (Kuryer)', 'Курьер', 3),
        pos('Xavfsizlik xodimi', 'Сотрудник безопасности', 4),
        pos('Texnik xodim / Elektrik', 'Технический работник / Электрик', 5),
      ],
    },
  ];
}

export const companiesSeed: CompanySeed[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1) ARZUM RESTORAN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    nameUz: 'Arzum restoran',
    nameRu: 'Ресторан Arzum',
    descriptionUz: 'Restoran. Oshxona, xizmat ko‘rsatish va boshqaruv bo‘yicha vakansiyalar.',
    descriptionRu: 'Ресторан. Вакансии по кухне, обслуживанию и управлению.',
    order: 1,
    departments: restaurantDepartments(),
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2) GNOMIK RESTORAN (Arzum kabi)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    nameUz: 'Gnomik restoran',
    nameRu: 'Ресторан Gnomik',
    descriptionUz: 'Restoran. Oshxona, xizmat ko‘rsatish va boshqaruv bo‘yicha vakansiyalar.',
    descriptionRu: 'Ресторан. Вакансии по кухне, обслуживанию и управлению.',
    order: 2,
    departments: restaurantDepartments(),
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3) GRAND PRINT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    nameUz: 'Grand print',
    nameRu: 'Grand print',
    descriptionUz: 'Bosmaxona / ishlab chiqarish korxonasi. Ishlab chiqarish, sifat nazorati va savdo vakansiyalari.',
    descriptionRu: 'Типография / производство. Вакансии по производству, контролю качества и продажам.',
    order: 3,
    departments: [
      {
        nameUz: "Rahbariyat bo'limi",
        nameRu: 'Руководство',
        order: 1,
        positions: [
          pos('Korxona direktori', 'Директор предприятия', 1),
          pos('Ishlab chiqarish menejeri', 'Менеджер производства', 2),
          pos('HR menejer', 'HR менеджер', 3),
          pos('Buxgalter', 'Бухгалтер', 4),
          pos('Kotiba', 'Секретарь', 5),
          pos('IT mutaxassisi', 'IT специалист', 6),
        ],
      },
      {
        nameUz: "Ishlab chiqarish bo'limi",
        nameRu: 'Производство',
        order: 2,
        positions: [
          pos('Operator', 'Оператор', 1),
          pos('Stanok operatori', 'Оператор станка', 2),
          pos('Kesish ustasi', 'Резчик', 3),
          pos('Bosma operatori', 'Печатник (оператор печати)', 4),
          pos('Laminatsiya operatori', 'Оператор ламинации', 5),
          pos('Yelimlash ustasi', 'Клейщик', 6),
          pos('Qadoqlovchi', 'Упаковщик', 7),
          pos('Texnolog', 'Технолог', 8),
        ],
      },
      {
        nameUz: "Sifat nazorati bo'limi",
        nameRu: 'Контроль качества',
        order: 3,
        positions: [
          pos('Tayyor mahsulot nazoratchisi', 'Контролёр готовой продукции', 1),
          pos('Sifat nazorati', 'Контроль качества', 2),
          pos('Sifat nazoratchisi (QC)', 'Контролёр качества (QC)', 3),
        ],
      },
      {
        nameUz: 'Ombor va logistika',
        nameRu: 'Склад и логистика',
        order: 4,
        positions: [
          pos('Omborchi', 'Кладовщик', 1),
          pos('Yuklovchi', 'Грузчик', 2),
          pos('Haydovchi', 'Водитель', 3),
          pos('Agent', 'Агент', 4),
        ],
      },
      {
        nameUz: "Texnik xizmat bo'limi",
        nameRu: 'Техническое обслуживание',
        order: 5,
        positions: [
          pos('Mexanik', 'Механик', 1),
          pos('Elektrik', 'Электрик', 2),
          pos('Muhandis', 'Инженер', 3),
          pos('Texnik xizmat ustasi', 'Мастер техобслуживания', 4),
        ],
      },
      {
        nameUz: "Savdo va ofis bo'limi",
        nameRu: 'Продажи и офис',
        order: 6,
        positions: [
          pos('Sotuv menejeri', 'Менеджер по продажам', 1),
          pos('Marketing mutaxassisi', 'Маркетолог', 2),
          pos('Operator (ofis)', 'Оператор (офис)', 3),
        ],
      },
    ],
  },
];

# HR Bot — Texnik Topshiriq (TZ) v2

## 1. Loyiha haqida umumiy ma'lumot

Telegram orqali ishlaydigan HR bot. Foydalanuvchi (nomzod) tanlangan kompaniyaga, uning bo'limiga va lavozimiga anketa topshiradi. Anketa savollari har bir lavozim uchun alohida sozlanadi. Anketa to'ldirilgach, **PDF generatsiya qilinadi va kompaniyaning maxsus Telegram kanaliga yuboriladi** (HR ko'rishi uchun). Bot ikki tilda ishlaydi: **o'zbek** va **rus**.

---

## 2. Texnik stack

| Qism | Texnologiya |
|---|---|
| Runtime | Node.js v20+ LTS |
| Language | TypeScript (strict) |
| Bot framework | grammY + `@grammyjs/conversations` + `@grammyjs/menu` |
| ORM | Prisma |
| DB | PostgreSQL 16 |
| Cache / queue | Redis (sessiya + kesh) |
| i18n | `@grammyjs/i18n` (Fluent format) |
| Validation | Zod |
| Logger | Pino + pino-pretty (dev) |
| PDF | Puppeteer (HTML → PDF, chiroyli template + uz/ru shrift) |
| Excel export | ExcelJS |
| Container | Docker + docker-compose |
| Process manager | PM2 (prod) |
| Error tracking | Sentry (ixtiyoriy) |
| CI/CD | GitHub Actions (lint + typecheck + build) |
| Web admin (Bosqich 2) | Next.js 15 + shadcn/ui + Tailwind + tRPC |
| Mini App (Bosqich 2) | React + Vite + Telegram WebApp SDK |

---

## 3. Asosiy rollar

1. **User (nomzod)** — anketa to'ldiradi.
2. **Super-admin** — `ENV.ADMIN_IDS` da yoki `User.isAdmin = true`. Hammasini boshqaradi.
3. **HR Manager** (Bosqich 2) — kompaniyaga biriktirilgan, faqat o'z kompaniyasi arizalarini ko'radi.

---

## 4. Foydalanuvchi flow (User flow)

### 4.1. Birinchi marta kirish
1. `/start` → til tanlash (🇺🇿 / 🇷🇺).
2. **Maxfiylik roziligi** ekrani — "Shaxsiy ma'lumotlarimni qayta ishlashga roziman" tugmasi (sharti — bosgandan keyingina davom etadi). `User.consentGivenAt` ga sana yoziladi.
3. Asosiy menyu:
   - 📝 Anketa topshirish
   - 👤 Mening profilim
   - 📂 Mening arizalarim
   - 🌐 Tilni o'zgartirish
   - ❓ Yordam (`/help`)
   - ℹ️ Bot haqida

### 4.2. Profil (qayta ishlatiladigan)
Foydalanuvchi bir marta to'ldiradi va keyingi anketalarda avtomatik kelib turadi (tasdiqlash kerak):
- To'liq ism (FIO)
- Telefon raqami (Telegram contact button)
- Tug'ilgan sana
- Email (ixtiyoriy)
- Manzil/shahar (ixtiyoriy)

### 4.3. Anketa topshirish flow
1. **Kompaniya tanlash** (paginatsiya bilan, faol va o'chirilmagan).
2. **Bo'lim tanlash** (tanlangan kompaniyaning).
3. **Lavozim tanlash** (tanlangan bo'limning).
4. **Lavozim ma'lumoti** chiqadi:
   - Sarlavha, tavsif
   - Maosh (`from–to currency`, yoki "Kelishilgan holda")
   - Joylashuv
   - Ish turi (Full-time / Part-time / Contract / Internship / Remote / Hybrid)
   - Tajriba darajasi
   - Tugmalar: "✅ Anketani boshlash" / "❌ Bekor qilish"
5. **Profil ma'lumotlari ko'rsatiladi** → "✅ To'g'ri" yoki "✏️ Tahrirlash" tugmalari.
6. **Anketa savollari** ketma-ket so'raladi:
   - Har bir savolda **progress bar** ("Savol 3/12")
   - Ixtiyoriy savol uchun "⏭ O'tkazib yuborish" tugmasi
   - "⬅️ Orqaga" tugmasi (oldingi javobni o'zgartirish)
   - "❌ Bekor qilish" — anketa tashlab ketiladi
7. **Rasm bosqichi** — agar `position.requirePhoto = true` bo'lsa.
8. **CV/Resume bosqichi** — agar `position.requireCv = true` bo'lsa.
9. **Tasdiqlash ekrani** — barcha javoblar ko'rsatiladi → "✅ Yuborish" / "✏️ Tahrirlash" / "❌ Bekor qilish".
10. **Yuborilgach**:
    - Ariza `PENDING` statusida saqlanadi, qisqa kod beriladi (`#HR-2026-0042`).
    - **PDF generatsiya** qilinadi (Puppeteer).
    - PDF + foydalanuvchi rasmi (agar bor bo'lsa) **kompaniyaning kanaliga** yuboriladi.
    - Kanaldagi xabarda inline tugmalar: "✅ Qabul qilish" / "❌ Rad etish" / "👁 Ko'rildi".
    - Foydalanuvchiga rahmat xabari + ariza raqami.

### 4.4. Draft (yarim qolgan ariza)
- Foydalanuvchi anketa o'rtasida tushib qolsa yoki `/cancel` qilsa — `Application(status=DRAFT)` saqlanadi.
- `/start` qilganda yoki "📝 Anketa topshirish" bosganda: agar draft bo'lsa, **"⏯ Davom ettirish" / "🆕 Yangidan boshlash"** tanlovi.

### 4.5. "Mening arizalarim"
- Yuborilgan arizalar ro'yxati (status + sana + lavozim + qisqa kod).
- Detal sahifa: barcha javoblarni ko'rish.
- **Qaytarib olish** (Withdraw) — faqat `PENDING` statusda, yuborilganidan 24 soat ichida.

### 4.6. /help
Bot funksiyalari haqida qisqacha qo'llanma + adminga yozish kontakti.

---

## 5. Admin flow (super-admin)

`/admin` → ADMIN_IDS yoki `isAdmin=true` tekshiriladi.

### 5.1. Asosiy menyu
- 🏢 Kompaniyalar (CRUD + kanal sozlash)
- 🗂 Bo'limlar
- 💼 Lavozimlar
- ❓ Savollar (lavozim ichida)
- 📨 Arizalar
- 📊 Statistika
- 👥 Foydalanuvchilar
- 👤 Adminlar (qo'shish/o'chirish)
- 🗑 O'chirilganlar (soft delete tiklash)
- 📜 Action log
- ⚙️ Sozlash sehrgari (birinchi marta)

### 5.2. Kompaniya
Maydonlar: `nameUz`, `nameRu`, `descriptionUz`, `descriptionRu`, `logoFilePath`, **`channelId`** (ariza PDF lari yuboriladigan kanal — bot kanalga admin bo'lishi shart), `isActive`.

### 5.3. Bo'lim
Maydonlar: `companyId`, `nameUz`, `nameRu`, `order`, `isActive`.

### 5.4. Lavozim
Maydonlar:
- Asosiy: `departmentId`, `titleUz`, `titleRu`, `descriptionUz`, `descriptionRu`
- **Ish sharti**: `salaryFrom`, `salaryTo`, `currency` (UZS/USD/RUB), `salaryNegotiable`, `location`, `employmentType`, `experienceLevel`
- **Talablar**: `requirePhoto`, `requireCv`
- **Ko'rinish**: `isActive`, `isFeatured`, `order`

### 5.5. Savollar
Maydonlar: `positionId`, `order`, `textUz`, `textRu`, `type`, `required`, `options` (JSON), `validation` (JSON), `placeholderUz/Ru`. Tartibni ↑↓ tugmalari bilan o'zgartirish.

### 5.6. Arizalar
- Filtrlar: kompaniya / bo'lim / lavozim / status / sana.
- Ariza ochish: foydalanuvchi profili + barcha javoblar + rasm/CV.
- Status o'zgartirish: `VIEWED / ACCEPTED / REJECTED` + sabab.
- **Excel export** (filter bo'yicha).
- Foydalanuvchiga to'g'ridan-to'g'ri xabar yuborish.
- Status tarixi (kim qachon o'zgartirgan).

### 5.7. Bildirishnomalar
- **Yangi ariza** → kompaniya kanaliga PDF + inline tugmalar (real-time).
- Adminlarga ham `ADMIN_IDS` ga shaxsiy bildirishnoma yuborish (ixtiyoriy sozlash).

### 5.8. Action log
- Har bir admin amali yoziladi: kim, qachon, qaysi obyekt, qanday o'zgartirish.
- Filter: admin / sana / amal turi.

### 5.9. Sozlash sehrgari
- Bot birinchi marta ishga tushganda yoki kompaniyalar bo'sh bo'lsa → admin uchun pog'onali sozlash: kompaniya yarating → kanal ulang → bo'lim yarating → lavozim yarating → savollar qo'shing.

---

## 6. Ma'lumotlar bazasi sxemasi (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Lang { UZ RU }

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERNSHIP
  REMOTE
  HYBRID
}

enum ExperienceLevel {
  NO_EXPERIENCE
  JUNIOR
  MIDDLE
  SENIOR
  LEAD
}

enum QuestionType {
  TEXT
  LONG_TEXT
  NUMBER
  DATE
  PHONE
  EMAIL
  SINGLE_CHOICE
  MULTI_CHOICE
  FILE
  PHOTO
  BOOLEAN
  LOCATION
}

enum AppStatus {
  DRAFT
  PENDING
  VIEWED
  ACCEPTED
  REJECTED
  WITHDRAWN
}

model User {
  id          String   @id @default(cuid())
  telegramId  BigInt   @unique
  username    String?
  tgFirstName String?
  tgLastName  String?
  lang        Lang     @default(UZ)
  isBlocked   Boolean  @default(false)
  isAdmin     Boolean  @default(false)

  // qayta ishlatiladigan profil
  profileFullName  String?
  profilePhone     String?
  profileBirthDate DateTime?
  profileEmail     String?
  profileCity      String?

  consentGivenAt DateTime?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  applications Application[]
  adminLogs    AdminLog[]
  statusChanges ApplicationStatusHistory[]
}

model Company {
  id            String   @id @default(cuid())
  nameUz        String
  nameRu        String
  descriptionUz String?
  descriptionRu String?
  logoFilePath  String?
  channelId     String?     // Telegram kanal ID (ariza PDF lari yuboriladi)
  isActive      Boolean     @default(true)
  isDeleted     Boolean     @default(false)
  order         Int         @default(0)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  departments   Department[]

  @@index([isActive, isDeleted])
}

model Department {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  nameUz    String
  nameRu    String
  isActive  Boolean  @default(true)
  isDeleted Boolean  @default(false)
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  positions Position[]

  @@index([companyId, isActive, isDeleted])
}

model Position {
  id              String   @id @default(cuid())
  departmentId    String
  department      Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  titleUz         String
  titleRu         String
  descriptionUz   String?
  descriptionRu   String?

  salaryFrom       Int?
  salaryTo         Int?
  currency         String   @default("UZS")
  salaryNegotiable Boolean  @default(false)

  location        String?
  employmentType  EmploymentType @default(FULL_TIME)
  experienceLevel ExperienceLevel @default(NO_EXPERIENCE)

  requirePhoto    Boolean  @default(false)
  requireCv       Boolean  @default(false)

  isActive        Boolean  @default(true)
  isFeatured      Boolean  @default(false)
  isDeleted       Boolean  @default(false)
  order           Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  questions       Question[]
  applications    Application[]

  @@index([departmentId, isActive, isDeleted])
}

model Question {
  id            String   @id @default(cuid())
  positionId    String
  position      Position @relation(fields: [positionId], references: [id], onDelete: Cascade)
  order         Int
  textUz        String
  textRu        String
  type          QuestionType
  required      Boolean  @default(true)
  options       Json?
  validation    Json?
  placeholderUz String?
  placeholderRu String?
  createdAt     DateTime @default(now())

  answers       Answer[]

  @@index([positionId, order])
}

model Application {
  id           String   @id @default(cuid())
  refCode      String   @unique
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  positionId   String
  position     Position @relation(fields: [positionId], references: [id])
  status       AppStatus @default(DRAFT)

  photoFilePath String?
  cvFilePath    String?
  pdfFilePath   String?

  channelMessageId String?
  channelChatId    String?

  rejectReason String?

  createdAt    DateTime @default(now())
  submittedAt  DateTime?
  updatedAt    DateTime @updatedAt

  answers      Answer[]
  statusHistory ApplicationStatusHistory[]

  @@index([userId])
  @@index([positionId, status])
  @@index([status, createdAt])
}

model Answer {
  id            String   @id @default(cuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  questionId    String
  question      Question @relation(fields: [questionId], references: [id])
  valueText     String?
  valueNumber   Float?
  valueDate     DateTime?
  valueJson     Json?
  filePath      String?
  createdAt     DateTime @default(now())

  @@unique([applicationId, questionId])
}

model ApplicationStatusHistory {
  id            String   @id @default(cuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  fromStatus    AppStatus?
  toStatus      AppStatus
  changedById   String?
  changedBy     User?    @relation(fields: [changedById], references: [id])
  reason        String?
  createdAt     DateTime @default(now())

  @@index([applicationId])
}

model AdminLog {
  id        String   @id @default(cuid())
  adminId   String
  admin     User     @relation(fields: [adminId], references: [id])
  action    String
  entity    String
  entityId  String?
  details   Json?
  createdAt DateTime @default(now())

  @@index([adminId, createdAt])
}

model Counter {
  // ariza qisqa kodi uchun ("HR-2026-XXXX") bir nechta sequence
  key   String @id
  value Int    @default(0)
}
```

---

## 7. Yakuniy qarorlar (foydalanuvchi tasdiqladi)

| # | Mavzu | Qaror |
|---|---|---|
| 1 | Maxfiylik rozilik tugmasi | ✅ Bor (anketadan oldin majburiy) |
| 2 | Anti-spam / rate limit | ❌ Hozircha cheklov yo'q |
| 3 | Vakansiya muddati / o'rinlar soni | ❌ Hozircha yo'q (qo'shish oson, kelajak uchun ochiq) |
| 4 | Maosh / joylashuv / ish turi / tajriba | ✅ Lavozim modeliga qo'shildi |
| 5 | Draft saqlash | ✅ Bor |
| 6 | Fayl saqlash | ✅ Local `./files/` papkaga (S3 keyinroq) |
| 7 | PDF + kanalga yuborish | ✅ Har **kompaniya uchun alohida kanal** |
| 8 | Adminga real-time bildirishnoma | ✅ Kanal orqali (admin DM ham ixtiyoriy) |
| 9 | Deep link | ✅ `t.me/bot?start=position_<id>` |
| 10 | CI/CD | ✅ GitHub Actions |
| 11 | Admin UX (multi-admin, soft delete, setup wizard) | ✅ Hammasi |
| 12 | Performance (Redis, indexlar) | ✅ Bor |
| 13 | Lokalizatsiya | uz formatida |
| 14 | `/help` komandasi | ✅ Bor |
| 15 | Web admin panel | ✅ Bosqich 2 (API hozirdan tayyorlanadi) |
| 16 | Telegram Mini App | ✅ Bosqich 2 |

### MVP uchun mantiqiy taxminlar (keyin o'zgartirilishi mumkin)
- **Foydalanuvchi profili** — bir marta to'ldiriladi va qayta ishlatiladi (ha)
- **CV** — alohida `requireCv` flag (lavozim sozlamasida)
- **Ariza qisqa kodi** — `HR-2026-NNNN`
- **Edit/Withdraw** — yuborilgandan 24 soat ichida qaytarib olish; tahrirlash yo'q
- **HR templates / interview / quiz** — Bosqich 2
- **Skip optional / progress bar / orqaga qaytish** — bor
- **Cooldown** — yo'q
- **Webhook/polling** — dev: polling, prod: webhook
- **Sessiya storage** — Redis (`@grammyjs/storage-redis`)

---

## 8. Validatsiya

| Type | Validatsiya |
|---|---|
| TEXT | minLength, maxLength, regex |
| LONG_TEXT | maxLength (default 2000) |
| NUMBER | min, max, integer |
| DATE | `DD.MM.YYYY` format |
| PHONE | Telegram contact button **yoki** `+998XXXXXXXXX` regex |
| EMAIL | Standart email regex |
| SINGLE_CHOICE | Tanlovlar `options` da, foydalanuvchi 1 ta tanlaydi |
| MULTI_CHOICE | Bir nechta tanlanadi, "✅ Tugatish" tugmasi |
| FILE | maxSize (10 MB), allowedMime |
| PHOTO | faqat rasm, maxSize (10 MB) |
| BOOLEAN | "Ha" / "Yo'q" |
| LOCATION | Telegram location button |

---

## 9. Loyiha tuzilmasi

```
new_hr/
├── src/
│   ├── index.ts                    // entry point
│   ├── bot.ts                      // grammY bot instance
│   ├── config/
│   │   └── env.ts                  // Zod env validatsiya
│   ├── locales/
│   │   ├── uz.ftl
│   │   └── ru.ftl
│   ├── types/
│   │   └── context.ts              // MyContext, SessionData
│   ├── middlewares/
│   │   ├── auth.ts                 // user upsert + consent check
│   │   ├── admin.ts
│   │   └── i18n.ts
│   ├── keyboards/
│   │   ├── main-menu.ts
│   │   ├── language.ts
│   │   ├── consent.ts
│   │   └── admin.ts
│   ├── handlers/
│   │   ├── start.ts
│   │   ├── help.ts
│   │   ├── language.ts
│   │   ├── consent.ts
│   │   ├── profile.ts
│   │   ├── application/
│   │   │   ├── index.ts            // composer
│   │   │   ├── company.ts
│   │   │   ├── department.ts
│   │   │   ├── position.ts
│   │   │   ├── questionnaire.ts    // conversation
│   │   │   └── confirm.ts
│   │   ├── my-applications.ts
│   │   └── admin/
│   │       ├── index.ts
│   │       ├── companies.ts
│   │       ├── departments.ts
│   │       ├── positions.ts
│   │       ├── questions.ts
│   │       ├── applications.ts
│   │       ├── stats.ts
│   │       ├── users.ts
│   │       └── action-log.ts
│   ├── services/
│   │   ├── prisma.ts               // singleton client
│   │   ├── user.service.ts
│   │   ├── company.service.ts
│   │   ├── department.service.ts
│   │   ├── position.service.ts
│   │   ├── application.service.ts
│   │   ├── pdf.service.ts          // Puppeteer
│   │   ├── channel.service.ts      // PDF + xabarni kanalga jo'natish
│   │   ├── ref-code.service.ts
│   │   └── export.service.ts       // ExcelJS
│   ├── templates/
│   │   └── application-pdf.html.ts // PDF template
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   ├── pagination.ts
│   │   └── files.ts                // multer-like saqlash
│   └── jobs/
│       └── cleanup.ts              // eski draftlarni tozalash (kelajak)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── files/                          // .gitignore (yuklangan fayllar)
│   ├── photos/
│   ├── cvs/
│   ├── logos/
│   └── pdfs/
├── locales/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── package.json
└── README.md
```

---

## 10. ENV o'zgaruvchilari

```bash
# Bot
BOT_TOKEN=
BOT_MODE=polling           # polling | webhook
WEBHOOK_URL=               # https://... (faqat webhook bo'lsa)
WEBHOOK_SECRET=            # webhook secret token

# Admins
ADMIN_IDS=123456,789012    # vergul bilan

# Database
DATABASE_URL=postgresql://hr:hr@localhost:5432/hr?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Files
FILES_DIR=./files
MAX_FILE_SIZE_MB=10

# Logging
LOG_LEVEL=info             # trace | debug | info | warn | error
NODE_ENV=development

# Sentry (ixtiyoriy)
SENTRY_DSN=
```

---

## 11. Bosqichlar

### Bosqich 1 — MVP
- Til + rozilik
- Foydalanuvchi profili
- Anketa flow (kompaniya → bo'lim → lavozim → savollar → rasm/CV → tasdiqlash)
- PDF generatsiya + kompaniya kanaliga yuborish
- Draft saqlash + davom ettirish
- Admin: CRUD kompaniya/bo'lim/lavozim/savol
- Admin: arizalarni ko'rish, status o'zgartirish, Excel export
- Soft delete + tiklash
- Action log
- Multi-admin
- Setup wizard
- `/help`, `/cancel`, `/start`
- Deep link
- Redis sessiya + kesh
- Docker compose
- GitHub Actions

### Bosqich 2
- Web admin panel (Next.js)
- Telegram Mini App (anketa to'ldirish uchun)
- Suhbat tayinlash
- HR shablonlari
- HR Manager roli (kompaniya admini)
- Statistika dashboard
- Bildirishnoma sozlamalari (foydalanuvchi)

### Bosqich 3
- Quiz/disqualifikatsiya savollari
- S3 fayl saqlash
- Bildirishnoma odda mos lavozim chiqqanda
- Lavozim qidiruv + filter
- Bookmark
- Featured / pinned

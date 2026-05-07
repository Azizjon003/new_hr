# HR Bot

Telegram HR bot — kompaniya / bo'lim / lavozim anketasi (uz/ru).

## Stack

Node.js 20+, TypeScript, grammY, Prisma, PostgreSQL, Redis, pdfmake (PDF), ExcelJS.

## Ishga tushirish — Local dev

```bash
# 1. Bog'liqliklarni o'rnatish
npm install

# 2. .env ni sozlash
cp .env.example .env
# BOT_TOKEN va ADMIN_IDS ni to'ldiring

# 3. Postgres + Redis ni ko'tarish
docker compose up -d postgres redis

# 4. Prisma migratsiya
npx prisma migrate dev --name init
npx prisma generate

# 5. (ixtiyoriy) sample ma'lumotlar
npm run seed

# 6. Botni ishga tushirish (hot reload)
npm run dev
```

## Ishga tushirish — Production (Docker)

To'liq stack (bot + postgres + redis) docker ichida:

```bash
# 1. .env ni sozlang (BOT_TOKEN, ADMIN_IDS)
cp .env.example .env

# 2. Image build qilish va botni ishga tushirish
docker compose --profile prod up -d --build

# Loglarni ko'rish
docker compose logs -f bot

# To'xtatish
docker compose --profile prod down
```

### Compose profillari

| Buyruq | Nima ishga tushadi |
|---|---|
| `docker compose up -d` | postgres + redis (lokal dev uchun) |
| `docker compose --profile prod up -d` | postgres + redis + bot |
| `docker compose --profile tools up -d` | postgres + redis + pgAdmin (`localhost:5050`) |
| `docker compose --profile prod --profile tools up -d` | hammasi |

### Docker volumelar

- `hr_pg_data` — Postgres ma'lumotlari
- `hr_redis_data` — Redis cache + sessiyalar
- `./files` — yuklangan rasmlar / CV / PDF lar (host papkasiga bog'langan)

### Migration prod da

`Dockerfile` da `CMD` shunday: `npx prisma migrate deploy && node dist/index.js`. Ya'ni bot startup paytida avtomatik migration qo'llanadi.

## Birinchi sozlash

1. Botni ishga tushiring va `/start` qiling
2. Til tanlang va rozilik bering
3. Telegram ID ni `.env` `ADMIN_IDS` ga qo'shing
4. Botni qayta ishga tushiring (yoki `seedAdminsFromEnv` avtomatik seed qiladi)
5. `/admin` → ⚙️ Sozlash sehrgari (yoki qo'lda Kompaniya → Bo'lim → Lavozim → Savollar)
6. Telegram kanal yarating, botni admin qiling, kanal ID ni kompaniyaga ulang
7. Anketa savollarini Excel shablon orqali yoki shablonlardan tanlab qo'shing

## Foydalanuvchi tomoni

- 📝 Anketa topshirish (kompaniya → bo'lim → lavozim → savollar)
- 👤 Profil (qayta ishlatiladigan)
- 📂 Mening arizalarim (filter, pagination, PDF yuklab olish, qaytarib olish)
- 🌐 Til o'zgartirish (uz/ru)
- ❓ Yordam

## Admin tomoni

- 🏢 Kompaniyalar (CRUD + kanal sozlash)
- 🗂 Bo'limlar / 💼 Lavozimlar / ❓ Savollar — hierarchik navigatsiya
- 📋 Savollar uchun: tayyor shablonlar + Excel import/export
- 📨 Arizalar — filter, pagination, status boshqaruv
- 📊 Excel export + 📄 batch PDF (filter va scope bo'yicha)
- 👥 Foydalanuvchilar (qidirish, bloklash, xabar)
- 👤 Adminlar boshqaruvi (DB-asosli)
- 🗑 Soft-delete tiklash
- 📜 Action log
- ⚙️ Setup wizard

## NPM skriptlar

| Skript | Maqsad |
|---|---|
| `npm run dev` | Watch rejimida ishga tushirish |
| `npm run build` | TypeScript ni `dist/` ga build qilish |
| `npm start` | Build qilingan kodni ishlatish |
| `npm run typecheck` | TS xatolarini tekshirish |
| `npm run lint` | ESLint |
| `npm run seed` | Sample ma'lumotlar |
| `npm run seed:reset` | DB tozalab qaytadan seed |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:deploy` | `prisma migrate deploy` (prod) |
| `npm run prisma:studio` | DB browser GUI (`localhost:5555`) |

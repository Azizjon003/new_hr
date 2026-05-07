# ========== Stage 1: deps ==========
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ========== Stage 2: build ==========
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate
RUN npm run build

# ========== Stage 3: runner (production) ==========
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# node_modules ni build dan ko'chiramiz (prisma CLI, tsx — runtime da kerak)
COPY package.json package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules

# Prisma schema + migrations (migrate deploy uchun)
COPY --from=build /app/prisma ./prisma

# Tuzilgan kod
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/locales ./dist/locales

# Fayllar uchun papkalar (volume orqali bog'lanadi)
RUN mkdir -p /app/files/photos /app/files/cvs /app/files/files /app/files/logos /app/files/pdfs

# Migration + start
CMD sh -c "npx prisma migrate deploy && node dist/index.js"

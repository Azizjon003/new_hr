# ========== Stage 1: deps ==========
FROM node:20-slim AS deps
WORKDIR /app
# Prisma uchun OpenSSL kerak
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

# ========== Stage 2: build ==========
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
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

# Runtime ham OpenSSL kerak (migrate va Prisma client uchun)
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/locales ./dist/locales

RUN mkdir -p /app/files/photos /app/files/cvs /app/files/files /app/files/logos /app/files/pdfs

CMD sh -c "npx prisma migrate deploy && node dist/index.js"

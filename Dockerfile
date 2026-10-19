# syntax=docker/dockerfile:1

# ---------- Сборка: зависимости + vite build ----------
FROM node:24-alpine AS builder

# pnpm той же версии, что в packageManager (package.json)
RUN corepack enable
# Без .git хук husky из "prepare" не нужен
ENV HUSKY=0

WORKDIR /app

# Только манифесты — слой с зависимостями кэшируется, пока не меняется lock-файл.
# Сами пакеты лежат в cache mount и переживают пересборки
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

COPY . .

# Адрес API вшивается в бандл при сборке: Vite заменяет import.meta.env.VITE_*
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Заранее сжатые копии — nginx отдаёт их через gzip_static, не тратя CPU на каждый запрос
RUN pnpm build \
 && find dist -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.svg' -o -name '*.json' \) \
      -exec gzip -9 -k {} +

# ---------- Рантайм: только nginx и статика ----------
# unprivileged — nginx без root, слушает 5173
FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:5173/healthz || exit 1

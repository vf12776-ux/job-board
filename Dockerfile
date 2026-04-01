FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Устанавливаем компиляторы для sqlite3
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Копируем package.json и lock-файл
COPY package*.json ./

# Устанавливаем все зависимости (включая dev, т.к. нужны для сборки фронта)
RUN npm ci

# Принудительно пересобираем sqlite3 под glibc контейнера
RUN npm rebuild sqlite3 --build-from-source

# Копируем весь исходный код
COPY . .

# Собираем фронтенд (если скрипт называется "build")
RUN npm run build

# --- Второй этап: production ---
FROM node:20-bullseye-slim

WORKDIR /app

# Копируем только production зависимости и собранные файлы
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "backend/server.js"]
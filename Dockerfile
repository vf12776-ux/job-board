FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Устанавливаем компиляторы для sqlite3
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Копируем package.json и lock-файлы (включая backend и frontend)
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Устанавливаем корневые зависимости, но не запускаем postinstall
RUN npm ci --ignore-scripts

# Устанавливаем зависимости для backend с пересборкой sqlite3
WORKDIR /app/backend
RUN npm ci --ignore-scripts && npm rebuild sqlite3 --build-from-source

# Устанавливаем зависимости для frontend
WORKDIR /app/frontend
RUN npm ci --ignore-scripts

# Копируем весь исходный код (кроме node_modules, они уже есть)
WORKDIR /app
COPY backend ./backend
COPY frontend ./frontend

# Собираем фронтенд
WORKDIR /app/frontend
RUN npm run build

# --- Второй этап: production ---
FROM node:20-bullseye-slim

WORKDIR /app

# Копируем бэкенд с уже установленными модулями
COPY --from=builder /app/backend /app/backend

# Копируем собранный фронтенд
COPY --from=builder /app/frontend/dist /app/frontend/dist

# Опционально: копируем корневой package.json (на всякий случай)
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "backend/server.js"]
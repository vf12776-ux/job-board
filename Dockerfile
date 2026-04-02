FROM node:20-bullseye-slim AS builder

# Устанавливаем Python и компиляторы для сборки sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем package.json'и для кеширования слоёв
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY package*.json ./

# Устанавливаем зависимости бэкенда (сборка sqlite3 пройдёт)
RUN cd backend && npm install

# Копируем исходники фронтенда
COPY frontend ./frontend

# Собираем фронтенд (PWA остаётся)
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps
RUN npm run build

# Финальный образ (без компиляторов, только runtime)
FROM node:20-bullseye-slim

WORKDIR /app

# Копируем уже собранный бэкенд и его node_modules
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Копируем собранную статику фронтенда
COPY --from=builder /app/backend/public ./backend/public

# Копируем package.json для порядка
COPY backend/package*.json ./backend/

WORKDIR /app/backend

# Устанавливаем production зависимости, но НЕ запускаем скрипты (sqlite3 уже собран)
RUN npm install --omit=dev --ignore-scripts

EXPOSE 10000
CMD ["node", "server.js"]
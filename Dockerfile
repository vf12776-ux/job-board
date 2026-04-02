FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Копируем package.json для бэкенда и фронтенда
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY package*.json ./

# Устанавливаем зависимости бэкенда (для сборки не обязательно, но пусть будут)
RUN cd backend && npm install

# Устанавливаем зависимости фронтенда и собираем его
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps
RUN npm run build

# Финальный образ
FROM node:20-bullseye-slim

WORKDIR /app

# Копируем бэкенд и его зависимости
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Копируем собранный фронтенд
COPY --from=builder /app/backend/public ./backend/public

# Копируем package.json бэкенда (для запуска)
COPY backend/package*.json ./backend/

WORKDIR /app/backend

# Устанавливаем production зависимости бэкенда (на всякий случай)
RUN npm install --omit=dev

EXPOSE 10000
CMD ["node", "server.js"]
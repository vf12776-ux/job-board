FROM node:20-bullseye-slim AS builder

# Устанавливаем Python и build-essential для sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем package.json для бэкенда и фронтенда
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY package*.json ./

# Устанавливаем зависимости бэкенда (теперь Python есть)
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

# Копируем package.json бэкенда (на всякий случай)
COPY backend/package*.json ./backend/

WORKDIR /app/backend

# Устанавливаем production зависимости бэкенда (sqlite3 уже собран)
RUN npm install --omit=dev

EXPOSE 10000
CMD ["node", "server.js"]
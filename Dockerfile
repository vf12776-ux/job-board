FROM node:20-bullseye-slim AS builder

# Устанавливаем Python и компиляторы для sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем package.json для кеширования слоёв
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY package*.json ./

# Устанавливаем зависимости бэкенда (sqlite3 соберётся)
RUN cd backend && npm install

# Копируем ВЕСЬ код бэкенда (включая server.js)
COPY backend ./backend

# Копируем исходники фронтенда
COPY frontend ./frontend

# Собираем фронтенд
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps
RUN npm run build

# Финальный образ (только runtime)
FROM node:20-bullseye-slim

WORKDIR /app

# Копируем всю папку бэкенда (код + node_modules)
COPY --from=builder /app/backend ./backend

# Собранный фронтенд уже внутри backend/public (скопируется выше)

WORKDIR /app/backend

# Устанавливаем production зависимости, но не пересобираем sqlite3
RUN npm install --omit=dev --ignore-scripts

EXPOSE 10000
CMD ["node", "server.js"]
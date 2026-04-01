FROM node:20-bullseye-slim AS builder
WORKDIR /app

# Устанавливаем зависимости для сборки sqlite3
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY backend ./backend
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps
RUN npm run build

FROM node:20-bullseye-slim
WORKDIR /app

# Устанавливаем зависимости для работы sqlite3
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./public
COPY --from=builder /app/package*.json ./
RUN npm install --production && npm rebuild sqlite3 --build-from-source

EXPOSE 3000
CMD ["node", "backend/server.js"]
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package*.json backend/
COPY frontend/package*.json frontend/
COPY package*.json ./

RUN cd backend && npm install

COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps
RUN npm run build

FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/backend ./backend
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/public ./backend/public

EXPOSE 10000
CMD ["node", "backend/server.js"]

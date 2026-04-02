FROM node:20-slim

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json backend/
COPY frontend/package*.json frontend/

RUN npm install && \
    cd backend && npm install --omit=dev && \
    cd ../frontend && npm install --legacy-peer-deps

COPY . .

RUN cd frontend && npm run build

EXPOSE 10000

CMD ["node", "backend/server.js"]

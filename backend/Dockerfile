FROM oven/bun:1-slim

WORKDIR /app

COPY package.json bun.lock ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN bun install --frozen-lockfile --production

COPY backend backend

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "src/index.ts"]

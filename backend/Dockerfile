FROM oven/bun:1.3.14-slim

WORKDIR /app

COPY package.json bun.lock ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN bun install --frozen-lockfile --production

COPY --chown=bun:bun backend/src backend/src
COPY --chown=bun:bun backend/tsconfig.json backend/tsconfig.json

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3000

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:3000/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["bun", "src/index.ts"]

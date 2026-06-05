FROM oven/bun:1.3.14-slim AS builder
WORKDIR /app
COPY build.ts .
RUN bun build.ts
COPY ./public /app/build
CMD ["bun", "build/server.js"]
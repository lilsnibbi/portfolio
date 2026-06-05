FROM oven/bun:1.3.14-slim AS builder
WORKDIR /app
COPY . .
RUN bun build.ts
COPY ./public ./build

FROM oven/bun:1.3.14-slim
WORKDIR /app
COPY --from=builder ./build .
CMD ["bun", "build/server.js"]
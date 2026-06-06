FROM oven/bun:1.3.14-slim AS builder
WORKDIR /app
COPY . .
RUN bun build.ts

FROM oven/bun:1.3.14-slim
WORKDIR /app
COPY --from=builder /app/build .
CMD ["bun", "server.js"]
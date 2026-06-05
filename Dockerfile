FROM oven/bun:1.3.14-slim AS builder
WORKDIR /app
RUN bun build.ts
COPY ./public /app/build

FROM oven/bun:1.3.14-slim
WORKDIR /app
COPY --from=builder ./build .
ENV NODE_ENV=production
CMD [ "bun", "build/server.js" ]
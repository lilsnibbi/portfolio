FROM oven/bun:1.4.4 AS base
WORKDIR /app

# Build Tailwind styles and Bun browser/server bundles with development dependencies.
FROM base AS build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY config.ts tsconfig.json ./
COPY app ./app
COPY src ./src
COPY scripts ./scripts
RUN bun run build

# Keep runtime dependencies separate from the build toolchain.
FROM base AS production-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base AS runner
ENV NODE_ENV=production

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json config.ts ./
COPY src/content ./src/content
COPY public ./public

EXPOSE 3000

# One native Bun server serves the API, static assets, and React Router SSR.
CMD ["bun", "build/server/index.js"]

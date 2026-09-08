# Step 1: Install production dependencies
FROM oven/bun:1.4.2 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Step 2: Final runner image
FROM oven/bun:1.4.2
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json config.ts ./
COPY src ./src
COPY public ./public

EXPOSE 3000

ENV NODE_ENV=production

# Bun runs the TypeScript source directly, no build step
CMD ["bun", "src/server.ts"]

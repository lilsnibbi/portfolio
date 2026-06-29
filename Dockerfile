# Step 1: Base builder image
FROM oven/bun:1.3.14 AS builder
WORKDIR /app

# Copy dependency files to cache the installation layer
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies needed for compiling/building)
RUN bun install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Run build.ts to bundle src/server.ts and public assets
RUN bun build.ts

# Prune node_modules to keep only production dependencies
RUN bun install --production

# Step 2: Final runner image
FROM oven/bun:1.3.14-slim
WORKDIR /app

# Copy the build outputs (server.js, config.json, public/)
COPY --from=builder /app/build ./

# Copy only production node_modules
COPY --from=builder /app/node_modules ./node_modules

# Expose port 3000
EXPOSE 3000

# Set production environment variable
ENV NODE_ENV=production

# Start the server
CMD ["bun", "server.js"]
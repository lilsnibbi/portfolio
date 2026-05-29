FROM oven/bun:latest

WORKDIR /app
COPY package.json ./
RUN bun install

COPY . .
RUN rm bun.lock biome.json .gitignore
RUN bun build src/server.ts --minify --target=bun --outdir=build
RUN rm -rf node_modules src

CMD ["bun", "build/server.js"]
FROM oven/bun:1
WORKDIR /app
COPY package*.json ./
RUN bun install
COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app
COPY --from=0 /app/build ./build
COPY --from=0 /app/server ./server
COPY --from=0 /app/package*.json ./
RUN bun install --production
EXPOSE 3000 3355
CMD ["bun", "server/index.js"]
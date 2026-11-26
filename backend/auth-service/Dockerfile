FROM node:22.23.4-alpine

RUN node -e 'if (process.versions.node !== "22.23.4") process.exit(1)'
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY src/ ./src/

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# npm is a build-time tool; its bundled dependency tree is not needed at runtime.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /root/.npm

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3001}/health || exit 1

CMD ["sh", "-c", "node src/config/migrate.js && exec node src/server.js"]

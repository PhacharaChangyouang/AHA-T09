FROM node:22.23.4-alpine AS build
WORKDIR /app
RUN node -e 'if (process.versions.node !== "22.23.4") process.exit(1)'
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
# Academic build has no external provider or production API arguments.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run lint && npm run build

FROM node:22.23.4-alpine AS runtime
WORKDIR /app
RUN node -e 'if (process.versions.node !== "22.23.4") process.exit(1)' \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /root/.npm
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 8080
CMD ["node", "server.js"]

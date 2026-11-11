# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS dependencies
# Native SQLite modules may need to compile when no prebuilt binary is available.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# CI can verify the application independently of the production build.
# The gate is tests AND typecheck (AGENTS.md contract). astro sync generates
# .astro/types.d.ts, which tsc needs in a clean checkout (absent locally it
# only passed because a dev/build had run); tsconfig covers src.
FROM dependencies AS test
RUN npm test && npx astro sync && npx tsc --noEmit

FROM dependencies AS build
RUN npm run build \
    && npm prune --omit=dev \
    && node -e "const db = require('better-sqlite3')(':memory:'); db.close()"

FROM base AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    SQLITE_DB_PATH=/app/data/blog.sqlite \
    UPLOAD_DIR=/app/dist/client/uploads

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p data dist/client/uploads \
    && chown node:node data dist/client/uploads

USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/favicon.svg', { signal: AbortSignal.timeout(4000) }).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Reload the mounted .env on every restart, including changes saved by the admin UI.
CMD ["node", "--env-file-if-exists=.env", "dist/server/entry.mjs"]

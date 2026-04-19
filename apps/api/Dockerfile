# Multi-stage Dockerfile für @salon-os/api
# Build aus Repo-Root: `docker build -f apps/api/Dockerfile -t salon-os-api .`

# ─── Stage 1: deps ──────────────────────────────────────────
FROM node:22-alpine AS deps
RUN npm install -g pnpm@9.15.0
WORKDIR /repo

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
# pnpm-lock.yaml wird beim ersten Deploy automatisch erzeugt.
# Sobald es commited ist, kann hier wieder `--frozen-lockfile` + COPY pnpm-lock.yaml rein.
COPY pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/auth/package.json packages/auth/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY packages/config/package.json packages/config/

RUN pnpm install --filter '@salon-os/api...'

# ─── Stage 2: build ─────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm --filter @salon-os/db db:generate
RUN pnpm --filter "@salon-os/api..." build

# ─── Stage 3: runtime ───────────────────────────────────────
FROM node:22-alpine AS runtime
RUN apk add --no-cache tini
ENV NODE_ENV=production

COPY --from=build /repo /repo
WORKDIR /repo/apps/api

EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "cd /repo/packages/db && npx prisma migrate deploy --schema=./prisma/schema.prisma && npx tsx prisma/seed.ts && cd /repo/apps/api && node dist/main.js"]

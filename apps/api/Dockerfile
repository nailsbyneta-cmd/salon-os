# Multi-stage Dockerfile für @salon-os/api
# Build aus Repo-Root: `docker build -f apps/api/Dockerfile -t salon-os-api .`

# ─── Stage 1: deps ──────────────────────────────────────────
FROM node:22.12-alpine AS deps
RUN corepack enable pnpm
WORKDIR /repo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/auth/package.json packages/auth/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY packages/config/package.json packages/config/

RUN pnpm install --frozen-lockfile --filter '@salon-os/api...'

# ─── Stage 2: build ─────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm --filter @salon-os/db db:generate
RUN pnpm --filter @salon-os/api build

# ─── Stage 3: runtime ───────────────────────────────────────
FROM node:22.12-alpine AS runtime
RUN apk add --no-cache tini
RUN corepack enable pnpm

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /repo/node_modules /app/node_modules
COPY --from=build /repo/apps/api/dist /app/dist
COPY --from=build /repo/apps/api/package.json /app/package.json
COPY --from=build /repo/packages /app/packages

EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]

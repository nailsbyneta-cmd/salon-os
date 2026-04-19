FROM node:22.12-alpine AS deps
RUN corepack enable pnpm
WORKDIR /repo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/

RUN pnpm install --frozen-lockfile --filter '@salon-os/worker...'

FROM deps AS build
COPY . .
RUN pnpm --filter @salon-os/db db:generate
RUN pnpm --filter @salon-os/worker build

FROM node:22.12-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/node_modules /app/node_modules
COPY --from=build /repo/apps/worker/dist /app/dist
COPY --from=build /repo/apps/worker/package.json /app/package.json
COPY --from=build /repo/packages /app/packages

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]

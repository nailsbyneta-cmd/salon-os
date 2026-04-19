FROM node:22-alpine AS deps
RUN npm install -g pnpm@9.15.0
WORKDIR /repo

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/
COPY packages/auth/package.json packages/auth/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
COPY packages/utils/package.json packages/utils/
COPY packages/config/package.json packages/config/

RUN pnpm install --filter '@salon-os/web...'

FROM deps AS build
COPY . .
RUN pnpm --filter "@salon-os/web..." build

FROM node:22-alpine AS runtime
RUN apk add --no-cache tini
ENV NODE_ENV=production

COPY --from=build /repo /repo
WORKDIR /repo/apps/web

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node_modules/.bin/next", "start", "--port", "3000"]

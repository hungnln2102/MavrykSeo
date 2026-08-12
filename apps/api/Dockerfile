FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS installer
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/clickhouse/package.json ./packages/clickhouse/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/seo-core/package.json ./packages/seo-core/package.json
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/packages ./packages
COPY --from=installer /app/apps/api ./apps/api
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json turbo.json ./
COPY packages/clickhouse ./packages/clickhouse
COPY packages/db ./packages/db
COPY packages/seo-core ./packages/seo-core
COPY apps/api ./apps/api

RUN pnpm --filter @seo/db build
RUN pnpm --filter @seo/clickhouse build
RUN pnpm --filter api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

USER node

EXPOSE 3000

CMD ["pnpm", "--filter", "api", "start:prod"]

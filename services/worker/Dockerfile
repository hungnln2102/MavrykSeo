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
COPY services/worker/package.json ./services/worker/package.json

RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/packages ./packages
COPY --from=installer /app/services/worker ./services/worker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json turbo.json ./
COPY packages/clickhouse ./packages/clickhouse
COPY packages/db ./packages/db
COPY packages/seo-core ./packages/seo-core
COPY services/worker ./services/worker

RUN pnpm --filter @seo/db build
RUN pnpm --filter @seo/clickhouse build
RUN pnpm --filter worker build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/worker/dist ./services/worker/dist
COPY --from=builder /app/services/worker/package.json ./services/worker/package.json
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

USER node

CMD ["pnpm", "--filter", "worker", "start:prod"]

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

WORKDIR /app

# Workspace manifests (all needed for frozen-lockfile resolution)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# All package.json files so pnpm resolves the full workspace graph
COPY packages/shared-auth/package.json      ./packages/shared-auth/
COPY packages/shared-events/package.json    ./packages/shared-events/
COPY packages/shared-logger/package.json    ./packages/shared-logger/
COPY packages/shared-rabbitmq/package.json  ./packages/shared-rabbitmq/
COPY packages/shared-testing/package.json   ./packages/shared-testing/
COPY packages/shared-types/package.json     ./packages/shared-types/
COPY apps/audit-service/package.json        ./apps/audit-service/
COPY apps/auth-service/package.json         ./apps/auth-service/
COPY apps/frontend/package.json             ./apps/frontend/
COPY apps/gateway/package.json              ./apps/gateway/
COPY apps/inventory-service/package.json    ./apps/inventory-service/
COPY apps/notification-service/package.json ./apps/notification-service/
COPY apps/product-service/package.json      ./apps/product-service/
COPY apps/report-service/package.json       ./apps/report-service/
COPY apps/sse-service/package.json          ./apps/sse-service/

RUN pnpm install --frozen-lockfile

# Copy source for shared packages + this service only
COPY packages/ ./packages/
COPY apps/product-service/ ./apps/product-service/

# Build shared packages first (services import from their dist/)
RUN pnpm --filter "@inventory/shared-*" build

# Build service
RUN pnpm --filter "@inventory/product-service" build

# Standalone production bundle (workspace deps inlined, no devDeps)
RUN pnpm --filter "@inventory/product-service" deploy --prod /deploy

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /deploy .
EXPOSE 3000
CMD ["node", "dist/index.js"]

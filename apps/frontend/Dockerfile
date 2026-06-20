FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

WORKDIR /app

# Workspace manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# All package.json files for workspace resolution
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

# Copy source for shared-types (frontend imports types) + frontend
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/frontend/ ./apps/frontend/

# Build shared-types first
RUN pnpm --filter "@inventory/shared-types" build

# VITE_API_URL is consumed at build time by vite define()
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter "@inventory/frontend" build

FROM nginx:alpine
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY docker/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

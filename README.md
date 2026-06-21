# Inventory Management System

Monorepo for a distributed inventory management platform built with microservices.

## Architecture

- Monorepo
- Microservices
- Event Driven Architecture
- Clean Architecture
- Repository Pattern
- Test Driven Development (TDD)

## Tech Stack

### Backend

- Node.js 22+
- ExpressJS
- MongoDB
- RabbitMQ
- Swagger OpenAPI
- JWT
- RBAC
- Zod
- Jest
- Supertest
- MongoDB Memory Server

### Frontend

- ReactJS
- Vite
- TailwindCSS
- shadcn/ui (Radix UI primitives + CVA) — Button, Input, Table, Dialog, etc.
- `PrimaryButton` / `SecondaryButton` semantic wrappers (lock variant, enforce intent)
- Sonner (toast notifications)
- React Router
- Axios
- Zustand
- TanStack Query
- React Hook Form
- Zod
- Jest
- React Testing Library

### Infrastructure

- Docker
- Docker Compose
- Nginx

## Repository Structure

```
apps/
- frontend
- gateway
- auth-service
- product-service
- inventory-service
- report-service
- notification-service
- audit-service
- sse-service

packages/
- shared-types
- shared-events
- shared-auth
- shared-rabbitmq
- shared-logger
- shared-testing
```

## Core Modules

- Authentication
- User Management
- Product Management
- Category Management
- Supplier Management
- Stock In
- Stock Out
- Stock Adjustment
- Dashboard
- Reports
- Notifications
- Audit Trail
- Real-Time Updates

## Authentication

Use:

- JWT Access Token
- Refresh Token

JWT Payload

```json
{
  "userId": "...",
  "username": "...",
  "role": "ADMIN|USER"
}
```

Rules

- Access Token in memory
- Refresh Token in HttpOnly Cookie
- Refresh Token Rotation mandatory
- Never store tokens in localStorage

## Authorization

Model: RBAC

Roles:

**ADMIN**
- Full Access

**USER**
- Read Dashboard
- Read Products
- Read Inventory
- Read Reports

Forbidden for USER:

- Product Create/Update/Delete
- Stock In/Out/Adjustment
- User Management

Gateway must enforce RBAC.

## Validation

Use Zod.

Validate:

- Request Body
- Query Params
- Route Params

Validation occurs before business logic.

## Database Rules

Each service owns its own database.

Allowed databases:

- `auth_db`
- `product_db`
- `inventory_db`
- `report_db`
- `audit_db`

Forbidden:

- Cross-service database queries.

## Communication Rules

Synchronous:

- REST

Asynchronous:

- RabbitMQ

Services never communicate through shared databases.

## Events

### Stock Events

- `stock.in.created`
- `stock.out.created`
- `stock.adjustment.created`
- `stock.low.detected`

### Product Events

- `product.created`
- `product.updated`
- `product.deleted`

### User Events

- `user.created`
- `user.updated`

## RabbitMQ Rules

Dead Letter Queue mandatory.

Queue naming: `{exchange}.{eventType}.{serviceId}.queue`
DLQ naming: `{exchange}.{eventType}.{serviceId}.queue.dlq`

Examples:

- `inventory.events.product.created.report.queue` / `.dlq`
- `inventory.events.stock.out.created.notification.queue` / `.dlq`
- `inventory.events.audit.logged.audit.queue` / `.dlq`

Failed messages must be routed to DLQ.

## Event Bus

Services depend on `EventBus` abstraction.

Never couple business logic directly to RabbitMQ.

**Each service must pass its own `serviceId`** when constructing `EventBus`. This ensures each subscriber gets a dedicated queue per event type (pub/sub fan-out, not competing consumers).

```typescript
// Each service uses a unique serviceId
new EventBus(rabbitConn, exchange, 'report')
new EventBus(rabbitConn, exchange, 'inventory')
new EventBus(rabbitConn, exchange, 'audit')
```

Queue naming convention: `{exchange}.{eventType}.{serviceId}.queue`

Example: `inventory.events.product.created.report.queue` — report-service only.

**Never reuse queue names across services** — competing consumers cause messages to be delivered to only one subscriber (round-robin).

## Server-Sent Events (SSE)

Only SSE Service manages SSE connections.

Endpoint:

```
GET /events
```

Supported Events:

- `stock-in`
- `stock-out`
- `low-stock`
- `notification`

Requirements:

- JWT Protected
- Auto Reconnect
- Heartbeat
- Event Validation

## Audit Service

Database: `audit_db`

Responsibilities:

- Consume audit events
- Store immutable audit logs
- Search audit logs
- Filter audit logs

Audit records:

- Never updated
- Never deleted

Audit fields:

- correlationId
- userId
- username
- role
- action
- resourceType
- resourceId
- before
- after
- metadata
- createdAt

## Idempotency

Mutation endpoints must support:

```
Idempotency-Key: <unique-key>
```

Applicable endpoints:

- Product Create
- User Create
- Stock In
- Stock Out
- Stock Adjustment

Duplicate requests with same key must not execute twice.

## Soft Delete

Mandatory for:

- Products
- Categories
- Suppliers
- Users

Fields:

- `deletedAt`
- `deletedBy`

Never hard delete business data.

## Pagination

List endpoints support:

- `page`
- `limit`
- `search`
- `sort`
- `order`

Response format:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## API Gateway

Responsibilities:

- JWT Validation
- RBAC Validation
- Reverse Proxy
- Rate Limiting
- Correlation ID
- Logging
- CORS

Rate Limits:

- Auth APIs: 10 req/min
- General APIs: 100 req/min
- SSE: 5 connections/user

## API Documentation

Every service must expose:

```
GET /health
GET /api-docs
```

OpenAPI documentation mandatory.

## Logging

Generate `X-Correlation-ID` in Gateway.

Propagate through:

- REST
- RabbitMQ
- SSE

Use structured JSON logging.

## Testing

TDD mandatory.

Workflow:

1. Red (write failing test)
2. Green (minimal implementation)
3. Refactor

No business logic before tests.

Coverage thresholds:

- Statements >= 80%
- Functions >= 80%
- Branches >= 70%
- Lines >= 80%

Required test types:

- Unit Tests
- Integration Tests

### Backend Testing Stack

- Jest
- Supertest
- MongoDB Memory Server

### Frontend Testing Stack

- Jest
- React Testing Library
- MSW

Testing scope:

- Components
- Hooks
- Stores
- Pages
- Forms
- Role Guards

## Seed Data

Development only.

Users:

- `admin@example.com` / `admin123` (ADMIN role)
- `user@example.com` / `user123` (USER role)

## CI/CD Pipeline

Implemented in `.github/workflows/ci.yml` (GitHub Actions).

Quality gates in order:

```
Lint            — ESLint + Prettier + TypeScript type-check
↓
Test & Coverage — Jest (unit + integration) + coverage gate ≥80%
↓
Build           — pnpm build all packages and services
↓
Docker Build    — parallel matrix build of all 9 service images
↓
Smoke Test      — docker compose up, health check all services
```

Pipeline fails if any stage fails. Triggered on push/PR to `main` and `develop`.

## Definition of Done

Feature complete only if:

- Tests written
- Tests passing
- Coverage achieved
- Swagger updated
- Documentation updated
- Docker build passes
- Health check passes
- Audit event generated

## Development Principles

- Prefer simplicity
- Avoid over-engineering
- Favor maintainability
- Optimize for small-to-medium fullstack teams

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 8+
- Docker & Docker Compose
- RabbitMQ (if running locally without Docker)
- MongoDB (if running locally without Docker)

### Local Development

1. **Clone and install dependencies**

```bash
git clone <repo-url>
cd inventory-management
pnpm install
```

2. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your local configuration
```

3. **Start all services**

```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Or start individual services
pnpm --filter gateway dev
pnpm --filter product-service dev
```

4. **Access the application**

- Gateway API: `http://localhost:3000`
- Frontend: `http://localhost:3001`
- RabbitMQ Management: `http://localhost:15672` (admin/admin123)
- Health checks: `GET /health` on each service
- API Docs: `GET /api-docs` on each service

### Running Tests

```bash
# All tests
pnpm test

# With coverage (enforces 80% thresholds)
pnpm test:coverage
```

## Configuration

Environment variables are centralized in each service's `src/config.ts`.

Common config:

- `DATABASE_URL` - MongoDB connection string (per-service db)
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - Auth token signing key (**required** in all services — no fallback)
- `JWT_REFRESH_SECRET` - Refresh token signing key (auth-service only)
- `PORT` - Service port
- `NODE_ENV` - `development` | `production`
- `CORS_ORIGIN` - Allowed CORS origins
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (ms)
- `RATE_LIMIT_MAX_REQUESTS` - Rate limit max requests
- `CORRELATION_ID_HEADER` - Header name for correlation ID

> `JWT_SECRET` must be identical across all services (gateway, auth-service, report-service, notification-service, sse-service). A mismatch causes 401 errors on authenticated routes even with a valid token.

## API Endpoints

### Public Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout (blacklist refresh token)
- `GET /health` - Health check

### Authenticated Endpoints (require Bearer token)

**Users** (proxied to auth-service, ADMIN only)
- `GET /users` - List users (paginated, searchable)
- `GET /users/:id` - Get user details
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Soft delete user

**Products** (proxied to product-service)
- `GET /products` - List products (paginated, searchable)
- `GET /products/:id` - Get product details
- `POST /products` - Create product (ADMIN only)
- `PUT /products/:id` - Update product (ADMIN only)
- `DELETE /products/:id` - Soft delete product (ADMIN only)

**Categories** (proxied to product-service)
- `GET /categories` - List categories (paginated, searchable)
- `GET /categories/:id` - Get category details
- `POST /categories` - Create category (ADMIN only)
- `PUT /categories/:id` - Update category (ADMIN only)
- `DELETE /categories/:id` - Soft delete category (ADMIN only)

**Suppliers** (proxied to product-service)
- `GET /suppliers` - List suppliers (paginated, searchable)
- `GET /suppliers/:id` - Get supplier details
- `POST /suppliers` - Create supplier (ADMIN only)
- `PUT /suppliers/:id` - Update supplier (ADMIN only)
- `DELETE /suppliers/:id` - Soft delete supplier (ADMIN only)

**Inventory** (proxied to inventory-service)
- `GET /inventory` - List inventory levels (ADMIN only)
- `GET /inventory/:productId` - Get inventory for product
- `POST /inventory/stock-in` - Record stock in (ADMIN only)
- `POST /inventory/stock-out` - Record stock out (ADMIN only)
- `POST /inventory/adjust` - Adjust stock (ADMIN only)

**Reports** (proxied to report-service)
- `GET /reports/dashboard` - Dashboard metrics (USER and above)
- `GET /reports/sales` - Sales reports (ADMIN only)
- `GET /reports/inventory-valuation` - Inventory valuation (ADMIN only)
- `GET /reports/low-stock` - Low stock report (USER and above)

**Notifications** (proxied to notification-service)
- `GET /notifications` - List user notifications (authenticated)
- `PATCH /notifications/:id/read` - Mark notification as read

**Audit** (proxied to audit-service, ADMIN only)
- `GET /audit` - List audit logs with filters
- `GET /audit/:id` - Get audit log entry
- `GET /audit/correlation/:correlationId` - Trace distributed transaction

### SSE Endpoints

- `GET /events` - Real-time events (JWT protected)

## Contributing

1. Fork the repo
2. Create a feature branch
3. Write tests first (TDD)
4. Implement changes
5. Run tests and ensure coverage thresholds met
6. Run `docker compose build` to verify build
7. Submit a pull request

## License

MIT

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
- React Router
- Axios
- Zustand
- TanStack Query
- React Hook Form
- Zod
- Jest
- React Testing Library
- MSW

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

Examples:

- `inventory.dlq`
- `notification.dlq`
- `audit.dlq`

Failed messages must be routed to DLQ.

## Event Bus

Services depend on `EventBus` abstraction.

Never couple business logic directly to RabbitMQ.

Example:

```typescript
EventBus
RabbitMQEventBus
```

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

Quality gates in order:

```
Lint
↓
Unit Test
↓
Integration Test
↓
Coverage Check
↓
Build
↓
Docker Build
↓
Docker Compose Smoke Test
```

Pipeline fails if any stage fails.

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

4. **Access the API**

- Gateway: `http://localhost:3000`
- Frontend: `http://localhost:5173` (if running)
- Health checks: `GET /health` on each service
- API Docs: `GET /api-docs` on each service

### Running Tests

```bash
# All services
pnpm test

# Specific service
pnpm --filter product-service test

# With coverage
pnpm --filter product-service test:cov
```

## Configuration

Environment variables are centralized in each service's `src/config.ts`.

Common config:

- `DATABASE_URL` - MongoDB connection string (per-service db)
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - Auth token signing key
- `JWT_REFRESH_SECRET` - Refresh token signing key
- `PORT` - Service port
- `NODE_ENV` - `development` | `production`
- `CORS_ORIGIN` - Allowed CORS origins
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (ms)
- `RATE_LIMIT_MAX_REQUESTS` - Rate limit max requests
- `CORRELATION_ID_HEADER` - Header name for correlation ID

## API Endpoints

### Public Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout (blacklist refresh token)
- `GET /health` - Health check

### Authenticated Endpoints (require Bearer token)

- `GET /products` - List products (paginated, searchable)
- `GET /products/:id` - Get product details
- `POST /products` - Create product (ADMIN only)
- `PUT /products/:id` - Update product (ADMIN only)
- `DELETE /products/:id` - Soft delete product (ADMIN only)

- `GET /inventory` - List inventory levels (ADMIN only)
- `GET /inventory/:productId` - Get inventory for product
- `POST /inventory/stock-in` - Record stock in (ADMIN only)
- `POST /inventory/stock-out` - Record stock out (ADMIN only)
- `POST /inventory/adjust` - Adjust stock (ADMIN only)

- `GET /reports/dashboard` - Dashboard metrics (USER and above)
- `GET /reports/sales` - Sales reports (ADMIN only)
- `GET /reports/inventory-valuation` - Inventory valuation (ADMIN only)
- `GET /reports/low-stock` - Low stock report (USER and above)

- `GET /notifications` - List user notifications (authenticated)
- `PATCH /notifications/:id/read` - Mark notification as read

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

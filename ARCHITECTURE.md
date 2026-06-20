# Architecture Documentation

## Overview

The Inventory Management System is a distributed microservices application following:

- **Event-Driven Architecture** - Asynchronous communication via RabbitMQ
- **Clean Architecture** - Separation of concerns, dependency inversion
- **Repository Pattern** - Data access abstraction per service
- **Monorepo** - Single repository with pnpm workspaces
- **Test-Driven Development** - Tests before implementation

## System Context

```
┌─────────────────────────────────────────────────────────────┐
│                         Users / Clients                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│                    Port: 5173 (dev) / 80 (prod)             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                    │
│                    Port: 3000                               │
│  • JWT Validation  • RBAC  • Rate Limiting  • Proxy        │
└──────────┬────────────────────────────┬────────────────────┘
           │                            │
    ┌──────▼─────────┐         ┌────────▼──────────────────┐
    │   REST API     │         │     SSE Events            │
    │  (Sync Call)   │         │    Port: 3007            │
    └──────┬─────────┘         └──────────────────────────┘
           │
    ┌──────▼─────────────────────────────────────────────┐
    │                RabbitMQ Message Broker             │
    │          (Async Event Distribution)                │
    └──────┬─────────┬──────────┬──────────┬────────────┘
           │         │          │          │
    ┌──────▼──┐ ┌───▼────┐ ┌──▼────┐ ┌───▼─────┐ ┌───▼────┐
    │ Auth    │ │Product │ │Invntry│ │Report   │ │Audit   │
    │ Service │ │Service │ │Service│ │Service  │ │Service │
    │ :3004   │ │:3001   │ │:3002  │ │:3003    │ │:3006   │
    └─────────┘ └────────┘ └───────┘ └─────────┘ └────────┘
           │         │          │          │          │
           └─────────┴──────────┴──────────┴──────────┘
                       │
              ┌───────▼────────┐
              │ Notification   │
              │ Service        │
              │ :3005          │
              └────────────────┘
```

## Microservices

### 1. Frontend (React + Vite)

**Port**: 5173 (dev), 80 (production)

**Responsibilities**:

- User interface
- Client-side state management (Zustand)
- Server state (TanStack Query)
- Form handling (React Hook Form)
- Routing (React Router)

**Database**: None (API-only)

**Packages**: `apps/frontend`

---

### 2. API Gateway

**Port**: 3000

**Responsibilities**:

- JWT token validation (access token from Authorization header)
- RBAC permission checks
- Reverse proxy routing to backend services
- Rate limiting (per endpoint, per user)
- Correlation ID generation (`X-Correlation-ID`)
- Request/response logging (structured JSON)
- CORS handling

**Rate Limits**:

| Resource | Limit |
|-----------|-------|
| Auth APIs | 10 requests/minute |
| General APIs | 100 requests/minute |
| SSE Connections | 5 connections/user |

**Routing Rules**:

```
POST   /auth/*              → auth-service
GET    /products/*          → product-service
GET/PUT/DELETE /inventory/* → inventory-service
GET    /reports/*           → report-service
GET    /notifications/*     → notification-service
GET    /audit/*             → audit-service
GET    /events              → sse-service
```

**Database**: None (API gateway only)

**Packages**: `apps/gateway`

---

### 3. Authentication Service

**Port**: 3004

**Database**: `auth_db` (MongoDB)

**Responsibilities**:

- User registration
- User login (verify credentials)
- Issue JWT access token + refresh token
- Refresh token rotation
- Token blacklist/revocation
- Password hashing (bcrypt)

**JWT Payload**:

```json
{
  "userId": "uuid",
  "username": "user@example.com",
  "role": "ADMIN|USER"
}
```

**Token Strategy**:

- **Access Token**: Stored in memory (frontend state), short-lived (15min)
- **Refresh Token**: Stored in HttpOnly cookie, long-lived (7 days), rotates on use
- **Never** store tokens in localStorage (XSS risk)

**Endpoints**:

- `POST /auth/register` - Create new user
- `POST /auth/login` - Authenticate, issue tokens
- `POST /auth/refresh` - Rotate refresh token, issue new access token
- `POST /auth/logout` - Blacklist refresh token, clear cookie

**Events Emitted**:

- `user.created` (after successful registration)

**Events Consumed**: None

**Packages**: `apps/auth-service`

---

### 4. Product Service

**Port**: 3001

**Database**: `product_db` (MongoDB)

**Responsibilities**:

- Product CRUD (soft delete)
- Category management
- Supplier management
- Product search and filtering

**Collections**:

- `products` - Product documents with embedded category/supplier info
- `categories` - Standalone category collection (for reuse)
- `suppliers` - Standalone supplier collection

**Product Schema**:

```typescript
{
  _id: ObjectId
  name: string
  description?: string
  sku: string (unique)
  price: number
  category: { _id: ObjectId, name: string }
  supplier: { _id: ObjectId, name: string }
  deletedAt?: Date
  deletedBy?: ObjectId
  createdAt: Date
  updatedAt: Date
}
```

**Endpoints**:

- `GET /products?page=1&limit=20&search=...&sort=...&order=asc`
- `GET /products/:id`
- `POST /products` (ADMIN only, idempotency key required)
- `PUT /products/:id` (ADMIN only)
- `DELETE /products/:id` (ADMIN only, soft delete)

**Events Emitted**:

- `product.created`
- `product.updated`
- `product.deleted`

**Events Consumed**: None

**Packages**: `apps/product-service`

---

### 5. Inventory Service

**Port**: 3002

**Database**: `inventory_db` (MongoDB)

**Responsibilities**:

- Track stock levels per product
- Record stock-in operations (purchase, return)
- Record stock-out operations (sale, damage, loss)
- Stock adjustments (audit correction)
- Low stock detection and alerting

**Collections**:

- `inventory` - Current stock levels per product
- `stock_transactions` - Immutable ledger of all stock movements

**Inventory Schema**:

```typescript
{
  _id: ObjectId
  productId: ObjectId (ref: products from product-service)
  productName: string (denormalized for convenience)
  sku: string
  quantity: number
  reorderLevel: number
  lastUpdated: Date
}
```

**Stock Transaction Schema**:

```typescript
{
  _id: ObjectId
  transactionId: string (unique, for idempotency)
  type: 'IN' | 'OUT' | 'ADJUST'
  productId: ObjectId
  quantity: number
  reason?: string
  referenceId?: ObjectId (e.g., sale ID, purchase order ID)
  createdBy: ObjectId (userId)
  createdAt: Date
}
```

**Endpoints**:

- `GET /inventory?page=1&limit=20` (ADMIN only)
- `GET /inventory/:productId` (ADMIN only)
- `POST /inventory/stock-in` (ADMIN only, idempotency key required)
- `POST /inventory/stock-out` (ADMIN only, idempotency key required)
- `POST /inventory/adjust` (ADMIN only, idempotency key required)

**Business Rules**:

- Stock-out cannot exceed available quantity (unless allowed by override)
- After stock-in/stock-out/adjust: check if quantity <= reorderLevel, emit `stock.low.detected` if so
- All transactions are immutable and never deleted

**Events Emitted**:

- `stock.in.created` (after stock-in transaction)
- `stock.out.created` (after stock-out transaction)
- `stock.adjustment.created` (after adjustment)
- `stock.low.detected` (when stock <= reorderLevel)

**Events Consumed**:

- `product.created` - Initialize inventory entry with quantity 0
- `product.updated` - Update denormalized productName/SKU
- `product.deleted` - Soft delete inventory entry (set deletedAt)

**Packages**: `apps/inventory-service`

---

### 6. Report Service

**Port**: 3003

**Database**: `report_db` (MongoDB)

**Responsibilities**:

- Dashboard metrics (total products, total inventory value, low stock count)
- Sales reports (from stock-out transactions)
- Inventory valuation reports
- Low stock alerts report

**Collections**:

- `report_cache` - Precomputed reports (with TTL)
- `report_definitions` - Metadata about available reports

**Endpoints**:

- `GET /reports/dashboard` (USER and above)
- `GET /reports/sales?startDate=...&endDate=...` (ADMIN only)
- `GET /reports/inventory-valuation` (ADMIN only)
- `GET /reports/low-stock` (USER and above)

**Events Emitted**: None (pull-based)

**Events Consumed**:

- `stock.in.created` - Invalidate valuation cache
- `stock.out.created` - Invalidate sales/dashboard cache
- `stock.adjustment.created` - Invalidate all caches
- `stock.low.detected` - Invalidate low stock cache

**Caching Strategy**:

- Reports are expensive → cache for 5 minutes
- Invalidate cache on relevant events
- Cache per user role (ADMIN sees all data, USER sees filtered)

**Packages**: `apps/report-service`

---

### 7. Notification Service

**Port**: 3005

**Database**: `audit_db` (MongoDB - shares audit DB, different collections)

**Responsibilities**:

- Send email notifications
- Store notification history
- Queue notifications via RabbitMQ

**Collections**:

- `notifications` - User notification records
- `notification_templates` - Email/SMS templates
- `notification_queue` - Pending notifications (if using DB-backed queue)

**Notifications Types**:

- Low stock alerts (to admins)
- Stock movement confirmations (to users who performed action)
- System alerts

**Endpoints**:

- `GET /notifications` (authenticated, returns notifications for current user)
- `PATCH /notifications/:id/read` - Mark as read

**Events Emitted**: None

**Events Consumed**:

- `stock.low.detected` → Send email to admins
- `stock.in.created` → Send confirmation to user (optional)
- `stock.out.created` → Send confirmation to user (optional)
- `user.created` → Send welcome email

**Error Handling**:

- Failed notifications → retry 3 times with exponential backoff
- After 3 failures → route to `notification.dlq` for manual inspection

**Packages**: `apps/notification-service`

---

### 8. Audit Service

**Port**: 3006

**Database**: `audit_db` (MongoDB)

**Responsibilities**:

- Consume all audit events from RabbitMQ
- Persist immutable audit logs
- Search and filter audit trails
- Provide audit API (for compliance/forensics)

**Collections**:

- `audit_logs` - Immutable audit records

**Audit Log Schema**:

```typescript
{
  _id: ObjectId
  correlationId: string (from gateway, propagated across services)
  userId: ObjectId (who performed action)
  username: string (denormalized for convenience)
  role: string (role at time of action)
  action: string (e.g., 'product.created', 'stock.in.created')
  resourceType: string (e.g., 'Product', 'Inventory', 'User')
  resourceId: ObjectId
  before?: object (snapshot before change)
  after?: object (snapshot after change)
  metadata?: object (IP address, user agent, etc.)
  createdAt: Date (immutable, never modified)
}
```

**Indexes**:

- `{ correlationId: 1 }` (for tracing distributed transactions)
- `{ userId: 1, createdAt: -1 }`
- `{ action: 1, createdAt: -1 }`
- `{ resourceType: 1, resourceId: 1, createdAt: -1 }`

**Endpoints** (ADMIN only):

- `GET /audit?page=1&limit=50&userId=...&action=...&startDate=...&endDate=...`
- `GET /audit/:id`
- `GET /audit/correlation/:correlationId` - Get all events in a distributed transaction

**Events Emitted**: None (sink service)

**Events Consumed**:

**ALL** events from all services → create audit log entry

**Rules**:

- Audit logs are **immutable** (never update, never delete)
- All services must emit audit events for state changes
- Audit service is the single source of truth for "what happened"

**Packages**: `apps/audit-service`

---

### 9. Server-Sent Events (SSE) Service

**Port**: 3007

**Responsibilities**:

- Manage persistent SSE connections
- Broadcast real-time events to connected clients
- Handle connection lifecycle (heartbeat, reconnection)
- Filter events based on user permissions

**Connection Management**:

- Each client identified by JWT user ID
- Max 5 connections per user (enforced by gateway rate limit)
- Heartbeat every 30 seconds to detect dead connections
- Auto-reconnect logic on client side

**Endpoint**:

```
GET /events
Headers: Authorization: Bearer <access_token>
```

**Supported Events**:

- `stock-in` - New stock-in transaction (filter by user's accessible products)
- `stock-out` - New stock-out transaction
- `low-stock` - Low stock detected
- `notification` - User notifications

**Events Consumed** (from RabbitMQ):

- `stock.in.created` → broadcast to interested admins
- `stock.out.created` → broadcast to interested admins
- `stock.low.detected` → broadcast to admins managing that product
- `notification. created` (from notification service) → broadcast to target user only

**Authorization**:

- Connection requires valid JWT (validated by gateway before proxying)
- Events filtered by RBAC: users only see
 data they have permission to see

**Packages**: `apps/sse-service`

---

## Data Flow Examples

### Example 1: Stock In Operation (Create Inventory)

**Steps**:

1. **Admin** submits stock-in form in frontend
2. **Frontend** sends `POST /inventory/stock-in` with `Idempotency-Key` header
3. **Gateway** validates JWT, checks ADMIN role, generates `correlationId`, forwards to inventory-service
4. **Inventory Service**:
   - Validates request body (Zod)
   - Checks idempotency key (already processed?)
   - Creates stock-in transaction (insert into `stock_transactions`)
   - Updates `inventory.quantity` (+= amount)
   - Emits `stock.in.created` event to RabbitMQ
   - Returns 201 Created
5. **RabbitMQ** distributes `stock.in.created` to bound queues:
   - `report-service` (invalidate cache)
   - `notification-service` (send confirmation email)
   - `audit-service` (persist audit log)
   - `sse-service` (broadcast real-time update)
6. **SSE Service** pushes event to all connected admin clients
7. **Frontend** receives SSE event → updates UI in real-time

**Distributed Tracing**:

`correlationId` flows through all logs, enabling tracing of the entire operation across 4+ services.

---

### Example 2: Product Creation (Initialize Inventory)

**Steps**:

1. **Admin** creates new product in UI
2. **Frontend** → `POST /products` (with idempotency key)
3. **Gateway** → validates, adds correlation ID, routes to product-service
4. **Product Service**:
   - Validate input
   - Check idempotency
   - Create product document in `product_db.products`
   - Emit `product.created` event
5. **RabbitMQ** → delivers `product.created` to:
   - `inventory-service` → create inventory entry with quantity 0
   - `audit-service` → log the creation
6. **Inventory Service** receives event → creates entry in `inventory_db.inventory`
7. **Audit Service** receives event → creates audit log

Result: Product exists, inventory tracking ready.

---

### Example 3: Low Stock Alert

**Trigger**:

- `POST /inventory/stock-out` reduces stock
- Inventory service checks: `quantity <= reorderLevel`
- If true: emit `stock.low.detected`

**Chain**:

1. `inventory-service` emits `stock.low.detected`
2. `notification-service` consumes → send email to admins
3. `audit-service` consumes → log alert
4. `sse-service` broadcasts to connected admins
5. `report-service` invalidates low-stock cache

---

## Database Isolation

**Rule**: Each service owns exactly one database. No cross-service queries.

**Service → Database Mapping**:

| Service | Database |
|---------|----------|
| auth-service | `auth_db` |
| product-service | `product_db` |
| inventory-service | `inventory_db` |
| report-service | `report_db` |
| audit-service | `audit_db` |
| notification-service | `audit_db` (shared, different collections) |

**Implication**: Product Service cannot query inventory DB directly. Must call inventory-service API or consume events.

**Denormalization**: Services replicate necessary data from other services via events.

Example: `inventory` collection stores `productName` and `sku` (denormalized from product-service). Updates via `product.updated` events.

---

## Event Bus Abstraction

**Pattern**: Services depend on `EventBus` interface, not RabbitMQ directly.

```typescript
interface EventBus {
  publish(event: Event): Promise<void>
  subscribe(eventType: string, handler: EventHandler): Promise<void>
}

class RabbitMQEventBus implements EventBus {
  // wraps amqplib/channel operations
}
```

**Benefits**:

- Swap RabbitMQ for Kafka without touching business logic
- Mock EventBus in tests
- Centralize connection/retry logic

---

## Dead Letter Queue (DLQ) Strategy

Every event consumer queue has a DLQ.

**Naming Convention**: `<service>.dlq`

Examples:

- `inventory.dlq`
- `notification.dlq`
- `audit.dlq`

**Failure Handling**:

1. Message fails processing (exception thrown, N retries exceeded)
2. RabbitMQ routes to DLQ
3. Alert sent to engineering (or monitored)
4. Manual inspection and replay/repair

**Never drop messages**. DLQ ensures no data loss.

---

## Idempotency Pattern

**Problem**: Network timeout → client retries → duplicate operations.

**Solution**: Idempotency keys.

**Implementation**:

1. Client generates UUID `idempotency-key` header
2. Service checks Redis/MongoDB for processed key
3. If exists → return cached response (without re-executing)
4. If new → process normally, store key + response
5. Store key TTL: 24 hours

**Applicable Endpoints**:

- POST `/products` (create)
- POST `/inventory/stock-in`
- POST `/inventory/stock-out`
- POST `/inventory/adjust`
- POST `/auth/register`

**Storage**: `idempotency_keys` collection in respective service DB:

```typescript
{
  key: string (unique index)
  endpoint: string
  requestHash: string
  responseCode: number
  responseBody: object
  createdAt: Date (TTL index)
}
```

---

## Soft Delete Pattern

**Rule**: Never hard delete business data.

**Implementation**:

- Add `deletedAt` (Date) field
- Add `deletedBy` (userId) field
- All queries filter `deletedAt: null` by default
- "Delete" endpoint just sets these fields
- Admin-only "hard delete" endpoint (if ever needed, with audit)

**Applies to**:

- Products
- Categories
- Suppliers
- Users

---

## Pagination Standard

**Query Parameters**:

- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` (optional full-text search string)
- `sort` (field to sort by, default: `_id`)
- `order` (asc|desc, default: asc)

**Response Envelope**:

```json
{
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Implementation**:

- MongoDB: `find().skip((page-1)*limit).limit(limit).sort({sort: order})`
- Count total separately: `countDocuments(filter)`
- Search: text index or regex (for small datasets)

---

## Correlation ID Flow

**Purpose**: Trace distributed transaction across microservices.

**Generation**: Gateway (first hop)

```typescript
const correlationId = req.headers['x-correlation-id'] || uuidv4()
req.correlationId = correlationId
```

**Propagation**:

1. Gateway → backend service: HTTP header `X-Correlation-ID`
2. Backend → RabbitMQ: message property `correlationId`
3. Backend → backend (REST): HTTP header `X-Correlation-ID`
4. All logs: include `correlationId` in JSON output

**Audit Service**:

- Stores `correlationId` in audit logs
- Enables "trace this transaction across all services" queries

---

## Logging Standards

**Format**: Structured JSON

```json
{
  "timestamp": "2025-06-14T12:34:56.789Z",
  "level": "info",
  "service": "inventory-service",
  "correlationId": "abc-123",
  "message": "Stock in transaction created",
  "data": {
    "transactionId": "xyz-789",
    "productId": "product-123",
    "quantity": 50
  }
}
```

**Log Levels**:

- `error` - Unexpected failures (with stack)
- `warn` - Expected errors, retryable issues
- `info` - Business events (order created, user logged in)
- `http` - HTTP request/response (use morgan or similar)
- `debug` - Debugging details (dev only)

**Output**:

- Development: colored console
- Production: stdout (Docker captures → centralized logging)

---

## Security Considerations

### Authentication

- Gateway validates JWT on every request (except `/auth/*`, `/health`)
- Access token: 15-minute expiry
- Refresh token: 7-day expiry, rotates, stored in HttpOnly cookie
- No localStorage tokens (XSS protection)

### Authorization

- Gateway enforces RBAC before routing
- Role from JWT (`ADMIN` vs `USER`)
- Fine-grained permission checks in services for ADMIN-only endpoints

### Input Validation

- Zod schemas for all request bodies, query params, route params
- Validation before business logic
- Type-safe request handlers

### Rate Limiting

- Per IP/User
- Different limits per endpoint type
- Redis or in-memory store (distributed? use Redis)

### SQL/NoSQL Injection

- MongoDB: use parameterized queries (never string concatenation)
- Mongoose ORM provides automatic sanitization

### CORS

- Gateway handles CORS
- Configure allowed origins via `CORS_ORIGIN` env var
- Credentials allowed (for cookies)

---

## Testing Strategy

### Unit Tests (Jest)

Test individual functions/classes in isolation.

- Mock dependencies (repositories, EventBus, external APIs)
- 100% pure functions coverage
- Utilities, validators, business logic

### Integration Tests

Test API endpoints with real database (MongoDB Memory Server).

- Supertest for HTTP requests
- MongoDB Memory Server for in-memory MongoDB
- Test full request → response cycle
- Test database operations (insert, query)
- Test event emissions (mock RabbitMQ or use test exchange)

### Coverage Thresholds

```
Statements: >= 80%
Functions: >= 80%
Branches: >= 70%
Lines: >= 80%
```

Fail build if below thresholds.

### Frontend Testing

- Component tests (React Testing Library)
- Hook tests
- Store tests (Zustand)
- Form validation tests (React Hook Form + Zod)
- MSW for API mocking

---

## CI/CD Pipeline

Implemented in `.github/workflows/ci.yml`. Triggered on push/PR to `main` and `develop`.

```
Job: lint           (Stage 1)
├── ESLint
├── Prettier check
└── TypeScript type checking

Job: test           (Stage 2 + 3 + 4, needs: lint)
├── pnpm test:coverage
├── Unit + integration tests run together via Jest
├── Coverage gate: statements/functions/lines >= 80%, branches >= 70%
└── Coverage artifact uploaded on every run

Job: build          (Stage 5, needs: test)
├── pnpm build (recursive across all packages + services)
└── Output to dist/ per service

Job: docker-build   (Stage 6, needs: build)
├── Matrix strategy: 9 services built in parallel
├── docker/build-push-action with GHA layer cache
└── push: false (CI validation only)

Job: smoke-test     (Stage 7, needs: docker-build)
├── docker compose up -d --build
├── Wait for MongoDB + RabbitMQ healthchecks
├── curl gateway /health (port 3000)
├── docker exec /health on each internal service
└── docker compose down -v (always, even on failure)

Stage 8: Deploy (manual)
```

**Quality Gates**: Each job depends on the previous. Pipeline fails at first failure. No exceptions.

---

## Definition of Done

Feature branch complete only when:

✅ **Tests**: All unit + integration tests written and passing  
✅ **Coverage**: Thresholds met (statements 80%, functions 80%, branches 70%, lines 80%)  
✅ **Swagger**: OpenAPI docs updated (new/modified endpoints)  
✅ **Documentation**: README or ARCHITECTURE.md updated if architecture changes  
✅ **Docker**: `docker compose build` succeeds without warnings  
✅ **Health Check**: All services respond 200 on `/health`  
✅ **Audit**: Events emitted for state changes (audit-service must log)  
✅ **Code Review**: Peer review completed, all CRITICAL/ HIGH issues fixed  
✅ **No Console.logs**: All debug statements removed  
✅ **No Secrets**: No hardcoded credentials, all env vars referenced  

---

## Development Principles

1. **Simplicity First**
   - Choose simplest solution that works
   - Avoid premature optimization
   - Refactor when pressure is real

2. **Avoid Over-Engineering**
   - No abstractions before 3+ uses
   - Don't build for "what if" scenarios
   - YAGNI (You Aren't Gonna Need It)

3. **Favor Maintainability**
   - Readable code > clever code
   - Consistent patterns > variety
   - Small functions (<50 lines)
   - Small files (<800 lines)

4. **Optimize for Small-to-Medium Teams**
   - Clear ownership boundaries
   - Simple deployment (docker compose)
   - No complex orchestration (Kubernetes overkill for now)
   - Monorepo reduces cross-service friction

---

## Shared Packages (packages/)

### `shared-types`

Common TypeScript interfaces, types, Zod schemas.

```typescript
export interface User {
  _id: string
  email: string
  role: 'ADMIN' | 'USER'
}

export type PaginationQuery = {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
}
```

### `shared-events`

Event type definitions, payload schemas.

```typescript
export const STOCK_IN_CREATED = 'stock.in.created'

export interface StockInCreatedEvent {
  correlationId: string
  transactionId: string
  productId: string
  quantity: number
  userId: string
  timestamp: Date
}
```

### `shared-auth`

JWT verification, RBAC middleware (used by gateway and services).

### `shared-rabbitmq`

RabbitMQ connection factory, EventBus implementation, DLQ handling.

### `shared-logger`

Winston/pino logger setup with JSON formatting, correlation ID injection.

### `shared-testing`

Test utilities:

- MongoDB Memory Server setup/teardown
- RabbitMQ test containers
- Factories for test data
- Supertest helpers

---

## Technology Decisions

### Why ExpressJS?

- Minimal, unopinionated
- Fine-grained control
- Large ecosystem
- Easy to learn

### Why MongoDB?

- Flexible schema (denormalization-friendly)
- JSON-native (matches Node.js/TypeScript)
- Horizontal scaling potential
- Good for event-sourced patterns

### Why RabbitMQ?

- Battle-tested message broker
- AMQP protocol (standard, many clients)
- Reliable delivery with ACKs
- DLQ support built-in
- Decouples services effectively

### Why Not GraphQL?

- REST simpler for CRUD-heavy inventory domain
- GraphQL adds complexity (resolvers, N+1, caching)
- Can add GraphQL gateway later if needed

### Why Monorepo?

- Single source of truth
- Atomic changes across services
- Shared package management (pnpm)
- Easy cross-service refactoring
- Unified CI/CD

---

## Scalability Considerations

### Current State

- 9 services + frontend
- Docker Compose on single server/VM
- MongoDB (single replica set or Atlas cluster)
- RabbitMQ (single node)

### Scaling Out

**Horizontal**:

- Each service can be scaled (multiple instances behind gateway)
- Gateway does round-robin (or use Nginx load balancer)
- MongoDB: sharding by tenant/product if needed
- RabbitMQ: cluster mode for HA

**Vertical**:

- Increase CPU/memory per service instance
- Use managed DB (MongoDB Atlas) for performance

### Database Scaling

- Each service DB separate → can scale independently
- Indexes on query patterns (product lookup, inventory queries, audit search)
- Read replicas for reporting service (heavy reads)

---

## Monitoring & Observability

### Health Checks

All services expose:

```
GET /health
200 OK: { status: 'ok', uptime: 12345, memory: {...} }
503 Service Unavailable: database down, RabbitMQ down
```

### Metrics (Future)

- Prometheus metrics endpoint
- Request latency histograms
- Queue depth (RabbitMQ)
- Database connection pool stats

### Logging (Current)

- Structured JSON logs
- Centralized aggregation (ELK/Graylog/Datadog)
- Correlation ID for tracing

### Alerting (Future)

- Service down → pager
- High error rate → alert
- Queue backlog → alert
- Low disk space → alert

---

## Future Enhancements

- [ ] Kubernetes deployment (if scaling beyond single node)
- [ ] API gateway: Kong/Express gateway instead of custom
- [ ] Service mesh: Istio/Linkerd for advanced routing
- [ ] Event sourcing + CQRS for audit/inventory
- [ ] Multi-tenancy (if SaaS conversion)
- [ ] Distributed tracing (Jaeger/Zipkin)
- [ ] API versioning strategy
- [ ] Feature flags
- [ ] Canary deployments

---

## References

- [AGENTS.md](./AGENTS.md) - Project guidelines and conventions
- [README.md](./README.md) - Quick start and API overview
- [TDD Workflow](../rules/ecc/common/testing.md) - Testing standards
- [Code Review Standards](../rules/ecc/common/code-review.md) - Review expectations

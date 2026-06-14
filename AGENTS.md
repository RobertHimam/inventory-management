# AGENTS.md

## Project

Inventory Management System

## Architecture

- Monorepo
- Microservices
- Event Driven Architecture
- Clean Architecture
- Repository Pattern
- Test Driven Development (TDD)

## Technology Stack

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

{
userId,
username,
role
}

Rules

- Access Token in memory
- Refresh Token in HttpOnly Cookie
- Refresh Token Rotation mandatory
- Never store tokens in localStorage

## Authorization

Model:

RBAC

Roles:

ADMIN
USER

ADMIN

- Full Access

USER

- Read Dashboard
- Read Products
- Read Inventory
- Read Reports

Forbidden for USER

- Product Create
- Product Update
- Product Delete
- Stock In
- Stock Out
- Stock Adjustment
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

Allowed:

auth_db
product_db
inventory_db
report_db
audit_db

Forbidden:

Cross-service database queries.

## Communication Rules

Synchronous:

- REST

Asynchronous:

- RabbitMQ

Services never communicate through shared databases.

## Event Rules

stock.in.created
stock.out.created
stock.adjustment.created
stock.low.detected

product.created
product.updated
product.deleted

user.created
user.updated

## RabbitMQ Rules

Dead Letter Queue mandatory.

Examples:

inventory.dlq
notification.dlq
audit.dlq

Failed messages must be routed to DLQ.

## Event Bus

Services depend on EventBus abstraction.

Never couple business logic directly to RabbitMQ.

Example:

EventBus
RabbitMQEventBus

## SSE Rules

Only SSE Service manages SSE connections.

Endpoint:

GET /events

Supported Events:

- stock-in
- stock-out
- low-stock
- notification

Requirements:

- JWT Protected
- Auto Reconnect
- Heartbeat
- Event Validation

## Audit Service

Database:

audit_db

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

Idempotency-Key

Applicable:

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

- deletedAt
- deletedBy

Never hard delete business data.

## Pagination

List endpoints support:

- page
- limit
- search
- sort
- order

Response format:

{
data: [],
pagination: {
page,
limit,
total,
totalPages
}
}

## Gateway

Responsibilities:

- JWT Validation
- RBAC Validation
- Reverse Proxy
- Rate Limiting
- Correlation ID
- Logging
- CORS

Rate Limits:

Auth APIs:
10 req/min

General APIs:
100 req/min

SSE:
5 connections/user

## Swagger

Every service must expose:

GET /health

/api-docs

OpenAPI documentation mandatory.

## Logging

Generate X-Correlation-ID in Gateway.

Propagate through:

- REST
- RabbitMQ
- SSE

Use structured JSON logging.

## Testing

TDD mandatory.

Workflow:

Red
Green
Refactor

No business logic before tests.

Coverage:

- Statements >= 80%
- Functions >= 80%
- Branches >= 70%
- Lines >= 80%

Required:

- Unit Tests
- Integration Tests

## Backend Testing

- Jest
- Supertest
- MongoDB Memory Server

## Frontend Testing

- Jest
- React Testing Library
- MSW

Test:

- Components
- Hooks
- Stores
- Pages
- Forms
- Role Guards

## Seed Data

Development only.

Users:

[admin@example.com](mailto:admin@example.com) / admin123
[user@example.com](mailto:user@example.com) / user123

Roles:

ADMIN
USER

## CI/CD Quality Gates

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

Prefer simplicity.

Avoid over-engineering.

Favor maintainability.

Optimize for small-to-medium fullstack teams.

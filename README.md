# Pente Support Platform

A production-minded support ticket application built for the Pente.AI Full Stack Engineer assessment. Customers can create, find, view, and reply to tickets without seeing internal data. Agents and Admins work from a protected dashboard with explicit role boundaries, SLA awareness, audit history, defensive status transitions, and AI assistance that remains human-controlled.

The implementation stays deliberately focused on the brief. It does not include RAG, vector search, Kafka, autonomous agents, a risk engine, or unrelated analytics.

## Architecture

| Package              | Technology                    | Responsibility                                                  |
| -------------------- | ----------------------------- | --------------------------------------------------------------- |
| `apps/web`           | Next.js, React, TypeScript    | Public customer journey and role-aware staff workspace          |
| `apps/api`           | Express, TypeScript, Mongoose | Authentication, tickets, permissions, SLA, audit, AI mediation  |
| `services/reporting` | NestJS, TypeScript, Mongoose  | Read-mostly aggregation, Redis-backed reports, Swagger          |
| `packages/shared`    | TypeScript, Zod               | Shared enums, schemas, SLA values, transitions, transport types |

MongoDB is shared by the core and reporting services. The Express API owns all writes. Reporting is independently deployable, reads the same ticket collection, and uses Redis for shared aggregation caching.

The complete decision record is [docs/adr.md](docs/adr.md).

## Requirement coverage

- Public ticket creation with `TKT-1001`-style numbers
- Email-only lookup and customer reply with email ownership checks on every request
- Customer-safe response shaping that excludes assignment, audit, role, and AI review metadata
- Agent and Admin login with 15-minute access tokens and seven-day refresh tokens
- HTTP-only refresh cookie, rotation on every use, hashed storage, family revocation on reuse
- Server-side Agent/Admin permission enforcement with clear 401, 403, 404, and 409 responses
- Medium default priority and configurable 4, 8, 24, and 48-hour SLA targets
- Dynamic SLA-breach evaluation in ticket responses, dashboard cards, and reports
- Explicit allowed status transitions and audit history for every important change
- Search, filter, pagination, loading, empty, error, unauthorized, and responsive states
- Gemini-compatible `AiProvider` with server-only key, redaction, input bounds, timeout, and rate limit
- Automatic AI triage stored as a pending recommendation that never changes priority before human review
- Staff-triggered conversation summary stored with `aiGenerated: true`
- Graceful AI failure response that leaves all core ticket actions available
- Required reporting routes, query and body validation, health checks, and Swagger
- Redis caching for overview, agent-performance, and trend aggregations with an in-memory availability fallback
- More than 30 automated tests with no real AI or other paid service calls
- Three multi-stage Dockerfiles, Docker Compose, and pull-request CI
- Seed data, Postman collection, and cURL examples

## Prerequisites

- Node.js 22
- pnpm 9.15.5
- MongoDB 7 or 8 for non-Docker development
- Redis 7 for shared report caching outside Docker
- Docker and Docker Compose for the complete containerized setup
- Optional Gemini API key for live AI actions

## Start with Docker

Create local environment values:

```bash
cp .env.example .env
```

Replace both JWT secrets in `.env`. Add `GEMINI_API_KEY` when live AI is required. Without a key, the product demonstrates its safe AI-unavailable path.

Start the full platform:

```bash
docker compose up --build -d
```

Seed staff accounts and demonstration tickets:

```bash
docker compose exec api node apps/api/dist/scripts/seed.js
```

Open:

- Web application: `http://localhost:3000`
- Core API liveness: `http://localhost:4000/health/liveness`
- Reporting liveness: `http://localhost:5001/health/liveness`
- Reporting Swagger UI: `http://localhost:5001/docs`

Stop services:

```bash
docker compose down
```

Remove the local MongoDB volume only when the data is no longer needed:

```bash
docker compose down -v
```

## Start without Docker

Start MongoDB on `localhost:27017` and Redis on `localhost:6379`, then run:

```bash
cp .env.example .env
pnpm install
pnpm seed
pnpm dev
```

The root development command builds the shared package and starts the web app, core API, and reporting service in parallel.
If Redis is intentionally unavailable, reporting continues with its in-memory TTL fallback.

## Seed accounts

| Role  | Email              | Password        |
| ----- | ------------------ | --------------- |
| Agent | `bob@pente.ai`     | `PenteDemo123!` |
| Admin | `charlie@pente.ai` | `PenteDemo123!` |

The seed is idempotent and also creates `TKT-1001`, an intentionally breached High-priority ticket, and `TKT-1002`, an open Low-priority ticket. Credentials are demonstration data and must be replaced outside assessment use.

## Environment variables

| Variable                     | Purpose                      | Default behavior                            |
| ---------------------------- | ---------------------------- | ------------------------------------------- |
| `MONGODB_URI`                | Shared MongoDB connection    | Local `pente_support` database              |
| `JWT_ACCESS_SECRET`          | Access-token signing         | Must be at least 32 characters              |
| `JWT_REFRESH_SECRET`         | Refresh-token signing        | Must be separate and at least 32 characters |
| `JWT_ACCESS_EXPIRY`          | Access-token lifetime        | `15m`                                       |
| `JWT_REFRESH_EXPIRY_DAYS`    | Refresh-token lifetime       | `7`                                         |
| `WEB_ORIGIN`                 | Allowed browser origin       | `http://localhost:3000`                     |
| `NEXT_PUBLIC_API_URL`        | Browser core API base        | `http://localhost:4000/api/v1`              |
| `NEXT_PUBLIC_REPORTING_URL`  | Browser reporting base       | `http://localhost:5001`                     |
| `GEMINI_API_KEY`             | Server-side AI credential    | Empty, safe degradation                     |
| `GEMINI_MODEL`               | Gemini-compatible model      | `gemini-3.6-flash`                          |
| `GEMINI_BASE_URL`            | Compatible provider endpoint | Google Generative Language API              |
| `AI_TIMEOUT_MS`              | Outbound AI deadline         | `8000`                                      |
| `AI_PROVIDER`                | `gemini`, `mock`, `disabled` | `gemini`; production rejects `mock`         |
| `REPORT_CACHE_TTL_MS`        | Overview cache lifetime      | `60000`                                     |
| `REPORT_AGENTS_CACHE_TTL_MS` | Agent report cache lifetime  | `120000`                                    |
| `REPORT_TRENDS_CACHE_TTL_MS` | Trend report cache lifetime  | `300000`                                    |
| `REDIS_URL`                  | Shared report cache          | `redis://localhost:6379`                    |
| `SLA_APPROACHING_MINUTES`    | Report warning window        | `60`                                        |

No variable prefixed with `NEXT_PUBLIC_` contains a secret. The Gemini key is read only in the core API process.

## Commands

```bash
pnpm dev
pnpm seed
pnpm lint
pnpm format:check
pnpm test
pnpm test:coverage
pnpm build
```

Tests use an isolated in-memory MongoDB instance. The AI provider is mocked for both success and timeout behavior. CI never calls Gemini.

## Ticket behavior

New tickets start at Medium priority. SLA targets are:

| Priority |   Target |
| -------- | -------: |
| Critical |  4 hours |
| High     |  8 hours |
| Medium   | 24 hours |
| Low      | 48 hours |

Allowed status transitions are:

| From                 | To                                     |
| -------------------- | -------------------------------------- |
| Open                 | In Progress, Closed                    |
| In Progress          | Waiting for Customer, Resolved, Closed |
| Waiting for Customer | In Progress, Resolved                  |
| Resolved             | Closed, In Progress                    |
| Closed               | None                                   |

A customer reply moves Waiting for Customer back to In Progress. Closed tickets reject new replies. Changing priority recalculates the deadline from original creation time.

Agents can take an unassigned ticket only for themselves. Admins can reassign to any active staff member, change priority directly, delete tickets, and access the SLA-breach report. Both staff roles can reply, change valid status, summarize, and review AI triage.

## Logging

Development uses one human-readable completion line per request:

```text
05:55:31.903 ERROR POST    /api/v1/tickets/TKT-1003/ai/summary 503    26.0 ms AI_UNAVAILABLE
```

Production logs the same fields as compact JSON for log collection. Request and response headers, cookies, authorization values, passwords, and stack traces are excluded. Successful requests log at Info, client failures at Warn, and server failures at Error.

## AI behavior

Ticket creation persists successfully before automatic triage begins. The recommendation contains priority, category, reason, and confidence with `Pending Review` status. The actual priority remains Medium until an Agent or Admin confirms it. Rejecting a recommendation makes no change unless staff deliberately select an alternative through the API.

Conversation summarization uses up to the latest 50 non-AI messages, bounded message lengths, credential and card-like value redaction, low-temperature generation, and a concise four-section prompt. A successful summary becomes a conversation entry marked as AI-generated.

The `mock` provider gives tests and local demonstrations deterministic summaries and recommendations without a network call. Startup rejects `AI_PROVIDER=mock` when `NODE_ENV=production`, preventing test output from being mistaken for real AI. Disabled configuration, timeouts, invalid responses, network failures, and provider throttling return a safe error. Ticket reading, replies, status changes, assignment, and reporting remain available.

Set this value to demonstrate failure without changing code:

```env
AI_PROVIDER=disabled
```

## API documentation

- Endpoint and permission reference: [docs/api.md](docs/api.md)
- cURL examples: [docs/api-examples.md](docs/api-examples.md)
- Importable collection: [postman/Pente.Support.postman_collection.json](postman/Pente.Support.postman_collection.json)
- Reporting Swagger: `http://localhost:5001/docs`

## CI pipeline

`.github/workflows/ci.yml` runs for every pull request and pushes to `main`. It installs from the lockfile, checks formatting, lints, runs all tests, builds all packages, and builds the three production images.

Run its core validation locally:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm test
pnpm build
docker build -f apps/api/Dockerfile -t pente-api:local .
docker build -f services/reporting/Dockerfile -t pente-reporting:local .
docker build -f apps/web/Dockerfile -t pente-web:local .
```

## Submission support

- ADR: [docs/adr.md](docs/adr.md)

## Verified screenshots

| Journey                                       | Evidence                                                      |
| --------------------------------------------- | ------------------------------------------------------------- |
| Public landing and live service health        | [Landing](docs/screenshots/landing.png)                       |
| Customer-safe details and reply flow          | [Customer ticket](docs/screenshots/customer-ticket.png)       |
| Admin cards, filtering, SLA, and ticket table | [Admin dashboard](docs/screenshots/admin-dashboard.png)       |
| Staff controls and AI-unavailable fallback    | [Staff ticket](docs/screenshots/staff-ticket-ai-fallback.png) |
| Cached aggregation and SLA attention queue    | [Admin reports](docs/screenshots/admin-reports.png)           |

The repository can supply code and local proof, but the reviewer-facing GitHub link, hosted CI result, screenshots added to the pull request, and uploaded video must be created in the submitter's accounts.

## Assumptions and known limitations

The scoring rubric mentions SuperAdmin once, while the functional requirements consistently specify Customer, Agent, and Admin. This implementation uses those three roles. Customer is a public access mode rather than a stored staff account role.

Email-only lookup follows the explicit assessment flow but provides weak proof of ownership. A production rollout should use email OTP or magic links and should avoid revealing whether an address has tickets.

Automatic triage is an in-process background operation. It is safe when unavailable and uses atomic persistence, but process termination can drop an unfinished request. Production should use a durable queue with idempotency, retry budgets, and dead-letter handling.

Overview, agent-performance, and trend reports perform collection-wide grouping or time-series aggregation, so they are cached in Redis for 60, 120, and 300 seconds respectively. The deadline-sensitive SLA attention queue remains uncached. If Redis is unavailable, the reporting service continues with an in-memory TTL cache and exposes the active cache backend through readiness and overview responses. A larger deployment should add event-driven invalidation or materialized reports when freshness requirements justify it.

Browser session storage retains the short-lived access token. A same-origin backend-for-frontend with server-held tokens would be preferred in production. Refresh tokens already remain in HTTP-only cookies and are stored in MongoDB only as hashes.

Hard deletion matches the Admin requirement. Production compliance rules may require soft deletion, retention, and a separate immutable audit store.

## First production improvements

1. Add customer magic-link authentication and anti-enumeration monitoring.
2. Move AI work to a durable queue with idempotent jobs and provider-specific retry budgets.
3. Put refresh sessions and rate limits in shared infrastructure and add event-driven report invalidation.
4. Add OpenTelemetry traces, metrics, security alerts, and SLO dashboards.
5. Use a MongoDB replica set, transactions where needed, read replicas for reports, and tested backups.
6. Add image scanning and deployment environment gates.

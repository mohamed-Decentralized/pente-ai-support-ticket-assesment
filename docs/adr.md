# ADR 001: Pente Support Platform Architecture

Status: Accepted

Date: 2026-08-26

## Context

The assessment requires a customer and staff support-ticket product built from an empty repository. It must combine a Next.js user interface, an Express core API, MongoDB, an independent NestJS reporting service, and a server-side generative-AI integration. The system must remain usable when AI is unavailable and must defend role boundaries on the server.

## Decision

The repository is a pnpm workspace with `apps/web`, `apps/api`, `services/reporting`, and `packages/shared`. The shared package owns stable enums, transport types, validation schemas, SLA values, and status-transition rules. Each deployable service has its own package, build configuration, health checks, and multi-stage image. This keeps local development simple while preserving deployment boundaries.

The Express API owns all writes and business invariants. It creates human-readable ticket numbers, validates customer ownership, enforces state transitions, calculates SLA deadlines, records audit events, rotates refresh tokens, and mediates AI access. MongoDB transactions are avoided because the take-home environment may run a single-node MongoDB instance. Ticket-number generation uses an atomic counter document, while each business update uses one atomic ticket write.

The NestJS service connects to the same database in read-mostly mode and exposes only report operations. Redis caches the collection-wide overview, per-agent performance, and date-bucket trend aggregations for 60, 120, and 300 seconds. The deadline-sensitive SLA attention queue remains uncached. A local TTL cache keeps reporting available when Redis is absent or disconnects, while readiness and report metadata expose which cache backend is active.

## Authentication and authorization

Customers do not have accounts because the requested public journey is an email-only lookup. Every customer details and reply request supplies an email in the request body, and the API compares its normalized value with the stored ticket email before returning customer-safe data. Lookup is rate-limited. Email knowledge alone is deliberately documented as a take-home compromise; production should use a short-lived magic link or email OTP.

Agent and Admin users authenticate with email and password. A signed access token lasts 15 minutes. A random refresh token lasts seven days, is stored only as a SHA-256 hash, and is sent in an HTTP-only, same-site cookie. Every refresh rotates the token. Reuse of a revoked token invalidates its token family. Logout revokes the presented token and clears the cookie.

Authorization is enforced in API guards and service methods. Agents can read, reply, change status, accept or reject AI suggestions, and take an unassigned ticket for themselves. Admins additionally reassign, delete, manage priority directly, and access SLA-breach reporting. Hiding controls in the interface is only a usability measure and never the security boundary.

## AI integration and failure strategy

The core API depends on an `AiProvider` interface rather than Gemini-specific behavior. The Gemini adapter uses a small structured prompt, redacts obvious credentials and payment-card-like sequences, limits input size, requests JSON where appropriate, and applies an eight-second timeout. API keys are read only by the server.

Ticket creation succeeds before automatic triage is attempted. Triage stores a recommendation with `Pending Review`; it never changes actual priority. An Agent or Admin must accept it, or reject it and optionally choose another priority. Conversation summarization is an explicit staff action and stores a generated conversation entry with `aiGenerated` set to true.

Provider absence, invalid output, timeouts, rate limits, and network failures become a safe `AI_UNAVAILABLE` response. The ticket remains editable and the interface presents a retry action. There are no unbounded retries. AI routes have stricter request limits than general API routes. A deterministic mock adapter is available for test and development environments, and configuration validation prevents it from running when `NODE_ENV` is `production`.

## Data and SLA decisions

The public form defaults new tickets to Medium. SLA targets are Critical four hours, High eight hours, Medium 24 hours, and Low 48 hours. Changing a priority before resolution recalculates the deadline from creation time and records the decision. A ticket is breached when the deadline has passed and status is neither Resolved nor Closed. Responses derive this value from current time so stale persisted flags do not hide breaches; reporting uses the same rule in aggregation.

Allowed transitions are Open to In Progress or Closed; In Progress to Waiting for Customer, Resolved, or Closed; Waiting for Customer to In Progress or Resolved; Resolved to Closed or In Progress; and no transition from Closed. Reopening a resolved ticket is supported, but reopening a closed ticket is an Admin workflow intentionally omitted.

## Accepted trade-offs

Automatic triage runs in the API process after a successful write. A production system would place this work on a durable queue with idempotency, retry budgets, and dead-letter handling. Report caching uses short TTLs because the ticket API does not publish invalidation events. Customer verification is weaker than a production support portal. Staff access tokens are retained in browser session storage to survive a refresh; a production deployment should prefer a same-origin backend-for-frontend that keeps all tokens out of browser storage.

MongoDB is shared by both services to match the brief. At higher scale the reporting service would use a read replica, materialized rollups, or change-stream-fed reporting store. Ticket deletion is a hard delete with a final structured log event; production compliance requirements may instead require soft deletion and retention policies.

The first production improvements would be customer magic-link authentication, a durable AI job queue, secret management and key rotation, shared rate limiting, event-driven cache invalidation, database replica-set transactions, fine-grained observability, and security testing around ticket enumeration and refresh-token theft.

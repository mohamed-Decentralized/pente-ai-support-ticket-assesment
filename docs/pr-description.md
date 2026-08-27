# Pull Request: Complete Pente Support Platform

## Summary

Implements the complete two-sided support ticket assessment across a Next.js frontend, Express core API, MongoDB, NestJS reporting service, and Gemini-compatible AI abstraction. The change includes rotating refresh tokens, server-side role enforcement, SLA calculation, audit history, defensive status transitions, automatic but human-reviewed AI triage, AI summaries, graceful degradation, isolated tests, Docker packaging, CI, seed data, and submission documentation.

## Architecture decisions

- The Express API owns writes and business invariants.
- The reporting service is read-mostly and caches overview, agent, and trend aggregations in Redis with an in-memory availability fallback.
- Customers use the requested email-only flow; production hardening to magic links is documented.
- Staff use 15-minute access tokens and seven-day rotating refresh cookies.
- AI never blocks ticket creation and never applies priority without human confirmation.

## Verification

- `pnpm format:check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `docker compose config`
- Three multi-stage container builds

## Screenshots

- [Public landing and live service health](screenshots/landing.png)
- [Customer-safe ticket details](screenshots/customer-ticket.png)
- [Admin dashboard](screenshots/admin-dashboard.png)
- [Staff ticket and AI fallback](screenshots/staff-ticket-ai-fallback.png)
- [Admin reporting and SLA queue](screenshots/admin-reports.png)

## Self-review notes

- Customer email-only access matches the brief but is weaker than OTP or magic-link verification.
- Automatic triage is an in-process background task; a durable queue is the first reliability upgrade.
- Refresh-token family revocation detects reuse; distributed deployments should add centralized session telemetry.
- Reporting uses shared Redis TTL caching; domain-event invalidation is deferred.
- Direct browser-to-reporting access is appropriate for assessment separation; a production backend-for-frontend would reduce token exposure and simplify CORS.

# API Reference

Core API base URL: `http://localhost:4000/api/v1`

Reporting base URL: `http://localhost:5001`

Interactive reporting OpenAPI: `http://localhost:5001/docs`

## Public endpoints

| Method | Path                                    | Purpose                           |
| ------ | --------------------------------------- | --------------------------------- |
| POST   | `/public/tickets`                       | Create a ticket                   |
| POST   | `/public/tickets/lookup`                | Find tickets by email             |
| POST   | `/public/tickets/:ticketNumber/details` | Retrieve one customer-safe ticket |
| POST   | `/public/tickets/:ticketNumber/replies` | Add a verified customer reply     |

Customer email values stay in request bodies. Public responses omit customer email, assignment, audit history, staff roles, and AI review metadata.

## Authentication endpoints

| Method | Path            | Purpose                                               |
| ------ | --------------- | ----------------------------------------------------- |
| POST   | `/auth/login`   | Issue an access token and refresh cookie              |
| POST   | `/auth/refresh` | Rotate the refresh token and issue a new access token |
| POST   | `/auth/logout`  | Revoke the refresh token and clear its cookie         |

Protected requests use `Authorization: Bearer <accessToken>`. Refresh operations use the HTTP-only `pente_refresh` cookie.

## Staff ticket endpoints

| Method | Path                                      |          Agent |    Admin |
| ------ | ----------------------------------------- | -------------: | -------: |
| GET    | `/tickets/dashboard`                      |            Yes |      Yes |
| GET    | `/tickets`                                |            Yes |      Yes |
| GET    | `/tickets/:ticketNumber`                  |            Yes |      Yes |
| GET    | `/tickets/staff`                          |            Yes |      Yes |
| POST   | `/tickets/:ticketNumber/replies`          |            Yes |      Yes |
| PATCH  | `/tickets/:ticketNumber/status`           |            Yes |      Yes |
| PATCH  | `/tickets/:ticketNumber/assignment`       | Self-take only | Reassign |
| PATCH  | `/tickets/:ticketNumber/priority`         |             No |      Yes |
| DELETE | `/tickets/:ticketNumber`                  |             No |      Yes |
| POST   | `/tickets/:ticketNumber/ai/summary`       |            Yes |      Yes |
| POST   | `/tickets/:ticketNumber/ai/triage`        |            Yes |      Yes |
| POST   | `/tickets/:ticketNumber/ai/triage/review` |            Yes |      Yes |

List query fields are `page`, `limit`, `search`, `status`, `priority`, `assignedTo`, and `slaBreached`.

## Reporting endpoints

| Method | Path                       | Agent | Admin |
| ------ | -------------------------- | ----: | ----: |
| GET    | `/reports/overview`        |   Yes |   Yes |
| GET    | `/reports/agents`          |   Yes |   Yes |
| GET    | `/reports/sla-breaches`    |    No |   Yes |
| GET    | `/reports/trends?days=7`   |   Yes |   Yes |
| POST   | `/reports/webhook-preview` |   Yes |   Yes |

The overview response includes `cache`, `cacheBackend`, `ttlMs`, and aggregated data. Redis caches overview for 60 seconds, agent performance for 120 seconds, and trends for 300 seconds. SLA breaches are calculated live. The webhook preview validates and normalizes the request without persistence.

## Health endpoints

| Service   | Liveness           | Readiness           |
| --------- | ------------------ | ------------------- |
| Core API  | `/health/liveness` | `/health/readiness` |
| Reporting | `/health/liveness` | `/health/readiness` |

Validation errors return 400, missing or invalid authentication returns 401, insufficient permission returns 403, unknown resources return 404, business conflicts return 409, AI rate limiting returns 429, and AI provider failure returns 503.

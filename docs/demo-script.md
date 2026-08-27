# Six-Minute Demonstration Script

## 0:00–0:35 Architecture and startup

Show the repository folders, ADR, three Dockerfiles, Compose file, and running services. Open both health endpoints and the reporting Swagger page.

## 0:35–1:25 Customer creation and reply

Create a ticket from the public form. Copy the human-readable ticket number. Use the email-only lookup, open the ticket, and send a customer reply. Point out that assignment, audit, roles, and AI review data are absent.

## 1:25–2:25 Agent workflow

Sign in as `bob@pente.ai`. Open the new ticket, take it, move it to In Progress, reply, and show the audit events. Review the automatic AI priority recommendation and confirm it. Explain that actual priority remained Medium until confirmation.

## 2:25–3:15 AI summary and failure

Generate a conversation summary and show the generated marker. Restart the API with `AI_PROVIDER=disabled`, retry summary generation, and show the safe unavailable message while status and replies continue working.

## 3:15–4:05 Role boundary

As Agent, call or show a saved Postman request for ticket deletion and receive 403. Sign in as `charlie@pente.ai` (admin), show the additional priority, reassignment, deletion, and Reports controls.

## 4:05–4:50 SLA and reporting

Open the seeded `TKT-1001` breached ticket. Show the dashboard SLA card, then the Admin reports page. Call overview twice to show a cache miss followed by a cache hit. Open trends and webhook preview in Swagger.

## 4:50–5:35 Tests and CI

Run `pnpm test` and show the passing tests. Open the pull-request workflow and its successful lint, test, build, and three image-build steps.

## 5:35–6:00 Production judgment

End on the ADR trade-offs: email OTP or magic link, durable AI jobs, event-driven cache invalidation, shared rate limiting, read replicas, observability, and token storage behind a same-origin backend-for-frontend.

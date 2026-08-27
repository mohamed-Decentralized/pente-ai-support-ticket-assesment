# Submission Checklist

## Repository evidence

- [x] GitHub repository visibility is correct for the reviewer
- [x] Full branch and commit history is pushed
- [x] `feature/project-foundation` exists in remote history
- [x] At least one pull request includes summary, screenshots, test evidence, and self-review notes
- [x] Pull-request CI is green

## Required artifacts

- [x] Next.js, React, and TypeScript web application
- [x] Express and TypeScript core API
- [x] MongoDB persistence and seed script
- [x] NestJS and TypeScript reporting service
- [x] Gemini-compatible server-only AI provider
- [x] Architecture Decision Record
- [x] Postman collection and cURL examples
- [x] More than 15 isolated automated tests with AI mocked
- [x] Multi-stage Dockerfiles and Docker Compose
- [x] Pull-request GitHub Actions workflow
- [x] Main-role screenshots captured in `docs/screenshots`
- [x] Passing CI screenshot or link added to the pull request
- [x] Unlisted demonstration video is no longer than six minutes

## Demonstration checks

- [x] Public ticket creation and lookup
- [x] Customer reply and customer-safe response
- [x] Agent assignment, reply, and status flow
- [x] Automatic AI recommendation awaiting human confirmation
- [x] Successful AI summary
- [x] Simulated AI failure with core workflow still usable
- [x] SLA-breached ticket and report
- [x] Agent receives 403 for Admin-only operation
- [x] Full Docker Compose startup
- [x] Passing lint, tests, build, and container builds

## Security checks

- [x] No real secrets exist in repository history
- [x] Production signing secrets are generated and stored outside source control
- [x] Production origins and secure cookie behavior are verified
- [x] Gemini quota and billing limits are configured
- [x] Public repository contains no real customer data

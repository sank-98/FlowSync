# ARCHITECTURE

## System overview

FlowSync is a Node.js/Express service for real-time venue intelligence, routing, and simulation dashboards.

## Runtime stack

- **HTTP/API:** Express app in `server.js`
- **Security middleware:**
  - `middleware/security.js` (helmet, CORS, CSRF, rate limits)
  - `middleware/auth-guard.js` (JWT + OAuth bearer validation)
  - `middleware/input-sanitizer.js` (recursive request sanitization)
  - `middleware/error-handler.js` (centralized safe responses)
  - `middleware/logger.js` (sanitized structured middleware logging)
- **Configuration:**
  - `config/index.js` (typed env parsing)
  - `config/env-validator.js` (production env guardrails)
- **Services:** Cloud logging/monitoring/pubsub/storage/tasks + in-memory simulation/cache

## Request lifecycle

1. Request enters Express.
2. Security headers/rate limits/CSRF checks are applied.
3. Request body/query/params are sanitized.
4. Route handlers execute simulation/service logic.
5. Errors flow to centralized error middleware with non-leaking production responses.

## Production safeguards

- Production boot fails fast if required env vars (for example `JWT_SECRET`, `CSRF_SECRET`) are missing.
- Admin mutation endpoints (`/api/simulation`, `/api/trigger-event-end`, `/api/reset`) can enforce auth via production/default route guard.
- Sensitive log fields are redacted by middleware logger utilities.

## Deployment model

- Designed for stateless Cloud Run-style deployment.
- Optional managed integrations: Cloud Logging, Monitoring, Pub/Sub, Tasks, and Storage.
- Behavior is environment-driven via runtime variables.

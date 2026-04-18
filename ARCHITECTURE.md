# ARCHITECTURE

## System overview

FlowSync is a Node.js/Express service for real-time venue intelligence, congestion analysis, and routing recommendations.

## Module responsibilities

- `server.js`: app bootstrap, middleware chain, route registration.
- `routes/`: HTTP route definitions and endpoint grouping.
- `controllers/`: request orchestration and response shaping.
- `services/`: simulation, cache, cloud integrations, and business logic.
- `middleware/`: auth, sanitization, rate limiting, CSRF, and error handling.
- `config/`: environment-driven runtime configuration.

## Request/data flow

1. Client request reaches Express.
2. Security middleware validates/sanitizes input.
3. Route handlers delegate to controller/service logic.
4. Service layer updates simulation/cache/cloud state.
5. Response is returned with standardized error handling.

## Performance characteristics

- In-memory and distributed caching reduce repeated route/heatmap computation.
- Simulation update loop uses bounded history to cap memory growth.
- Compression and lightweight JSON payloads reduce transfer overhead.

## Deployment topology

- Stateless app instances deployed on Cloud Run.
- Optional managed services: Cloud Logging, Monitoring, Pub/Sub, Tasks, Storage.
- Environment variables and Secret Manager control runtime behavior.

## Security boundaries

- AuthN/AuthZ enforced via middleware at API boundary.
- Input sanitization and validation happen before business logic.
- Central error handler prevents stack leakage in production.

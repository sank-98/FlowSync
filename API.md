# FlowSync API Reference

Base URL: `http://localhost:8080`

## Health & Base

### GET /health
Returns service status and timestamp.

### GET /health/services
Returns Google service health (`healthy` / `degraded`).

### GET /health-check
Route-based health endpoint.

### GET /health-check/services
Route-based service health endpoint.

### GET /api/base/ping
Simple connectivity check.

## Core Crowd Intelligence

### GET /api/zones
Returns all zones with current and predicted metrics.

### GET /api/heatmap
Returns heatmap-ready zone density data.

### GET /api/anomalies
Returns active anomaly list and severity.

### GET /api/dashboard
Returns consolidated dashboard payload.

### GET /api/zones/:id
Returns a single zone snapshot by id.

### POST /api/route
Calculates a route.

Request:
```json
{ "from": "entry-a", "to": "food-court", "preference": "fastest" }
```

### POST /api/time-analysis
Compares `moveNow` vs `waitThenMove` outcomes.

### GET /api/exit-strategy
Returns suggested exit strategy.

### POST /api/ai-chat
Sends user prompt to Gemini/fallback assistant.

Request:
```json
{ "message": "Best route to nearest food?" }
```

### GET /api/stats
Returns high-level simulation and traffic stats.

### POST /api/simulation
Starts/stops simulation.

### POST /api/trigger-event-end
Triggers event-end scenario.

### POST /api/reset
Resets simulation state.

## Storage

### POST /api/storage/upload
Multipart single-file upload (`file` field).

### POST /api/storage/batch-upload
Multipart multi-file upload (`files` field).

### GET /api/storage/download/:fileId
Downloads object by id/path.

### DELETE /api/storage/delete/:fileId
Deletes object by id/path.

### GET /api/storage/list
Lists stored objects.

## Tasks

### POST /api/tasks/create
Creates a background task.

### POST /api/tasks/schedule
Creates a delayed/scheduled task.

### GET /api/tasks/list
Lists tasks.

### GET /api/tasks/status/:taskId
Gets task status.

### DELETE /api/tasks/:taskId
Deletes/cancels task.

## Events (Pub/Sub)

### POST /api/events/publish
Publishes event payload to default topic.

### POST /api/events/topics/:topic/publish
Publishes payload to named topic.

### GET /api/events/topics
Lists known topics.

### GET /api/events/subscribe/:topic
Creates/attaches subscription for a topic.

## Error Codes

- `200` Success
- `201` Created
- `400` Invalid request payload
- `403` CSRF/auth validation failure
- `404` Route/resource not found
- `500` Internal server error
- `503` Dependent service degraded/unavailable

# Google Cloud Services Integration

## Overview
FlowSync integrates the following Google Cloud services in the main server runtime:

- Cloud Storage (`services/cloud-storage.js`) for file upload/download/list/delete.
- Cloud Logging (`config/cloud-logging-config.js`, `services/cloud-logger.js`) for structured request, error, audit, and metrics logs.
- Cloud Tasks (`config/cloud-tasks-config.js`, `services/cloud-tasks.js`) for background and scheduled task orchestration.
- Cloud Monitoring (`config/cloud-monitoring-config.js`, `services/cloud-monitoring.js`) for custom application metrics.
- Cloud Pub/Sub (`services/cloud-pubsub.js`) for event publishing/subscription.

## API Endpoints

### Storage
- `POST /api/storage/upload`
- `POST /api/storage/batch-upload`
- `GET /api/storage/download/:fileId`
- `DELETE /api/storage/delete/:fileId`
- `GET /api/storage/list`

### Tasks
- `POST /api/tasks/create`
- `POST /api/tasks/schedule`
- `GET /api/tasks/list`
- `GET /api/tasks/status/:taskId`
- `DELETE /api/tasks/:taskId`

### Events
- `POST /api/events/publish`
- `POST /api/events/topics/:topic/publish`
- `GET /api/events/topics`
- `GET /api/events/subscribe/:topic`

### Health
- `GET /health/services`
- `GET /health-check/services`

## Setup
1. Copy `.env.google-cloud.example` to `.env` and fill values.
2. Ensure a service account with access to Storage, Tasks, Monitoring, Logging, and Pub/Sub is available.
3. Start service: `npm start`.

## Troubleshooting
- If credentials are missing, services degrade gracefully and `/health/services` returns `degraded`.
- Check logs for failed metric writes or failed event publishes.
- Verify queue name/location and storage bucket exist in the configured project.

## Cost Notes
- Storage: object storage + operations.
- Logging: ingested log volume.
- Tasks: queued task count + dispatches.
- Monitoring: custom metric ingestion.
- Pub/Sub: message publish/egress.

# OPERATIONS

## Production operations guide

This guide covers monitoring, deployment, rollback, and troubleshooting for FlowSync.

## Core SLO metrics

- API p95 latency < 500ms
- Error rate < 1% over 5 minutes
- Availability > 99.9%
- Route calculation p95 < 200ms

## Alerting rules

- **Critical:** 5xx error rate > 5% for 5 minutes
- **Warning:** p95 latency > 800ms for 10 minutes
- **Critical:** health endpoint unavailable for 2 consecutive checks
- **Warning:** queue backlog exceeds configured threshold

## Deployment procedure

1. Run lint and tests locally.
2. Merge approved PR to `main`.
3. CI executes test/security/deploy workflows.
4. Validate `/health` and key API smoke tests.
5. Watch latency/error dashboards for 30 minutes.

## Rollback strategy

- Trigger rollback when SLO violations persist beyond configured windows.
- Redeploy last known healthy revision.
- Re-run smoke tests and confirm metrics recovery.

## Troubleshooting

### Elevated API latency

- Check cache status and upstream cloud service latency.
- Review recent deploy diff and route-planning hot paths.

### Authentication failures

- Confirm `JWT_SECRET` and token issuer/signing algorithm alignment.
- Verify Authorization header formatting (`Bearer <token>`).

### Input validation/sanitization regressions

- Confirm middleware order includes sanitizer before handlers.
- Inspect logs for blocked payload patterns and false positives.

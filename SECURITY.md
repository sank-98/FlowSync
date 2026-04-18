# SECURITY

## Security posture

FlowSync applies defense-in-depth controls for API, runtime, and cloud integrations.

## Threat model

- **Assets:** user identity, route recommendations, venue state, cloud credentials.
- **Attack surfaces:** REST APIs, auth headers, query/body payloads, cloud service clients.
- **Threat actors:** anonymous internet clients, compromised user accounts, malicious insiders.

## OWASP Top 10 mitigations

- **A01 Broken Access Control:** role checks via `requireRole`, route-level authorization.
- **A02 Cryptographic Failures:** JWT signature validation, HTTPS enforcement in production.
- **A03 Injection:** recursive input sanitization and request validation.
- **A04 Insecure Design:** least-privilege service account model and feature flags.
- **A05 Security Misconfiguration:** env-driven config with production-safe defaults.
- **A06 Vulnerable Components:** automated dependency scans and audit in CI.
- **A07 Identification/Auth Failures:** bearer token verification and token-expiry enforcement.
- **A08 Software/Data Integrity Failures:** controlled CI/CD pipeline and branch protection.
- **A09 Logging/Monitoring Failures:** structured logs and cloud monitoring metrics.
- **A10 SSRF:** restricted cloud endpoints and strict allow-list based network access.

## Secure development checklist

- [ ] Use `authGuard` for protected routes.
- [ ] Add `requireRole([...])` where access is role-scoped.
- [ ] Apply `input-sanitizer` before request handlers that process user input.
- [ ] Never log secrets, tokens, or full credentials.
- [ ] Keep `JWT_SECRET` set in all non-local environments.
- [ ] Run lint/tests/security scan before merge.

## Incident response

1. **Detect:** triage alerts from CI, logs, and monitoring dashboards.
2. **Contain:** disable impacted feature flags and rotate keys/secrets.
3. **Eradicate:** patch vulnerable code/dependencies and redeploy.
4. **Recover:** verify health checks, replay smoke tests, monitor for recurrence.
5. **Postmortem:** record timeline, root cause, and follow-up actions.

## Reporting vulnerabilities

Please open a private security report through GitHub Security Advisories or contact maintainers directly before public disclosure.

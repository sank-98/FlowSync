# Security Hardening Guide

FlowSync now includes baseline production hardening in `server.js`:

- HTTPS redirect enforcement (opt-in with `ENABLE_HTTPS_REDIRECT=true`)
- Security headers: CSP, HSTS, frame/content protections, referrer and permissions policy
- Origin/referer CSRF checks for mutating `/api/*` routes
- Request rate limiting with configurable limits
- Input sanitization and JSON response escaping
- Optional token-based protection for simulation control APIs (`API_AUTH_TOKEN`)

## Required runtime settings

Configure these values using environment secrets (never commit real values):

- `API_AUTH_TOKEN`
- `GOOGLE_GEMINI_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT`

## Verification

Run:

```bash
npm test -- --runInBand __tests__/security.test.js
```

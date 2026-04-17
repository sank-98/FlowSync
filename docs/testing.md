# Testing Guide

FlowSync uses Jest + Supertest.

## Security tests

```bash
npm test -- --runInBand __tests__/security.test.js
```

## Accessibility markup tests

```bash
npm test -- --runInBand __tests__/accessibility.test.js
```

## Full test run

```bash
npm test
```

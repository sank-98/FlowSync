'use strict';

const express = require('express');

function createHealthRouter(options = {}) {
  const router = express.Router();
  const {
    checkDatabase = async () => ({ ok: true, detail: 'database: not configured' }),
    checkExternal = async () => ({ ok: true, detail: 'external services: not configured' })
  } = options;

  router.get('/live', (_req, res) => {
    res.status(200).json({ status: 'ok', probe: 'liveness', timestamp: new Date().toISOString() });
  });

  router.get('/ready', async (_req, res) => {
    const db = await checkDatabase();
    const ext = await checkExternal();
    const ok = db.ok && ext.ok;
    res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'degraded', probe: 'readiness', db, external: ext });
  });

  router.get('/deep', async (_req, res) => {
    const start = Date.now();
    const db = await checkDatabase();
    const ext = await checkExternal();
    const elapsedMs = Date.now() - start;
    const ok = db.ok && ext.ok;

    res.status(ok ? 200 : 503).json({
      status: ok ? 'ok' : 'degraded',
      probe: 'deep-health',
      db,
      external: ext,
      performance: {
        checkDurationMs: elapsedMs
      },
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

module.exports = { createHealthRouter };

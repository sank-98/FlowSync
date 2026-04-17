const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({ status: 'healthy', service: 'flowsync', timestamp: new Date().toISOString() });
});

module.exports = router;

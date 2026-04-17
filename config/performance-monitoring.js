function trackPerformance(req, res, next) {
  const start = Date.now();
  res.setHeader('X-Response-Start', String(start));
  res.on('finish', () => {
    req.responseTimeMs = Date.now() - start;
  });
  next();
}

module.exports = { trackPerformance };

module.exports = {
  cacheTtlMs: Number(process.env.CACHE_TTL_MS || 5000),
  compressionThreshold: Number(process.env.COMPRESSION_THRESHOLD || 1024),
};

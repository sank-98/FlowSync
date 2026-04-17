const cache = new Map();

function set(key, value, ttlMs = 5000) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function del(key) {
  cache.delete(key);
}

module.exports = { set, get, del };

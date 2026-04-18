/**
 * In-Memory Cache Manager for FlowSync
 * Provides simple TTL-based caching for dashboard and frequently accessed data
 * 
 * @module cache-manager
 */

/**
 * Simple in-memory cache with TTL (Time To Live) support.
 * Stores key-value pairs and automatically expires entries after specified duration.
 */
class CacheManager {
  /**
   * Creates a new CacheManager instance.
   * Initializes empty cache store and TTL tracking map.
   */
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Sets a value in the cache with optional TTL.
   * If key already exists, clears its TTL timer and replaces the value.
   * 
   * @param {string} key - Cache key identifier
   * @param {*} value - Value to cache (any type)
   * @param {number} [ttlMs=5000] - Time to live in milliseconds (default: 5 seconds)
   * @returns {void}
   * 
   * @example
   * cacheManager.set('dashboard', dashboardData, 3000);
   */
  set(key, value, ttlMs = 5000) {
    // Clear existing timer if present
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Store value
    this.cache.set(key, value);

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttlMs);

    this.timers.set(key, timer);
  }

  /**
   * Gets a value from the cache.
   * Returns the value if it exists and hasn't expired.
   * Does NOT extend the TTL on access.
   * 
   * @param {string} key - Cache key identifier
   * @returns {*|null} Cached value or null if not found/expired
   * 
   * @example
   * const dashboardData = cacheManager.get('dashboard');
   * if (dashboardData) {
   *   // Use cached data
   * } else {
   *   // Recalculate data
   * }
   */
  get(key) {
    return this.cache.get(key) || null;
  }

  /**
   * Checks if a key exists in the cache and is not expired.
   * 
   * @param {string} key - Cache key identifier
   * @returns {boolean} True if key exists and is valid
   * 
   * @example
   * if (cacheManager.has('dashboard')) {
   *   console.log('Using cached dashboard');
   * }
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Deletes a specific key from the cache immediately.
   * Clears its associated TTL timer.
   * 
   * @param {string} key - Cache key identifier
   * @returns {boolean} True if key was present and deleted, false otherwise
   * 
   * @example
   * cacheManager.delete('dashboard'); // Force refresh
   */
  delete(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return this.cache.delete(key);
  }

  /**
   * Clears all cache entries and cancels all TTL timers.
   * Useful for reset operations or shutdown.
   * 
   * @returns {void}
   * 
   * @example
   * cacheManager.clear(); // Invalidate all cache
   */
  clear() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.cache.clear();
  }

  /**
   * Gets the current number of cached items.
   * Useful for debugging and monitoring cache health.
   * 
   * @returns {number} Number of items currently in cache
   * 
   * @example
   * console.log(`Cache contains ${cacheManager.size()} items`);
   */
  size() {
    return this.cache.size;
  }

  /**
   * Gets all keys currently in the cache.
   * 
   * @returns {Array<string>} Array of all cache keys
   * 
   * @example
   * const keys = cacheManager.keys();
   * console.log('Cached keys:', keys);
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Gets cache statistics for monitoring and debugging.
   * Returns information about cache state and size.
   * 
   * @returns {Object} Statistics object with itemCount and keys
   * 
   * @example
   * const stats = cacheManager.stats();
   * console.log(`Cache: ${stats.itemCount} items`);
   */
  stats() {
    return {
      itemCount: this.cache.size,
      keys: this.keys(),
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;

class LRUCache {
  constructor(limit = 5, ttlMs = 60 * 1000) {
    this.limit = limit;
    this.ttl = ttlMs;
    this.map = new Map();
  }

  get(key) {
    const entry = this.map.get(key);
    const now = Date.now();
    if (!entry) return null;
    if (now - entry.time > this.ttl) {
      this.map.delete(key);
      return null;
    }
    this.map.delete(key);
    this.map.set(key, { value: entry.value, time: entry.time });
    return entry.value;
  }

  set(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, { value, time: Date.now() });
    if (this.map.size > this.limit) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }
}

export const summaryCache = new LRUCache();
export { LRUCache };

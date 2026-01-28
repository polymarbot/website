/**
 * Generic cache utility module
 *
 * Provides a unified cache abstraction using Nitro's useStorage API.
 * Supports TTL, prefix-based invalidation, and optional serialization.
 *
 * All namespaces use the configured 'cache' storage mount point (lruCache driver).
 */

interface CacheOptions<T, S = T> {
  /** Storage namespace for cache isolation */
  namespace: string
  /** Optional TTL in milliseconds. If not set, cache is permanent until invalidated */
  ttl?: number
  /** Custom serializer for special types (e.g., bigint) */
  serialize?: (value: T) => S
  /** Custom deserializer for special types */
  deserialize?: (stored: S) => T
}

interface CacheEntry<S> {
  value: S
  expiredAt: number | null
}

interface Cache<T> {
  /**
   * Get cached value by key
   * @param key - Cache key
   * @param defaultValue - Optional function to provide default value on cache miss (will be stored)
   * @returns Cached value, default value, or null if no default provided
   */
  get: {
    (key: string): Promise<T | null>
    (key: string, defaultValue: () => Promise<T> | T): Promise<T>
  }

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to store
   */
  set: (key: string, value: T) => Promise<void>

  /**
   * Delete a cached value
   * @param key - Cache key
   */
  delete: (key: string) => Promise<void>

  /**
   * Check if a key exists and is not expired
   * @param key - Cache key
   */
  has: (key: string) => Promise<boolean>

  /**
   * Get multiple cached values
   * @param keys - Array of cache keys
   * @returns Map of key to value (only includes keys that exist and are not expired)
   */
  getMany: (keys: string[]) => Promise<Map<string, T>>

  /**
   * Set multiple values in cache
   * @param entries - Array of key-value pairs
   */
  setMany: (entries: Array<{ key: string, value: T }>) => Promise<void>

  /**
   * Invalidate cache entries matching prefix
   * @param prefix - Key prefix to match (e.g., 'list' matches 'list:0:10', 'list:10:10')
   */
  invalidate: (prefix: string) => Promise<void>

  /**
   * Invalidate all cache entries in this namespace
   */
  invalidateAll: () => Promise<void>
}

/**
 * Create a cache instance with the given options
 *
 * @example
 * ```ts
 * // Basic cache
 * const botsCache = createCache<Bot[]>({ namespace: 'bots' })
 * const data = await botsCache.get('list:0:10', () => db.bot.findMany(...))
 *
 * // Cache with TTL
 * const statsCache = createCache<Stats>({ namespace: 'stats', ttl: 30000 })
 *
 * // Cache with custom serialization (for bigint)
 * const balanceCache = createCache<bigint, string>({
 *   namespace: 'balance',
 *   ttl: 60000,
 *   serialize: v => v.toString(),
 *   deserialize: v => BigInt(v),
 * })
 * const balance = await balanceCache.get(address, () => getBalance(address))
 * ```
 */
export function createCache<T, S = T> (options: CacheOptions<T, S>): Cache<T> {
  // Use 'cache:' prefix to leverage configured lruCache storage
  const storage = useStorage<CacheEntry<S>>(`cache:${options.namespace}`)
  const ttl = options.ttl
  const serialize = options.serialize ?? ((v: T) => v as unknown as S)
  const deserialize = options.deserialize ?? ((v: S) => v as unknown as T)

  /**
   * Check if entry is valid (exists and not expired)
   */
  function isValid (entry: CacheEntry<S> | null): entry is CacheEntry<S> {
    if (!entry) return false
    return entry.expiredAt === null || entry.expiredAt > Date.now()
  }

  /**
   * Create a cache entry with TTL
   */
  function createEntry (value: T): CacheEntry<S> {
    return {
      value: serialize(value),
      expiredAt: ttl ? Date.now() + ttl : null,
    }
  }

  async function get (key: string, defaultValue?: () => Promise<T> | T): Promise<T | null> {
    const cached = await storage.getItem(key)
    if (isValid(cached)) {
      return deserialize(cached.value)
    }

    if (!defaultValue) {
      return null
    }

    const value = await defaultValue()

    await storage.setItem(key, createEntry(value))

    return value
  }

  return {
    get: get as Cache<T>['get'],

    async set (key: string, value: T): Promise<void> {
      await storage.setItem(key, createEntry(value))
    },

    async delete (key: string): Promise<void> {
      await storage.removeItem(key)
    },

    async has (key: string): Promise<boolean> {
      const cached = await storage.getItem(key)
      return isValid(cached)
    },

    async getMany (keys: string[]): Promise<Map<string, T>> {
      const result = new Map<string, T>()

      await Promise.all(keys.map(async key => {
        const cached = await storage.getItem(key)
        if (isValid(cached)) {
          result.set(key, deserialize(cached.value))
        }
      }))

      return result
    },

    async setMany (entries: Array<{ key: string, value: T }>): Promise<void> {
      await Promise.all(entries.map(({ key, value }) =>
        storage.setItem(key, createEntry(value)),
      ))
    },

    async invalidate (prefix: string): Promise<void> {
      const keys = await storage.getKeys()
      const matchingKeys = keys.filter(key => key.startsWith(prefix))
      await Promise.all(matchingKeys.map(key => storage.removeItem(key)))
    },

    async invalidateAll (): Promise<void> {
      // WARNING: storage.clear() does not work as expected with namespaced storage.
      // It ignores the prefix and may not clear any keys. This is a known issue:
      // https://github.com/unjs/unstorage/issues/336
      // Tested with unstorage@1.17.3. Re-test before using if version changes.
      // await storage.clear()
      const keys = await storage.getKeys()
      await Promise.all(keys.map(key => storage.removeItem(key)))
    },
  }
}

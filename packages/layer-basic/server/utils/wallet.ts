/**
 * Shared wallet cache utilities
 *
 * Provides cached USDC balance queries with stale fallback support.
 * Each app creates its own wallet cache instance with app-specific TTL.
 */
import { getTokenBalance, getTokenBalancesBatch } from '@polymarbot/shared/wallet'

export { formatBalance } from '@polymarbot/shared/wallet'

/**
 * Create a wallet cache instance with the given TTL.
 *
 * @param ttl - Cache TTL in milliseconds
 * @returns Object with cached balance query methods
 */
export function createWalletCache (ttl: number) {
  const balanceCache = createCache<bigint, string>({
    namespace: 'balance',
    ttl,
    serialize: v => v.toString(),
    deserialize: v => BigInt(v),
  })

  /**
   * Query USDC balance with cache support (single address)
   */
  async function getBalanceCached (address: string): Promise<bigint> {
    const cacheKey = address.toLowerCase()
    return await balanceCache.get(cacheKey, () => getTokenBalance(address))
  }

  /**
   * Expire balance cache for a specific address.
   * The stale value remains accessible for fallback use.
   */
  async function invalidateBalance (address: string): Promise<void> {
    const cacheKey = address.toLowerCase()
    await balanceCache.expire(cacheKey)
  }

  /**
   * Query USDC balances for multiple addresses with cache support.
   * Uses multicall for uncached addresses with stale fallback on failure.
   */
  async function getBalancesBatchCached (addresses: string[]): Promise<bigint[]> {
    if (addresses.length === 0) return []

    const cacheKeys = addresses.map(addr => addr.toLowerCase())
    const results: bigint[] = new Array(addresses.length)

    // Check cache for all addresses
    const cached = await balanceCache.getMany(cacheKeys)

    // Identify uncached addresses
    const uncachedIndices: number[] = []
    const uncachedAddresses: string[] = []

    cacheKeys.forEach((key, index) => {
      const cachedValue = cached.get(key)
      if (cachedValue !== undefined) {
        results[index] = cachedValue
      } else {
        uncachedIndices.push(index)
        uncachedAddresses.push(addresses[index]!)
      }
    })

    if (uncachedAddresses.length === 0) return results

    // Query uncached addresses using multicall
    const batchResults = await getTokenBalancesBatch(uncachedAddresses)

    // Separate successful and failed queries
    const cacheEntries: Array<{ key: string, value: bigint }> = []
    const failedCacheKeys: string[] = []
    const failedIndices: number[] = []

    for (let i = 0; i < uncachedIndices.length; i++) {
      const originalIndex = uncachedIndices[i]!
      const result = batchResults[i]!

      if (result.status === 'success') {
        const balance = BigInt(result.result)
        results[originalIndex] = balance
        cacheEntries.push({
          key: cacheKeys[originalIndex]!,
          value: balance,
        })
      } else {
        console.error(`Failed to query USDC balance for ${uncachedAddresses[i]}:`, result.error)
        failedCacheKeys.push(cacheKeys[originalIndex]!)
        failedIndices.push(originalIndex)
      }
    }

    // Update cache for successful queries
    if (cacheEntries.length > 0) {
      await balanceCache.setMany(cacheEntries)
    }

    // For failed queries, fallback to stale cached values or 0n
    if (failedCacheKeys.length > 0) {
      const staleValues = await balanceCache.getManyStale(failedCacheKeys)
      for (let i = 0; i < failedCacheKeys.length; i++) {
        results[failedIndices[i]!] = staleValues.get(failedCacheKeys[i]!) ?? 0n
      }
    }

    return results
  }

  return {
    getBalanceCached,
    getBalancesBatchCached,
    invalidateBalance,
  }
}

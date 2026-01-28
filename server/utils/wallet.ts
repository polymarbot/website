/**
 * Wallet utilities
 */
import { getUSDCBalance, getUSDCBalancesBatch } from '@polymarbot/shared/wallet'
import { CACHE_TTL } from './constants'

export { formatBalance } from '@polymarbot/shared/wallet'

// Create balance cache with bigint serialization
const balanceCache = createCache<bigint, string>({
  namespace: 'balance',
  ttl: CACHE_TTL.DASHBOARD_BALANCE,
  serialize: v => v.toString(),
  deserialize: v => BigInt(v),
})

/**
 * Query USDC balance with cache support (single address)
 * @param address - Wallet address to query
 * @returns USDC balance (raw value, use formatBalance to format)
 */
export async function getUSDCBalanceCached (address: string): Promise<bigint> {
  const cacheKey = address.toLowerCase()
  return await balanceCache.get(cacheKey, () => getUSDCBalance(address))
}

/**
 * Invalidate balance cache for a specific address
 * @param address - Wallet address to invalidate
 */
export async function invalidateBalanceCache (address: string): Promise<void> {
  const cacheKey = address.toLowerCase()
  await balanceCache.delete(cacheKey)
}

/**
 * Query USDC balances for multiple addresses with cache support
 * Optimized: Uses multicall for uncached addresses
 *
 * @param addresses - Array of wallet addresses to query
 * @returns Array of USDC balances (same order as input addresses)
 */
export async function getUSDCBalancesBatchCached (addresses: string[]): Promise<bigint[]> {
  if (addresses.length === 0) {
    return []
  }

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

  // If all cached, return early
  if (uncachedAddresses.length === 0) {
    return results
  }

  // Query uncached addresses using multicall
  const balances = await getUSDCBalancesBatch(uncachedAddresses)

  // Process results and prepare cache entries
  const cacheEntries: Array<{ key: string, value: bigint }> = []

  for (let i = 0; i < uncachedIndices.length; i++) {
    const originalIndex = uncachedIndices[i]!
    const balance = balances[i]!
    results[originalIndex] = balance

    cacheEntries.push({
      key: cacheKeys[originalIndex]!,
      value: balance,
    })
  }

  // Update cache in batch
  await balanceCache.setMany(cacheEntries)

  return results
}

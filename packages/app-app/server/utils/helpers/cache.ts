/**
 * Invalidate internal bots cache for specific intervals.
 * Also invalidates the unfiltered (all) cache since it contains all intervals.
 */
export async function invalidateBotsCacheByIntervals (intervals: string[]) {
  const cache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })
  const unique = [ ...new Set(intervals) ]
  await Promise.all([
    ...unique.map(i => cache.invalidate(`${i}:`)),
    cache.invalidate('all:'),
  ])
}

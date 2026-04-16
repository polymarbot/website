/**
 * POST /api/wallets/bridge-quote
 *
 * Get a bridge quote for cross-chain withdrawal.
 * Returns estimated output amount, fees, and estimated time.
 * Results are cached server-side for 30 seconds.
 */
export default defineWrappedResponseHandler(async event => {
  await requireAuthSession(event)

  const body = await readBody(event)
  const { toChainId, toTokenAddress, recipientAddr, amount } = validateRequestData(
    body,
    'POST',
    '/api/wallets/bridge-quote',
  )

  const cacheKey = [ toChainId, toTokenAddress, recipientAddr, amount ].join(':')
  const cache = createCache<BridgeQuoteResponse>({
    namespace: CACHE_NS.BRIDGE_QUOTE,
    ttl: CACHE_TTL.BRIDGE_QUOTE,
  })

  try {
    return await cache.get(cacheKey, () =>
      getBridgeQuote({ toChainId, toTokenAddress, recipientAddr, amount }),
    )
  } catch (error) {
    console.error('Failed to get bridge quote:', error)
    throwApiError(500, ERROR_CODES.BRIDGE_QUOTE_FAILED)
  }
})

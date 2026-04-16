/**
 * GET /api/wallets/bridge-supported-assets
 *
 * Returns the list of chains and tokens supported by the Polymarket Bridge.
 * Results are cached server-side for 1 hour.
 */
export default defineWrappedResponseHandler(async event => {
  await requireAuthSession(event)

  const cache = createCache<BridgeSupportedAssetsResponse>({
    namespace: CACHE_NS.BRIDGE_ASSETS,
    ttl: CACHE_TTL.BRIDGE_ASSETS,
  })

  try {
    return await cache.get('supported', getBridgeSupportedAssets)
  } catch (error) {
    console.error('Failed to fetch bridge supported assets:', error)
    throwApiError(500, ERROR_CODES.BRIDGE_FETCH_ASSETS_FAILED)
  }
})

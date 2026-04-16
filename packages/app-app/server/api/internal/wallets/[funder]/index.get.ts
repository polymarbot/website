/**
 * GET /api/internal/wallets/[funder]
 *
 * Get wallet information by funder address.
 * Returns wallet details including encrypted private key.
 *
 * Authentication: Bearer token via Authorization header
 * External scripts need ENCRYPTION_KEY to decrypt wallet private keys.
 */
export default defineWrappedResponseHandler(async event => {
  await requireInternalApiKey(event)

  const funder = validateRequestParams(event, 'funder')
  const wallet = await validateWalletExists(funder)

  return wallet
})

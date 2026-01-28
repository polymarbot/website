import type { Address } from 'viem'

/**
 * GET /api/wallets/:funder/deposit
 *
 * Get deposit addresses for a wallet.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const funder = validateRequestParams(event, 'funder')
  const wallet = await validateWalletOwnership(funder, user.id)

  // Get deposit addresses
  const response = await getDepositAddress({
    address: wallet.funder as Address,
  })

  return response
})

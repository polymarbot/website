/**
 * GET /api/wallets/:funder
 *
 * Get wallet details by funder address.
 * Returns wallet information including name, status, balance, timestamps.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const funder = validateRequestParams(event, 'funder')
  const wallet = await validateWalletOwnership(funder, user.id)

  // Query wallet balance
  const balance = await getUSDCBalanceCached(funder)

  return {
    funder: wallet.funder,
    name: wallet.name,
    status: wallet.status,
    balance: formatBalance(balance),
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  }
})

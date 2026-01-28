/**
 * GET /api/dashboard/balance
 *
 * Get total USDC balance across all user wallets.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  // Get all user wallets
  const wallets = await db.wallet.findMany({
    where: {
      ownerId: user.id,
      deleted: false,
    },
    select: {
      funder: true,
    },
  })

  if (wallets.length === 0) {
    return {
      totalBalance: '0',
      walletCount: 0,
    }
  }

  // Query balances using multicall (single RPC call for all addresses)
  const addresses = wallets.map(wallet => wallet.funder)
  const balances = await getUSDCBalancesBatchCached(addresses)

  // Sum all balances
  const totalBalanceRaw = balances.reduce((sum, balance) => sum + balance, 0n)
  return {
    totalBalance: formatBalance(totalBalanceRaw),
    walletCount: wallets.length,
  }
})

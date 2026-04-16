import type { Address } from 'viem'
import { parseUnits } from 'viem'

/**
 * POST /api/wallets/:funder/transfer
 *
 * Transfer USDC from Safe wallet to a recipient address on Polygon.
 * Transactions are queued to prevent in-flight transaction limit errors.
 *
 * If wallet is INACTIVE/FAILED, it will be automatically activated first,
 * then the withdrawal will be executed. In this case, walletActivating=true
 * is returned and the user should check PolygonScan for transaction status.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const funder = validateRequestParams(event, 'funder')
  const body = await readBody(event)
  const { toAddress, amount } = validateRequestData(body, 'POST', '/api/wallets/[funder]/transfer')

  const wallet = await validateWalletOwnership(funder, user.id)

  // Handle wallet status - if deploying, reject
  if (wallet.status === WalletStatus.DEPLOYING) {
    throwApiError(400, ERROR_CODES.WALLET_DEPLOYING)
  }

  // Parse amount to raw units (USDC has 6 decimals)
  const amountRaw = parseUnits(amount, USDCE_DECIMALS)

  // Check balance
  const balance = await getUSDCeBalanceCached(wallet.funder)
  if (amountRaw > balance) {
    throwApiError(400, ERROR_CODES.WALLET_INSUFFICIENT_BALANCE)
  }

  // If wallet is INACTIVE or FAILED, activate first then withdraw
  if (wallet.status === WalletStatus.INACTIVE || wallet.status === WalletStatus.FAILED) {
    await triggerEnableTrading(wallet, async () => {
      const result = await executeWalletTransfer(wallet, toAddress as Address, amountRaw)
      console.debug(`Withdrawal succeeded for wallet: ${wallet.funder}, txHash: ${result.transactionHash}`)

      // Invalidate balance cache after successful withdrawal
      // Also invalidate toAddress cache in case it's another user wallet
      await Promise.all([
        invalidateBalanceCache(wallet.funder),
        invalidateBalanceCache(toAddress as Address),
      ])
    })

    return {
      walletActivating: true,
      funder: wallet.funder,
    }
  }

  // Wallet is ACTIVE
  try {
    const result = await executeWalletTransfer(wallet, toAddress as Address, amountRaw)
    console.debug(`Withdrawal succeeded for wallet: ${wallet.funder}, txHash: ${result.transactionHash}`)

    // Invalidate balance cache after successful withdrawal
    // Also invalidate toAddress cache in case it's another user wallet
    await Promise.all([
      invalidateBalanceCache(wallet.funder),
      invalidateBalanceCache(toAddress as Address),
    ])

    return {
      transactionHash: result.transactionHash,
    }
  } catch (error) {
    console.error('Withdrawal failed:', error)
    throwApiError(500, ERROR_CODES.WALLET_WITHDRAW_FAILED)
  }
})

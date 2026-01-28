import type { Address, Hex } from 'viem'
import { parseUnits } from 'viem'

/**
 * POST /api/wallets/:funder/withdraw
 *
 * Withdraw USDC from Safe wallet to a recipient address on Polygon.
 * This operation is gasless via Polymarket Relayer.
 *
 * Note: This endpoint returns immediately after the relayer accepts the transaction.
 * It does NOT wait for the transaction to be mined on-chain.
 *
 * If wallet is INACTIVE/FAILED, it will be automatically activated first,
 * then the withdrawal will be executed. In this case, walletActivating=true
 * is returned and the user should check PolygonScan for transaction status.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const funder = validateRequestParams(event, 'funder')
  const body = await readBody(event)
  const { toAddress, amount } = validateRequestData(body, 'POST', '/api/wallets/[funder]/withdraw')

  const wallet = await validateWalletOwnership(funder, user.id)

  // Handle wallet status - if deploying, reject
  if (wallet.status === WalletStatus.DEPLOYING) {
    throwApiError(400, ERROR_CODES.WALLET_DEPLOYING)
  }

  // Parse amount to raw units (USDC has 6 decimals)
  const amountRaw = parseUnits(amount, USDC_DECIMALS)

  // Check balance
  const balance = await getUSDCBalanceCached(wallet.funder)
  if (amountRaw > balance) {
    throwApiError(400, ERROR_CODES.WALLET_INSUFFICIENT_BALANCE)
  }

  // If wallet is INACTIVE or FAILED, activate first then withdraw
  if (wallet.status === WalletStatus.INACTIVE || wallet.status === WalletStatus.FAILED) {
    await triggerEnableTrading(wallet, async () => {
      // Decrypt private key and execute withdrawal
      const privateKey = decrypt(wallet.encryptedKey) as Hex
      const result = await withdrawUsdc(privateKey, toAddress as Address, amountRaw)
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

  // Wallet is ACTIVE, execute withdrawal directly
  try {
    const privateKey = decrypt(wallet.encryptedKey) as Hex
    const result = await withdrawUsdc(
      privateKey,
      toAddress as Address,
      amountRaw,
    )

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

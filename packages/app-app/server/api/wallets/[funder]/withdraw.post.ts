import type { Address } from 'viem'
import { parseUnits } from 'viem'

/**
 * POST /api/wallets/:funder/withdraw
 *
 * Execute a cross-chain bridge withdrawal.
 * 1. Get a bridge withdraw address from Polymarket Bridge API (/withdraw)
 * 2. Transfer USDC.e to the withdraw address via Polymarket Relayer (gasless)
 * 3. The bridge automatically converts and delivers tokens to the recipient on the target chain
 *
 * If wallet is INACTIVE/FAILED, it will be automatically activated first.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const funder = validateRequestParams(event, 'funder')
  const body = await readBody(event)
  const { toChainId, toTokenAddress, recipientAddr, amount } = validateRequestData(
    body,
    'POST',
    '/api/wallets/[funder]/withdraw',
  )

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

  // Get bridge withdraw address
  let withdrawAddress: string
  try {
    const bridgeResponse = await getBridgeWithdrawAddress({
      address: funder,
      toChainId,
      toTokenAddress,
      recipientAddr,
    })
    // Always use EVM address since we're sending USDC.e from Polygon
    withdrawAddress = bridgeResponse.address.evm
  } catch (error) {
    console.error('Failed to get bridge withdraw address:', error)
    throwApiError(500, ERROR_CODES.BRIDGE_WITHDRAW_FAILED)
  }

  // If wallet is INACTIVE or FAILED, activate first then withdraw
  if (wallet.status === WalletStatus.INACTIVE || wallet.status === WalletStatus.FAILED) {
    await triggerEnableTrading(wallet, async () => {
      const result = await executeWalletTransfer(wallet, withdrawAddress as Address, amountRaw)
      console.debug(`Bridge withdrawal succeeded for wallet: ${wallet.funder}, txHash: ${result.transactionHash}`)

      await invalidateBalanceCache(wallet.funder)
    })

    return {
      walletActivating: true,
      funder: wallet.funder,
    }
  }

  // Wallet is ACTIVE
  try {
    const result = await executeWalletTransfer(wallet, withdrawAddress as Address, amountRaw)

    await invalidateBalanceCache(wallet.funder)

    return {
      transactionHash: result.transactionHash,
    }
  } catch (error) {
    console.error('Bridge withdrawal failed:', error)
    throwApiError(500, ERROR_CODES.BRIDGE_WITHDRAW_FAILED)
  }
})

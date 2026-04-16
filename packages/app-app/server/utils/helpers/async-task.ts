import type { Address, Hex } from 'viem'
import type { ExecRelayerTransactionResult } from '../polymarket-safe-wallet'

/**
 * Wallet data required for wallet operations
 */
interface WalletData {
  funder: string
  encryptedKey: string
}

/**
 * Execute a USDC transfer through the wallet transfer queue
 *
 * All USDC transfers MUST go through this queue to prevent
 * "in-flight transaction limit reached for delegated accounts" errors.
 * The queue ensures transfers are executed sequentially and each
 * transaction waits for on-chain confirmation before the next one starts.
 *
 * This function handles: queue -> decrypt key -> transfer USDC -> return result
 */
export async function executeWalletTransfer (
  wallet: WalletData,
  toAddress: Address,
  amount: bigint,
): Promise<ExecRelayerTransactionResult> {
  return await QueueManager.execute(`${QUEUE_IDS.WALLET_TRANSFER}:${wallet.funder}`, async () => {
    const privateKey = decrypt(wallet.encryptedKey) as Hex
    return await withdrawUsdc(privateKey, wallet.funder as Address, toAddress, amount)
  })
}

/**
 * Trigger enable trading for a wallet asynchronously
 *
 * This function:
 * 1. Updates wallet status to DEPLOYING immediately
 * 2. Queues the enable trading operation (ENABLE_TRADING queue)
 * 3. On success: updates wallet to ACTIVE, executes callback, invalidates cache
 * 4. On failure: updates wallet to FAILED
 *
 * Note: onSuccess callback may call executeWalletTransfer (WALLET_TRANSFER queue),
 * which is safe because the two queues are independent.
 *
 * @param wallet - The wallet object with funder and encryptedKey
 * @param onSuccess - Callback to execute after successful enable trading
 */
export async function triggerEnableTrading (
  wallet: WalletData,
  onSuccess?: () => Promise<void>,
): Promise<void> {
  const { funder, encryptedKey } = wallet

  // Update wallet status to DEPLOYING before queueing
  await appDb.wallet.update({
    where: { funder },
    data: { status: WalletStatus.DEPLOYING },
  })

  // Queue the enable trading operation
  QueueManager.execute(`${QUEUE_IDS.ENABLE_TRADING}:${funder}`, async () => {
    try {
      // Decrypt private key at execution time for security
      const privateKey = decrypt(encryptedKey) as Hex

      // Step 1: Enable trading (deploy + approve tokens)
      await enableTrading(privateKey)

      // Step 2: Update wallet status to ACTIVE
      await appDb.wallet.update({
        where: { funder },
        data: { status: WalletStatus.ACTIVE },
      })
      console.debug(`Enable trading succeeded for wallet: ${funder}`)

      // Step 3: Execute success callback if provided
      if (onSuccess) {
        await onSuccess()
      }

      // Step 4: Invalidate wallets cache
      const walletsCache = createCache({ namespace: CACHE_NS.INTERNAL_WALLETS })
      await walletsCache.invalidateAll()
    } catch (error) {
      console.error(`Enable trading failed for wallet: ${funder}`, error)
      await appDb.wallet.update({
        where: { funder },
        data: { status: WalletStatus.FAILED },
      })
    }
  })
}

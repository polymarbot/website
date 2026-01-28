import type { Hex } from 'viem'

/**
 * Wallet data required for enable trading
 */
interface WalletForEnableTrading {
  funder: string
  encryptedKey: string
}

/**
 * Trigger enable trading for a wallet asynchronously
 *
 * This function:
 * 1. Updates wallet status to DEPLOYING immediately
 * 2. Queues the enable trading operation
 * 3. On success: updates wallet to ACTIVE, executes callback, invalidates cache
 * 4. On failure: updates wallet to FAILED
 *
 * @param wallet - The wallet object with funder and encryptedKey
 * @param onSuccess - Callback to execute after successful enable trading
 */
export async function triggerEnableTrading (
  wallet: WalletForEnableTrading,
  onSuccess?: () => Promise<void>,
): Promise<void> {
  const { funder, encryptedKey } = wallet

  // Update wallet status to DEPLOYING before queueing
  await db.wallet.update({
    where: { funder },
    data: { status: WalletStatus.DEPLOYING },
  })

  // Queue the enable trading operation
  QueueManager.execute(QUEUE_IDS.ENABLE_TRADING, async () => {
    try {
      // Decrypt private key at execution time for security
      const privateKey = decrypt(encryptedKey) as Hex

      // Step 1: Enable trading (deploy + approve tokens)
      await enableTrading(privateKey)

      // Step 2: Update wallet status to ACTIVE
      await db.wallet.update({
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
      await db.wallet.update({
        where: { funder },
        data: { status: WalletStatus.FAILED },
      })
    }
  })
}

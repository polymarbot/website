/**
 * Recover wallets stuck in DEPLOYING status on server startup.
 *
 * If the server restarts while wallets are being deployed,
 * the in-memory queue is lost and those wallets stay in DEPLOYING forever.
 * This plugin resets them to FAILED so they can be retried.
 */
export default defineNitroPlugin(() => {
  recoverStaleDeployingWallets().catch(console.error)
})

async function recoverStaleDeployingWallets () {
  const result = await appDb.wallet.updateMany({
    where: {
      status: WalletStatus.DEPLOYING,
    },
    data: {
      status: WalletStatus.FAILED,
    },
  })

  if (result.count > 0) {
    console.debug(`Recovered ${result.count} stale DEPLOYING wallet(s) to FAILED`)
  }
}

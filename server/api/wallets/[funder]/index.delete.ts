/**
 * DELETE /api/wallets/:funder
 *
 * Soft delete a wallet (set deleted flag to true).
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const funder = validateRequestParams(event, 'funder')
  await validateWalletOwnership(funder, user.id)
  await validateWalletNoBots(funder)

  // Soft delete
  await db.wallet.update({
    where: { funder },
    data: { deleted: true },
  })

  return { success: true }
})

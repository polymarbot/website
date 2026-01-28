/**
 * PATCH /api/wallets/:funder
 *
 * Update wallet name for the authenticated user.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const funder = validateRequestParams(event, 'funder')
  const body = await readBody(event)
  const { name } = validateRequestData(body, 'PATCH', '/api/wallets/[funder]')

  await validateWalletOwnership(funder, user.id)

  // Update wallet name
  const updatedWallet = await db.wallet.update({
    where: { funder },
    data: { name },
    select: {
      funder: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return updatedWallet
})

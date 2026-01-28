/**
 * DELETE /api/strategies/:id
 *
 * Delete a strategy (hard delete).
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')
  await validateStrategyOwnership(id, user.id)
  await validateStrategyNoBots(id)

  // Hard delete
  await db.strategy.delete({ where: { id }})

  return { success: true }
})

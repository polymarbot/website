/**
 * DELETE /api/bots/:id
 *
 * Delete a bot.
 * Only allowed when bot is disabled.
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')
  const bot = await validateBotOwnership(id, user.id)

  // Check if bot is enabled
  if (bot.enabled) {
    throwApiError(400, ERROR_CODES.BOT_ENABLED_CANNOT_DELETE)
  }

  // Delete bot (cascades to BotOperationHistory)
  await db.bot.delete({ where: { id }})

  return { success: true }
})

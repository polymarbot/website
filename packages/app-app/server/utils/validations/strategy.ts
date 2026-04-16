/**
 * Strategy Validation Utilities
 */

// ============================================================================
// Existence
// ============================================================================

/**
 * Validate strategy does not exist with the same configuration
 */
export async function validateStrategyNotExists (
  ownerId: string,
  strategyHash: string,
  interval: string,
): Promise<void> {
  const strategy = await appDb.strategy.findFirst({
    where: {
      ownerId,
      strategyHash,
      interval,
    },
  })

  if (strategy) {
    throwApiError(409, ERROR_CODES.STRATEGY_ALREADY_EXISTS)
  }
}

// ============================================================================
// Ownership
// ============================================================================

/**
 * Validate strategy exists and belongs to the current user
 */
export async function validateStrategyOwnership (
  id: string,
  userId: string,
): Promise<Strategy> {
  const strategy = await appDb.strategy.findFirst({
    where: {
      id,
      ownerId: userId,
    },
  })

  if (!strategy) {
    throwApiError(404, ERROR_CODES.STRATEGY_NOT_FOUND)
  }

  return strategy
}

// ============================================================================
// Dependencies
// ============================================================================

/**
 * Check if strategy has dependent bots and throw error if any exist
 */
export async function validateStrategyNoBots (strategyId: string): Promise<void> {
  const result = await checkDependentBots({ strategyId })

  if (result.count > 0) {
    throwApiError(400, ERROR_CODES.STRATEGY_HAS_BOTS, {
      botCount: result.count,
      bots: result.bots,
    })
  }
}

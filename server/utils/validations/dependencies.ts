/**
 * Dependent Resource Validation Utilities
 *
 * Provides helpers for checking dependent resources before deletion.
 */

/** Bot info for error details */
interface BotInfo {
  symbol: string
  interval: string
}

/** Dependent bots check result */
interface DependentBotsResult {
  count: number
  bots: BotInfo[]
}

/**
 * Check if wallet has dependent bots and throw error if any exist
 *
 * @param funder - Wallet funder address
 * @throws ApiError with 400 status if wallet has bots
 *
 * @example
 * ```ts
 * await validateWalletNoBots(funder)
 * // Safe to delete wallet
 * ```
 */
export async function validateWalletNoBots (funder: string): Promise<void> {
  const result = await checkDependentBots({ funder })

  if (result.count > 0) {
    throwApiError(400, ERROR_CODES.WALLET_HAS_BOTS, {
      botCount: result.count,
      bots: result.bots,
    })
  }
}

/**
 * Check if strategy has dependent bots and throw error if any exist
 *
 * @param strategyId - Strategy ID
 * @throws ApiError with 400 status if strategy has bots
 *
 * @example
 * ```ts
 * await validateStrategyNoBots(strategyId)
 * // Safe to delete strategy
 * ```
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

/**
 * Check dependent bots with optimized count query
 *
 * Query 4 items first to determine if count query is needed.
 * Only queries exact count when there are more than 3 items.
 */
async function checkDependentBots (
  where: { funder?: string, strategyId?: string },
): Promise<DependentBotsResult> {
  const bots = await db.bot.findMany({
    where,
    select: {
      symbol: true,
      interval: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 4,
  })

  if (bots.length === 0) {
    return { count: 0, bots: []}
  }

  // Only query exact count when there are more than 3 bots
  const count = bots.length < 4
    ? bots.length
    : await db.bot.count({ where })

  return {
    count,
    bots: bots.slice(0, 3),
  }
}

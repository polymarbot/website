/**
 * Resource Ownership Validation Utilities
 *
 * Provides helpers for verifying resource ownership and access rights.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** Bot with wallet ownership info (minimal) */
export type BotWithWalletOwner = Bot & {
  wallet: Pick<Wallet, 'ownerId'>
}

/** Bot with full wallet and strategy info */
export type BotWithWalletAndStrategy = Bot & {
  wallet: Wallet
  strategy: Strategy
}

// ============================================================================
// Bot Ownership Verification
// ============================================================================

/**
 * Validate bot exists and belongs to the current user (via wallet ownership)
 *
 * @param id - Bot ID
 * @param userId - Current user ID
 * @returns The bot with wallet ownerId
 * @throws ApiError with 404 status if bot not found or not owned by user
 *
 * @example
 * ```ts
 * const bot = await validateBotOwnership(id, user.id)
 * ```
 */
export async function validateBotOwnership (
  id: string,
  userId: string,
): Promise<BotWithWalletOwner> {
  const bot = await db.bot.findUnique({
    where: { id },
    include: {
      wallet: {
        select: { ownerId: true },
      },
    },
  })

  if (!bot || bot.wallet.ownerId !== userId) {
    throwApiError(404, ERROR_CODES.BOT_NOT_FOUND)
  }

  return bot
}

/**
 * Validate bot ownership with full wallet and strategy info
 *
 * @param id - Bot ID
 * @param userId - Current user ID
 * @returns The bot with full wallet and strategy objects
 * @throws ApiError with 404 status if bot not found or not owned by user
 *
 * @example
 * ```ts
 * const bot = await validateBotOwnershipWithDetails(id, user.id)
 * // Access all fields: bot.wallet.status, bot.strategy.amount, etc.
 * ```
 */
export async function validateBotOwnershipWithDetails (
  id: string,
  userId: string,
): Promise<BotWithWalletAndStrategy> {
  const bot = await db.bot.findUnique({
    where: { id },
    include: {
      wallet: true,
      strategy: true,
    },
  })

  if (!bot || bot.wallet.ownerId !== userId) {
    throwApiError(404, ERROR_CODES.BOT_NOT_FOUND)
  }

  return bot
}

// ============================================================================
// Wallet Ownership Verification
// ============================================================================

/**
 * Validate wallet exists and belongs to the current user
 *
 * @param funder - Wallet funder address
 * @param userId - Current user ID
 * @returns The wallet
 * @throws ApiError with 404 status if wallet not found or not owned by user
 *
 * @example
 * ```ts
 * const wallet = await validateWalletOwnership(funder, user.id)
 * ```
 */
export async function validateWalletOwnership (
  funder: string,
  userId: string,
): Promise<Wallet> {
  const wallet = await db.wallet.findFirst({
    where: {
      funder,
      ownerId: userId,
      deleted: false,
    },
  })

  if (!wallet) {
    throwApiError(404, ERROR_CODES.WALLET_NOT_FOUND)
  }

  return wallet
}

// ============================================================================
// Strategy Ownership Verification
// ============================================================================

/**
 * Validate strategy exists and belongs to the current user
 *
 * @param id - Strategy ID
 * @param userId - Current user ID
 * @returns The strategy
 * @throws ApiError with 404 status if strategy not found or not owned by user
 *
 * @example
 * ```ts
 * const strategy = await validateStrategyOwnership(id, user.id)
 * ```
 */
export async function validateStrategyOwnership (
  id: string,
  userId: string,
): Promise<Strategy> {
  const strategy = await db.strategy.findFirst({
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

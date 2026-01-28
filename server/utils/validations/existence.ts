/**
 * Resource Existence Validation Utilities
 *
 * Provides helpers for checking if resources already exist,
 * with differentiated error messages based on ownership.
 */

// ============================================================================
// Wallet Existence Verification
// ============================================================================

/**
 * Validate wallet does not exist or is deleted
 *
 * @param funder - Wallet funder address (Safe address)
 * @param userId - Current user ID
 * @throws ApiError with 409 status if wallet exists and not deleted
 *
 * @example
 * ```ts
 * await validateWalletNotExists(funder, user.id)
 * ```
 */
export async function validateWalletNotExists (
  funder: string,
  userId: string,
): Promise<void> {
  const wallet = await db.wallet.findUnique({
    where: { funder },
    select: { ownerId: true, deleted: true },
  })

  if (!wallet || wallet.deleted) {
    return
  }

  if (wallet.ownerId === userId) {
    throwApiError(409, ERROR_CODES.WALLET_ALREADY_EXISTS)
  } else {
    throwApiError(409, ERROR_CODES.WALLET_ALREADY_IN_USE)
  }
}

// ============================================================================
// Bot Existence Verification
// ============================================================================

/**
 * Validate bot does not exist for the given market
 *
 * @param symbol - Market symbol
 * @param interval - Trading interval
 * @param funder - Wallet funder address
 * @throws ApiError with 409 status if bot already exists
 *
 * @example
 * ```ts
 * await validateBotNotExists(symbol, interval, funder)
 * ```
 */
export async function validateBotNotExists (
  symbol: string,
  interval: string,
  funder: string,
): Promise<void> {
  const bot = await db.bot.findUnique({
    where: {
      symbol_interval_funder: { symbol, interval, funder },
    },
  })

  if (bot) {
    throwApiError(409, ERROR_CODES.BOT_ALREADY_EXISTS)
  }
}

// ============================================================================
// Strategy Existence Verification
// ============================================================================

/**
 * Validate strategy does not exist with the same configuration
 *
 * @param ownerId - Strategy owner user ID
 * @param strategyHash - SHA-256 hash of normalized strategy JSON
 * @param interval - Trading interval
 * @throws ApiError with 409 status if strategy already exists
 *
 * @example
 * ```ts
 * await validateStrategyNotExists(user.id, strategyHash, interval)
 * ```
 */
export async function validateStrategyNotExists (
  ownerId: string,
  strategyHash: string,
  interval: string,
): Promise<void> {
  const strategy = await db.strategy.findFirst({
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
// User Existence Verification
// ============================================================================

/**
 * Validate user does not exist (for sign-up)
 *
 * @param email - User email
 * @throws ApiError with 409 status if user already exists
 *
 * @example
 * ```ts
 * await validateUserNotExists(email)
 * ```
 */
export async function validateUserNotExists (email: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { email },
  })

  if (user) {
    throwApiError(409, ERROR_CODES.AUTH_USER_ALREADY_EXISTS)
  }
}

/**
 * Validate user exists (for sign-in)
 *
 * @param email - User email
 * @throws ApiError with 404 status if user not found
 *
 * @example
 * ```ts
 * await validateUserExists(email)
 * ```
 */
export async function validateUserExists (email: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { email },
  })

  if (!user) {
    throwApiError(404, ERROR_CODES.AUTH_USER_NOT_FOUND)
  }
}

// ============================================================================
// Resource Existence with Return
// ============================================================================

/**
 * Validate wallet exists and return it
 *
 * @param funder - Wallet funder address
 * @returns The wallet
 * @throws ApiError with 404 status if wallet not found
 *
 * @example
 * ```ts
 * const wallet = await validateWalletExists(funder)
 * ```
 */
export async function validateWalletExists (funder: string): Promise<Wallet> {
  const wallet = await db.wallet.findUnique({
    where: { funder, deleted: false },
  })

  if (!wallet) {
    throwApiError(404, ERROR_CODES.WALLET_NOT_FOUND)
  }

  return wallet
}

/**
 * Validate bot exists and return it
 *
 * @param id - Bot ID
 * @returns The bot
 * @throws ApiError with 404 status if bot not found
 *
 * @example
 * ```ts
 * const bot = await validateBotExists(id)
 * ```
 */
export async function validateBotExists (id: string): Promise<Bot> {
  const bot = await db.bot.findUnique({
    where: { id },
  })

  if (!bot) {
    throwApiError(404, ERROR_CODES.BOT_NOT_FOUND)
  }

  return bot
}

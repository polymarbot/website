/**
 * Bot Validation Utilities
 */

// ============================================================================
// Type Definitions
// ============================================================================

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
// Existence
// ============================================================================

/**
 * Validate bot does not exist for the given market
 */
export async function validateBotNotExists (
  symbol: string,
  interval: string,
  funder: string,
): Promise<void> {
  const bot = await appDb.bot.findUnique({
    where: {
      symbol_interval_funder: { symbol, interval, funder },
    },
  })

  if (bot) {
    throwApiError(409, ERROR_CODES.BOT_ALREADY_EXISTS)
  }
}

/**
 * Validate bot exists and return it
 */
export async function validateBotExists (id: string): Promise<Bot> {
  const bot = await appDb.bot.findUnique({
    where: { id },
  })

  if (!bot) {
    throwApiError(404, ERROR_CODES.BOT_NOT_FOUND)
  }

  return bot
}

// ============================================================================
// Ownership
// ============================================================================

/**
 * Validate bot exists and belongs to the current user (via wallet ownership)
 */
export async function validateBotOwnership (
  id: string,
  userId: string,
): Promise<BotWithWalletOwner> {
  const bot = await appDb.bot.findUnique({
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
 */
export async function validateBotOwnershipWithDetails (
  id: string,
  userId: string,
): Promise<BotWithWalletAndStrategy> {
  const bot = await appDb.bot.findUnique({
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
// Dependencies
// ============================================================================

/**
 * Check dependent bots with optimized count query
 *
 * Query 4 items first to determine if count query is needed.
 * Only queries exact count when there are more than 3 items.
 */
export async function checkDependentBots (
  where: { funder?: string, strategyId?: string },
): Promise<DependentBotsResult> {
  const bots = await appDb.bot.findMany({
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
    : await appDb.bot.count({ where })

  return {
    count,
    bots: bots.slice(0, 3),
  }
}

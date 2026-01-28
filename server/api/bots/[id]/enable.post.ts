import { parseUnits } from 'viem'

/**
 * POST /api/bots/:id/enable
 *
 * Enable a bot for trading.
 * Checks:
 * - Strategy amount is within user's subscription limit
 * - Wallet balance >= (sum of all enabled bots amounts + current bot amount) * 10
 * - Wallet status (handles INACTIVE/FAILED by triggering enableTrading)
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const id = validateRequestParams(event, 'id')
  const bot = await validateBotOwnershipWithDetails(id, user.id)

  // Validate strategy amount against subscription limit
  await validateStrategyAmount(user.id, Number(bot.strategy.amount))

  // Check wallet status - if deploying, reject
  if (bot.wallet.status === WalletStatus.DEPLOYING) {
    throwApiError(400, ERROR_CODES.BOT_WALLET_DEPLOYING)
  }

  // Query all enabled bots for this wallet to calculate occupied funds
  const enabledBots = await db.bot.findMany({
    where: {
      funder: bot.funder,
      enabled: true,
    },
    select: {
      strategy: {
        select: {
          amount: true,
        },
      },
    },
  })

  // Calculate occupied amount from enabled bots
  const occupiedAmount = enabledBots.reduce((sum, b) => sum + Number(b.strategy.amount), 0)

  // Check wallet balance only in production: (occupied + current bot) * multiplier
  if (process.env.APP_ENV === 'prod') {
    const { botBalanceMultiplier } = useRuntimeConfig(event).public
    const balance = await getUSDCBalanceCached(bot.funder)
    const totalRequiredAmount = occupiedAmount + Number(bot.strategy.amount)
    const requiredBalance = parseUnits(String(totalRequiredAmount * botBalanceMultiplier), USDC_DECIMALS)

    if (balance < requiredBalance) {
      const shortfall = requiredBalance - balance
      throwApiError(400, ERROR_CODES.BOT_WALLET_INSUFFICIENT_BALANCE, {
        currentBalance: formatBalance(balance),
        occupiedAmount: occupiedAmount,
        currentBotAmount: Number(bot.strategy.amount),
        requiredBalance: formatBalance(requiredBalance),
        shortfall: formatBalance(shortfall),
      })
    }
  }

  // Handle wallet activation if needed
  if (bot.wallet.status === WalletStatus.INACTIVE || bot.wallet.status === WalletStatus.FAILED) {
    await triggerEnableTrading(bot.wallet, async () => {
      const now = new Date()

      // Enable bot and create operation history
      await db.$transaction([
        db.bot.update({
          where: { id: bot.id },
          data: {
            enabled: true,
            enabledAt: now,
          },
        }),
        db.botOperationHistory.create({
          data: {
            botId: bot.id,
            action: BotOperationType.ENABLED,
            reason: BotOperationReason.USER_ACTION,
          },
        }),
      ])

      // Invalidate bots cache
      const botsCache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })
      await botsCache.invalidateAll()

      console.debug(`Bot enabled after wallet activation: ${bot.id}`)
    })

    return {
      id: bot.id,
      symbol: bot.symbol,
      interval: bot.interval,
      funder: bot.funder,
      enabled: false, // Still disabled, will be enabled after wallet activation
      walletActivating: true,
    }
  }

  // Wallet is already ACTIVE, enable bot directly
  const now = new Date()

  const [ updatedBot ] = await db.$transaction([
    db.bot.update({
      where: { id },
      data: {
        enabled: true,
        enabledAt: now,
      },
      select: {
        id: true,
        symbol: true,
        interval: true,
        funder: true,
        strategyId: true,
        enabled: true,
        enabledAt: true,
        totalRuntimeSeconds: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.botOperationHistory.create({
      data: {
        botId: id,
        action: BotOperationType.ENABLED,
        reason: BotOperationReason.USER_ACTION,
      },
    }),
  ])

  // Invalidate internal caches
  const botsCache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })
  await botsCache.invalidateAll()

  // Invalidate wallets cache only if this is the first enabled bot for this wallet
  if (enabledBots.length === 0) {
    const walletsCache = createCache({ namespace: CACHE_NS.INTERNAL_WALLETS })
    await walletsCache.invalidateAll()
  }

  return updatedBot
})

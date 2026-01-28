import { parseUnits } from 'viem'

/**
 * POST /api/bots/batch-enable
 *
 * Batch enable disabled bots for the current user.
 * Supports optional filtering by symbols, intervals, funder, strategyId, or bot IDs.
 * Skips bots that don't meet requirements (deploying wallet, insufficient balance, strategy amount exceeds plan limit).
 * When balance is insufficient, enables as many bots as possible (sorted by amount).
 *
 * @param body.symbols - Optional: filter by market symbols array
 * @param body.intervals - Optional: filter by market intervals array
 * @param body.funder - Optional: filter by wallet address
 * @param body.strategyId - Optional: filter by strategy ID
 * @param body.ids - Optional: array of bot IDs to enable
 *
 * @returns enabledCount - Number of bots enabled immediately
 * @returns pendingCount - Number of bots waiting for wallet activation
 * @returns skippedCount - Number of bots skipped (insufficient balance, deploying wallet, or strategy amount exceeded)
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const body = await readBody(event)
  const { symbols, intervals, funder, strategyId, ids } = validateRequestData(body, 'POST', '/api/bots/batch-enable')

  // Build filter conditions
  const whereConditions: any = {
    wallet: {
      ownerId: user.id,
    },
    enabled: false,
  }

  // Filter by IDs if provided
  if (ids && ids.length > 0) {
    whereConditions.id = { in: ids }
  }

  // Filter by other fields if ids are not provided
  if (!ids || ids.length === 0) {
    if (symbols && symbols.length > 0) {
      whereConditions.symbol = { in: symbols }
    }
    if (intervals && intervals.length > 0) {
      whereConditions.interval = { in: intervals }
    }
    if (funder) {
      whereConditions.funder = funder
    }
    if (strategyId) {
      whereConditions.strategyId = strategyId
    }
  }

  // Find all disabled bots matching the criteria
  const disabledBots = await db.bot.findMany({
    where: whereConditions,
    select: {
      id: true,
      funder: true,
      strategyId: true,
      wallet: {
        select: {
          status: true,
        },
      },
      strategy: {
        select: {
          amount: true,
        },
      },
    },
  })

  if (disabledBots.length === 0) {
    return { enabledCount: 0, pendingCount: 0, skippedCount: 0 }
  }

  // Get user's subscription limits for strategy amount validation
  const limits = await getUserLimits(user.id)

  // Filter out bots whose strategy amount exceeds the plan limit
  let strategyAmountSkippedCount = 0
  const validBots = disabledBots.filter(bot => {
    // Skip if strategy amount exceeds plan limit (null means unlimited)
    if (limits.maxStrategyAmount !== null && Number(bot.strategy.amount) > limits.maxStrategyAmount) {
      strategyAmountSkippedCount++
      return false
    }
    return true
  })

  if (validBots.length === 0) {
    return { enabledCount: 0, pendingCount: 0, skippedCount: strategyAmountSkippedCount }
  }

  // Group bots by wallet address
  const botsByWallet = new Map<string, typeof validBots>()
  for (const bot of validBots) {
    const existingBots = botsByWallet.get(bot.funder) ?? []
    existingBots.push(bot)
    botsByWallet.set(bot.funder, existingBots)
  }

  // Categorize bots: ready to enable, need wallet activation, or skip
  const readyBotIds: string[] = []
  const walletsNeedActivation = new Map<string, string[]>() // wallet address -> bot ids
  let skippedBotCount = 0

  // First pass: filter by wallet status
  for (const [ walletAddress, bots ] of botsByWallet) {
    const walletStatus = bots[0]!.wallet.status

    // Skip bots with deploying wallet
    if (walletStatus === WalletStatus.DEPLOYING) {
      skippedBotCount += bots.length
      continue
    }

    // Categorize by wallet status
    if (walletStatus === WalletStatus.INACTIVE || walletStatus === WalletStatus.FAILED) {
      walletsNeedActivation.set(walletAddress, bots.map(b => b.id))
    } else {
      readyBotIds.push(...bots.map(b => b.id))
    }
  }

  // Track wallets that had no enabled bots before (for cache invalidation)
  let hasWalletBecomeActive = false
  let occupiedAmountByWallet: Map<string, number> | undefined

  // Production only: validate wallet balance
  if (process.env.APP_ENV === 'prod') {
    const { botBalanceMultiplier } = useRuntimeConfig(event).public

    // Get all wallet addresses that passed status check
    const validWalletAddresses = [
      ...Array.from(walletsNeedActivation.keys()),
      ...readyBotIds.map(botId => validBots.find(b => b.id === botId)!.funder),
    ].filter((addr, index, self) => self.indexOf(addr) === index) // deduplicate

    // Batch query wallet balances
    const walletBalances = await getUSDCBalancesBatchCached(validWalletAddresses)
    const balanceByAddress = new Map<string, bigint>()
    validWalletAddresses.forEach((address, index) => {
      balanceByAddress.set(address, walletBalances[index]!)
    })

    // Batch query all enabled bots for these wallets to calculate occupied amount
    const enabledBotsByWallet = await db.bot.findMany({
      where: {
        funder: { in: validWalletAddresses },
        enabled: true,
      },
      select: {
        funder: true,
        strategy: {
          select: {
            amount: true,
          },
        },
      },
    })

    // Group by wallet and calculate occupied amount
    occupiedAmountByWallet = new Map<string, number>()
    for (const walletAddress of validWalletAddresses) {
      const walletBots = enabledBotsByWallet.filter(b => b.funder === walletAddress)
      const totalOccupied = walletBots.reduce((sum, bot) => sum + Number(bot.strategy.amount), 0)
      occupiedAmountByWallet.set(walletAddress, totalOccupied)
    }

    // Validate balance for each wallet and select bots that can be enabled
    const validatedReadyBotIds: string[] = []
    const validatedWalletsNeedActivation = new Map<string, string[]>()

    for (const [ walletAddress, bots ] of botsByWallet) {
      if (bots[0]!.wallet.status === WalletStatus.DEPLOYING) continue

      const balance = balanceByAddress.get(walletAddress) ?? 0n
      const occupiedAmount = occupiedAmountByWallet.get(walletAddress) ?? 0

      // Sort bots by strategy amount (ascending) to maximize enabled bots
      const sortedBots = [ ...bots ].sort((a, b) => Number(a.strategy.amount) - Number(b.strategy.amount))

      // Try to enable as many bots as balance allows
      const enabledBotIds: string[] = []
      let cumulativeAmount = occupiedAmount

      for (const bot of sortedBots) {
        const requiredAmount = cumulativeAmount + Number(bot.strategy.amount)
        const requiredBalance = parseUnits(String(requiredAmount * botBalanceMultiplier), USDC_DECIMALS)

        if (balance >= requiredBalance) {
          enabledBotIds.push(bot.id)
          cumulativeAmount = requiredAmount
        } else {
          // Insufficient balance for this and remaining bots
          skippedBotCount++
        }
      }

      // Categorize enabled bots by wallet status
      if (enabledBotIds.length > 0) {
        const walletStatus = bots[0]!.wallet.status

        if (walletStatus === WalletStatus.INACTIVE || walletStatus === WalletStatus.FAILED) {
          validatedWalletsNeedActivation.set(walletAddress, enabledBotIds)
        } else {
          validatedReadyBotIds.push(...enabledBotIds)
        }
      }
    }

    // Update with validated results
    readyBotIds.length = 0
    readyBotIds.push(...validatedReadyBotIds)
    walletsNeedActivation.clear()
    for (const [ addr, ids ] of validatedWalletsNeedActivation) {
      walletsNeedActivation.set(addr, ids)
    }
  }

  const now = new Date()

  // Enable bots that are ready (wallet already active)
  if (readyBotIds.length > 0) {
    const botUpdates = readyBotIds.map(botId =>
      db.bot.update({
        where: { id: botId },
        data: {
          enabled: true,
          enabledAt: now,
        },
      }),
    )

    const operationHistories = readyBotIds.map(botId =>
      db.botOperationHistory.create({
        data: {
          botId,
          action: BotOperationType.ENABLED,
          reason: BotOperationReason.USER_ACTION,
        },
      }),
    )

    await db.$transaction([
      ...botUpdates,
      ...operationHistories,
    ])

    // Check if any wallet had no enabled bots before (need to invalidate wallets cache)
    if (occupiedAmountByWallet) {
      const affectedWallets = new Set(readyBotIds.map(botId => validBots.find(b => b.id === botId)!.funder))
      for (const walletAddress of affectedWallets) {
        if ((occupiedAmountByWallet.get(walletAddress) ?? 0) === 0) {
          hasWalletBecomeActive = true
          break
        }
      }
    }
  }

  // Trigger wallet activation for bots that need it
  // Note: triggerEnableTrading executes asynchronously in queue
  for (const [ walletAddress, botIds ] of walletsNeedActivation) {
    const wallet = await db.wallet.findUnique({
      where: { funder: walletAddress },
    })

    if (!wallet) continue

    // Queue async task - callback will be executed after wallet activation
    await triggerEnableTrading(wallet, async () => {
      const botUpdates = botIds.map(botId =>
        db.bot.update({
          where: { id: botId },
          data: {
            enabled: true,
            enabledAt: new Date(),
          },
        }),
      )

      const operationHistories = botIds.map(botId =>
        db.botOperationHistory.create({
          data: {
            botId,
            action: BotOperationType.ENABLED,
            reason: BotOperationReason.USER_ACTION,
          },
        }),
      )

      await db.$transaction([
        ...botUpdates,
        ...operationHistories,
      ])

      // Invalidate bots cache after enabling bots in callback
      const botsCache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })
      await botsCache.invalidateAll()

      console.debug(`${botIds.length} bot(s) enabled after wallet activation: ${walletAddress}`)
    })
  }

  // Invalidate caches
  const botsCache = createCache({ namespace: CACHE_NS.INTERNAL_BOTS })
  await botsCache.invalidateAll()

  if (hasWalletBecomeActive) {
    const walletsCache = createCache({ namespace: CACHE_NS.INTERNAL_WALLETS })
    await walletsCache.invalidateAll()
  }

  // Calculate pending bots count (waiting for wallet activation)
  const pendingCount = Array.from(walletsNeedActivation.values()).reduce((sum, ids) => sum + ids.length, 0)

  return {
    enabledCount: readyBotIds.length,
    pendingCount,
    skippedCount: skippedBotCount + strategyAmountSkippedCount,
  }
})

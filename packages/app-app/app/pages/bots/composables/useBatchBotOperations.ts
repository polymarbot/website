/**
 * Composable for batch bot operations (enable/disable/delete)
 * Provides reusable logic for batch operations with confirmation dialogs and result feedback
 */
export function useBatchBotOperations () {
  const request = useRequest()
  const toast = useToast()
  const dialog = useDialog()
  const T = useTranslations('pages.bots.components.BatchBotOperations')

  const isEnabling = ref(false)
  const isDisabling = ref(false)
  const isDeleting = ref(false)
  const isExecuting = computed(() => isEnabling.value || isDisabling.value || isDeleting.value)

  /**
   * Execute batch operation with confirmation dialog and result feedback
   * @param operation - 'enable', 'disable', or 'delete'
   * @param params - Filter parameters (ids, symbols, intervals, funder, strategyId)
   * @param onSuccess - Callback on successful operation
   */
  async function execute (
    operation: 'enable' | 'disable' | 'delete',
    params: {
      ids?: string[]
      symbols?: MarketSymbolType[]
      intervals?: MarketIntervalType[]
      funder?: string
      strategyId?: string
    },
    onSuccess?: () => void,
  ): Promise<void> {
    // Determine scope key based on params
    const modalKey = operation === 'enable' ? 'batchEnable' : operation === 'disable' ? 'batchDisable' : 'batchDelete'
    let scopeKey: 'scopeSelected' | 'scopeFiltered' | 'scopeAll'
    if (params.ids?.length) {
      scopeKey = 'scopeSelected'
    } else if (params.funder || params.strategyId || params.intervals?.length || params.symbols?.length) {
      scopeKey = 'scopeFiltered'
    } else {
      scopeKey = 'scopeAll'
    }

    const scope = scopeKey === 'scopeSelected'
      ? T(`modals.${modalKey}.${scopeKey}`, { count: params.ids!.length })
      : T(`modals.${modalKey}.${scopeKey}`)
    const message = T(`modals.${modalKey}.message`)

    const confirmed = await dialog.confirm({
      type: 'warn',
      header: T(`modals.${modalKey}.title`),
      message: `${scope}\n${message}`,
    })
    if (!confirmed) return

    // Set loading state
    switch (operation) {
      case 'enable':
        isEnabling.value = true
        break
      case 'disable':
        isDisabling.value = true
        break
      case 'delete':
        isDeleting.value = true
        break
    }

    // Get endpoint
    let endpoint: string
    switch (operation) {
      case 'enable':
        endpoint = '/api/bots/batch-enable'
        break
      case 'disable':
        endpoint = '/api/bots/batch-disable'
        break
      case 'delete':
        endpoint = '/api/bots/batch-delete'
        break
    }

    try {
      switch (operation) {
        case 'enable': {
          const result = await request.post<{
            enabledCount: number
            pendingCount: number
            skipped: {
              insufficientBalance: number
              walletStatus: number
              strategyLimit: number
            }
          }>(endpoint, params)

          const totalSkipped = result.skipped.insufficientBalance + result.skipped.walletStatus + result.skipped.strategyLimit

          // No bots matched
          if (result.enabledCount === 0 && result.pendingCount === 0 && totalSkipped === 0) {
            await dialog.alert({
              type: 'info',
              header: T('modals.batchEnable.title'),
              message: T('messages.noBotsToEnable'),
            })
          } else if (totalSkipped > 0 || result.pendingCount > 0) {
            // Build message dynamically, only include non-zero parts
            const parts: string[] = []
            if (result.enabledCount > 0) {
              parts.push(T('messages.resultEnabled', { count: result.enabledCount }))
            }
            if (result.pendingCount > 0) {
              // Use different message based on whether there are skipped bots
              parts.push(
                totalSkipped > 0
                  ? T('messages.resultPending', { count: result.pendingCount })
                  : T('messages.resultPendingAutoStart', { count: result.pendingCount }),
              )
            }
            if (result.skipped.insufficientBalance > 0) {
              parts.push(T('messages.skippedInsufficientBalance', { count: result.skipped.insufficientBalance }))
            }
            if (result.skipped.walletStatus > 0) {
              parts.push(T('messages.skippedWalletStatus', { count: result.skipped.walletStatus }))
            }
            if (result.skipped.strategyLimit > 0) {
              parts.push(T('messages.skippedStrategyLimit', { count: result.skipped.strategyLimit }))
            }
            await dialog.alert({
              type: 'info',
              header: T('modals.batchEnable.title'),
              message: parts.join('\n'),
            })
          } else {
            toast.success(T('messages.enableSuccess'))
          }
          break
        }
        case 'disable': {
          const result = await request.post<{ disabledCount: number }>(endpoint, params)

          if (result.disabledCount === 0) {
            await dialog.alert({
              type: 'info',
              header: T('modals.batchDisable.title'),
              message: T('messages.noBotsToDisable'),
            })
          } else {
            toast.success(T('messages.disableSuccess'))
          }
          break
        }
        case 'delete': {
          const result = await request.post<{
            deletedCount: number
            skippedCount: number
          }>(endpoint, params)

          // No bots matched
          if (result.deletedCount === 0 && result.skippedCount === 0) {
            await dialog.alert({
              type: 'info',
              header: T('modals.batchDelete.title'),
              message: T('messages.noBotsToDelete'),
            })
          } else if (result.skippedCount > 0) {
            // Build message dynamically, only include non-zero parts
            const parts: string[] = []
            if (result.deletedCount > 0) {
              parts.push(T('messages.resultDeleted', { count: result.deletedCount }))
            }
            if (result.skippedCount > 0) {
              parts.push(T('messages.resultDeleteSkipped', { count: result.skippedCount }))
            }
            await dialog.alert({
              type: 'info',
              header: T('modals.batchDelete.title'),
              message: parts.join('\n'),
            })
          } else {
            toast.success(T('messages.deleteSuccess'))
          }
          break
        }
      }

      request.invalidateCache('/api/bots')
      onSuccess?.()
    } catch (err) {
      console.error(`Failed to batch ${operation} bots:`, err)
    } finally {
      switch (operation) {
        case 'enable':
          isEnabling.value = false
          break
        case 'disable':
          isDisabling.value = false
          break
        case 'delete':
          isDeleting.value = false
          break
      }
    }
  }

  return {
    execute,
    isEnabling: readonly(isEnabling),
    isDisabling: readonly(isDisabling),
    isDeleting: readonly(isDeleting),
    isExecuting: readonly(isExecuting),
  }
}

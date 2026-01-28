/**
 * Composable for batch bot operations (enable/disable/delete)
 * Provides reusable logic for batch operations with confirmation dialogs and result feedback
 */
export function useBatchBotOperations () {
  const request = useRequest()
  const toast = useToast()
  const dialog = useDialog()
  const T = useTranslations('pages.app.bots.components.BatchBotOperations')

  const isEnabling = ref(false)
  const isDisabling = ref(false)
  const isDeleting = ref(false)
  const isExecuting = computed(() => isEnabling.value || isDisabling.value || isDeleting.value)

  /**
   * Execute batch operation with confirmation dialog and result feedback
   * @param operation - 'enable', 'disable', or 'delete'
   * @param params - Filter parameters (ids, symbols, intervals, funder, strategyId)
   * @param onSuccess - Callback on successful operation
   * @param skipConfirmation - Skip the confirmation dialog (for custom confirmations)
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
    skipConfirmation = false,
  ): Promise<void> {
    // Show confirmation dialog (unless skipped)
    if (!skipConfirmation) {
      let title: string
      let message: string

      switch (operation) {
        case 'enable':
          title = T('modals.batchEnable.title')
          message = T('modals.batchEnable.message')
          break
        case 'disable':
          title = T('modals.batchDisable.title')
          message = T('modals.batchDisable.message')
          break
        case 'delete':
          title = T('modals.batchDelete.title')
          message = T('modals.batchDelete.message')
          break
      }

      const confirmed = await dialog.confirm({
        type: 'warn',
        header: title,
        message: message,
      })
      if (!confirmed) return
    }

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
            skippedCount: number
          }>(endpoint, params)

          // No bots matched
          if (result.enabledCount === 0 && result.pendingCount === 0 && result.skippedCount === 0) {
            await dialog.alert({
              type: 'info',
              header: T('modals.batchEnable.title'),
              message: T('messages.noBotsToEnable'),
            })
          } else if (result.skippedCount > 0 || result.pendingCount > 0) {
            // Build message dynamically, only include non-zero parts
            const parts: string[] = []
            if (result.enabledCount > 0) {
              parts.push(T('messages.resultEnabled', { count: result.enabledCount }))
            }
            if (result.pendingCount > 0) {
              // Use different message based on whether there are skipped bots
              parts.push(
                result.skippedCount > 0
                  ? T('messages.resultPending', { count: result.pendingCount })
                  : T('messages.resultPendingAutoStart', { count: result.pendingCount }),
              )
            }
            if (result.skippedCount > 0) {
              parts.push(T('messages.resultEnableSkipped', { count: result.skippedCount }))
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

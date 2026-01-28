import type { ComputedRef } from 'vue'

export interface PaginationResult {
  limit: number
  offset: number
}

export interface PaginationOptions {
  limit?: number
  offset?: number
  total?: number
}

export interface UsePaginationReturn<T> {
  update: (newItems: T[], options?: PaginationOptions) => void
  reset: (newItems?: T[], options?: PaginationOptions) => void
  next: ComputedRef<PaginationResult | null>
  prev: ComputedRef<PaginationResult | null>
  limit: ComputedRef<number>
  offset: ComputedRef<number>
  total: ComputedRef<number>
  items: ComputedRef<T[]>
}

/**
 * Composable for managing pagination state and calculations with items management
 *
 * @param initialItems - Initial items array (default: [])
 * @param options - Pagination options
 * @param options.limit - Items per page (default: 10)
 * @param options.offset - Initial offset (auto-calculated if not provided: items.length - limit)
 * @param options.total - Total number of items (default: Infinity)
 * @returns Object with next, prev pagination results, items, and update method
 *
 * @example
 * const { next, prev, limit, offset, total, items, update } = usePagination([...initialItems], { limit: 20 })
 * update([...newItems], { total: 100 }) // Update pagination with new items and total
 * // items.value: [...updatedItems]
 */
export default function usePagination<T> (
  initialItems: T[] = [],
  options: PaginationOptions = {},
): UsePaginationReturn<T> {
  const { limit = 10, offset, total = Infinity } = options
  const initialOffset = offset !== undefined ? offset : initialItems.length - limit

  const currentLimit = ref(limit)
  const currentOffset = ref(initialOffset)
  const currentTotal = ref(total)
  const currentItems = ref<T[]>(initialItems) as Ref<T[]>

  /**
   * Calculate next pagination parameters
   */
  const next = computed<PaginationResult | null>(() => {
    const nextOffset = currentOffset.value + currentLimit.value
    if (nextOffset >= currentTotal.value) {
      return null
    }
    return {
      limit: currentLimit.value,
      offset: nextOffset,
    }
  })

  /**
   * Calculate previous pagination parameters
   */
  const prev = computed<PaginationResult | null>(() => {
    if (currentOffset.value <= 0) {
      return null
    }
    const prevOffset = Math.max(0, currentOffset.value - currentLimit.value)
    return {
      limit: currentLimit.value,
      offset: prevOffset,
    }
  })

  /**
   * Update pagination state with new items and options
   * @param newItems - New items to be appended or replaced
   * @param opts - Pagination options
   * @param opts.limit - Items per page
   * @param opts.offset - New offset (auto-calculated if not provided: items.length - limit)
   * @param opts.total - Total number of items available
   */
  const update = (newItems: T[], opts: PaginationOptions = {}) => {
    const newLimit = opts.limit ?? currentLimit.value

    // Calculate new offset
    const newOffset
      = opts.offset !== undefined
        ? opts.offset
        : currentItems.value.length + newItems.length - newLimit

    // Calculate new items array
    const updatedItems
      = currentItems.value.length <= newOffset
        ? currentItems.value.concat(newItems)
        : currentItems.value.slice(0, Math.max(0, newOffset)).concat(newItems)

    // If newItems length is less than limit, it means all items have been loaded
    // If total is not provided, set it to the current items length
    const newTotal
      = opts.total !== undefined
        ? opts.total
        : newItems.length < newLimit
          ? updatedItems.length
          : currentTotal.value

    // Update all states
    currentItems.value = updatedItems
    currentOffset.value = newOffset
    currentLimit.value = newLimit
    currentTotal.value = newTotal
  }

  /**
   * Reset pagination state to initial or new values
   * @param newItems - New items array (default: [])
   * @param opts - Pagination options
   * @param opts.limit - Items per page (default: current limit)
   * @param opts.offset - Initial offset (auto-calculated if not provided: items.length - limit)
   * @param opts.total - Total number of items (default: Infinity)
   */
  const reset = (newItems: T[] = [], opts: PaginationOptions = {}) => {
    const newLimit = opts.limit ?? currentLimit.value
    const newTotal = opts.total ?? Infinity
    const newOffset = opts.offset !== undefined ? opts.offset : newItems.length - newLimit

    currentItems.value = newItems
    currentLimit.value = newLimit
    currentOffset.value = newOffset
    currentTotal.value = newTotal
  }

  return {
    update,
    reset,
    next,
    prev,
    limit: computed(() => currentLimit.value),
    offset: computed(() => currentOffset.value),
    total: computed(() => currentTotal.value),
    items: computed(() => currentItems.value),
  }
}

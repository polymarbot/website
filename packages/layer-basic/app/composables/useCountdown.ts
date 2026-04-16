/**
 * Countdown timer composable
 *
 * Provides a simple countdown timer with start, stop, and reset functionality.
 * Automatically cleans up the interval on component unmount.
 */

export interface UseCountdownOptions {
  /** Countdown duration in seconds (default: 60) */
  duration?: number
  /** Callback when countdown finishes */
  onFinish?: () => void
}

export interface UseCountdownReturn {
  /** Current remaining seconds */
  remaining: Readonly<Ref<number>>
  /** Whether countdown is active */
  isActive: ComputedRef<boolean>
  /** Start the countdown */
  start: () => void
  /** Stop the countdown without resetting */
  stop: () => void
  /** Reset countdown to initial state */
  reset: () => void
}

export function useCountdown (options: UseCountdownOptions = {}): UseCountdownReturn {
  const { duration = 60, onFinish } = options

  const remaining = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  const isActive = computed(() => remaining.value > 0)

  function start () {
    // Clear existing timer if any
    stop()

    remaining.value = duration
    timer = setInterval(() => {
      remaining.value--
      if (remaining.value <= 0) {
        stop()
        onFinish?.()
      }
    }, 1000)
  }

  function stop () {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function reset () {
    stop()
    remaining.value = 0
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stop()
  })

  return {
    remaining: readonly(remaining),
    isActive,
    start,
    stop,
    reset,
  }
}

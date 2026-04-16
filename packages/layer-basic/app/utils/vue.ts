export function isInSetup () {
  return !!getCurrentInstance()
}

export function onLifecycleSwitch (mounted: () => void, beforeUnmount: () => void) {
  let destroyed = true
  onMounted(() => {
    if (!destroyed) return
    destroyed = false
    mounted()
  })
  onActivated(() => {
    if (!destroyed) return
    destroyed = false
    setTimeout(() => {
      if (destroyed) return
      mounted()
    }, 400) // wait for the transition to complete
  })
  onBeforeUnmount(() => {
    if (destroyed) return
    destroyed = true
    beforeUnmount()
  })
  onDeactivated(() => {
    if (destroyed) return
    destroyed = true
    beforeUnmount()
  })
}

export default async function (
  toggle: HTMLElement,
  callback: () => Promise<void> | void,
  options: {
    duration?: number
    reverse?: boolean
  } = {},
) {
  if (
    !toggle
    || !document.startViewTransition
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return callback()
  }

  try {
    const { duration = 500, reverse: isReverse } = options

    const { x, y, maxRadius } = getClipPathValues(toggle)

    const style = getStyle(!!isReverse, x, y, maxRadius, duration)
    document.head.append(style)

    const transition = document.startViewTransition(callback)
    transition.finished.finally(() => {
      style.remove()
    })

    await transition.finished
  } catch (err) {
    console.error(err)
  }
}

function getStyle (
  isReverse: boolean,
  x: number,
  y: number,
  maxRadius: number,
  duration: number,
) {
  const style = document.createElement('style')

  const animatingElement = isReverse
    ? '::view-transition-old(root)'
    : '::view-transition-new(root)'
  const from = isReverse
    ? `circle(${maxRadius}px at ${x}px ${y}px)`
    : `circle(0px at ${x}px ${y}px)`
  const to = isReverse
    ? `circle(0px at ${x}px ${y}px)`
    : `circle(${maxRadius}px at ${x}px ${y}px)`

  style.textContent = `
@keyframes view-transition-clip {
  from { clip-path: ${from}; }
  to { clip-path: ${to}; }
}

::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-old(root) {
  z-index: ${isReverse ? 1 : 0};
}

::view-transition-new(root) {
  z-index: ${isReverse ? 0 : 1};
}

${animatingElement} {
  animation: view-transition-clip ${duration}ms ease-in forwards;
}`
  return style
}

function getClipPathValues (toggle: HTMLElement) {
  const { top, left, width, height } = toggle.getBoundingClientRect()
  const x = left + width / 2
  const y = top + height / 2
  const right = window.innerWidth - left
  const bottom = window.innerHeight - top
  const maxRadius = Math.hypot(Math.max(left, right), Math.max(top, bottom))

  return { x, y, maxRadius }
}

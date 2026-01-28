<script setup lang="ts">
const canvasRef = ref<HTMLCanvasElement | null>(null)
const animationId = ref<number>(0)

interface Wave {
  amplitude: number
  frequency: number
  speed: number
  offset: number
}

const waves: Wave[] = [
  { amplitude: 50, frequency: 0.02, speed: 0.02, offset: 0 },
  { amplitude: 40, frequency: 0.025, speed: 0.025, offset: 2 },
  { amplitude: 30, frequency: 0.03, speed: 0.03, offset: 4 },
]

let time = 0
let ctx: CanvasRenderingContext2D | null = null
let dpr = 1

// Pre-computed color strings to avoid recreation every frame
const colors = {
  dark: {
    gradient: [ '#1f1f23', '#18181b', '#09090b' ] as const,
    waves: [
      'rgba(161,161,170,0.30)',
      'rgba(212,212,216,0.25)',
      'rgba(228,228,231,0.20)',
    ],
  },
  light: {
    gradient: [ '#fafafa', '#f4f4f5', '#e4e4e7' ] as const,
    waves: [
      'rgba(63,63,70,0.35)',
      'rgba(82,82,91,0.30)',
      'rgba(113,113,122,0.25)',
    ],
  },
}

function animate () {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return

  const width = canvas.width
  const height = canvas.height

  ctx.clearRect(0, 0, width, height)

  const isDark = document.documentElement.classList.contains('dark')
  const theme = isDark ? colors.dark : colors.light

  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, theme.gradient[0])
  gradient.addColorStop(0.5, theme.gradient[1])
  gradient.addColorStop(1, theme.gradient[2])

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // Draw waves
  for (let index = 0; index < waves.length; index++) {
    const wave = waves[index]!
    ctx.beginPath()

    const waveColor = theme.waves[index] ?? theme.waves[0]!

    // Start from bottom left
    ctx.moveTo(0, height)

    // Draw wave path
    for (let x = 0; x <= width / dpr; x += 5) {
      const y = height / dpr * 0.6
        + Math.sin(x * wave.frequency + time * wave.speed + wave.offset) * wave.amplitude
        + Math.sin(x * wave.frequency * 0.5 + time * wave.speed * 1.5) * wave.amplitude * 0.5
        + index * 40

      ctx.lineTo(x * dpr, y * dpr)
    }

    // Complete the shape
    ctx.lineTo(width, height)
    ctx.closePath()

    ctx.fillStyle = waveColor
    ctx.fill()
  }

  time += 1
  animationId.value = requestAnimationFrame(animate)
}

function handleResize () {
  const canvas = canvasRef.value
  if (!canvas) return

  const container = canvas.parentElement
  if (!container) return

  // Cache ctx and dpr
  ctx = canvas.getContext('2d')
  dpr = window.devicePixelRatio || 1

  const rect = container.getBoundingClientRect()

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`
}

onMounted(() => {
  handleResize()
  animate()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId.value)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="pointer-events-none absolute inset-0 size-full"
  />
</template>

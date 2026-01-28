<script setup lang="ts">
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const animationId = ref<number>(0)

let particles: Particle[] = []
let ctx: CanvasRenderingContext2D | null = null

const config = {
  particleCount: 60,
  particleRadius: 2,
  connectionDistance: 120,
  connectionDistanceSq: 120 * 120, // Squared for faster comparison
  speed: 0.3,
}

// Pre-computed color strings to avoid recreation every frame
const colors = {
  dark: {
    particle: 'rgba(161,161,170,0.6)',
    connection: '161,161,170',
    connectionAlpha: 0.2,
  },
  light: {
    particle: 'rgba(63,63,70,0.5)',
    connection: '63,63,70',
    connectionAlpha: 0.15,
  },
}

function createParticles (width: number, height: number) {
  const newParticles: Particle[] = []
  for (let i = 0; i < config.particleCount; i++) {
    newParticles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * config.speed,
      vy: (Math.random() - 0.5) * config.speed,
      radius: Math.random() * config.particleRadius + 1,
    })
  }
  return newParticles
}

function animate () {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return

  const width = canvas.width
  const height = canvas.height

  ctx.clearRect(0, 0, width, height)

  const isDark = document.documentElement.classList.contains('dark')
  const theme = isDark ? colors.dark : colors.light

  // Update and draw particles
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i]!

    // Update position
    particle.x += particle.vx
    particle.y += particle.vy

    // Bounce off edges
    if (particle.x < 0 || particle.x > width) particle.vx *= -1
    if (particle.y < 0 || particle.y > height) particle.vy *= -1

    // Keep in bounds
    particle.x = Math.max(0, Math.min(width, particle.x))
    particle.y = Math.max(0, Math.min(height, particle.y))

    // Draw particle
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
    ctx.fillStyle = theme.particle
    ctx.fill()

    // Draw connections (using squared distance for faster comparison)
    for (let j = i + 1; j < particles.length; j++) {
      const other = particles[j]!

      const dx = particle.x - other.x
      const dy = particle.y - other.y
      const distSq = dx * dx + dy * dy

      if (distSq < config.connectionDistanceSq) {
        const distance = Math.sqrt(distSq)
        const opacity = (1 - distance / config.connectionDistance) * theme.connectionAlpha
        ctx.beginPath()
        ctx.moveTo(particle.x, particle.y)
        ctx.lineTo(other.x, other.y)
        ctx.strokeStyle = `rgba(${theme.connection},${opacity})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
  }

  animationId.value = requestAnimationFrame(animate)
}

function handleResize () {
  const canvas = canvasRef.value
  if (!canvas) return

  const container = canvas.parentElement
  if (!container) return

  // Cache ctx
  ctx = canvas.getContext('2d')

  const dpr = window.devicePixelRatio || 1
  const rect = container.getBoundingClientRect()

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  if (ctx) {
    ctx.scale(dpr, dpr)
  }

  // Recreate particles for new size
  particles = createParticles(rect.width, rect.height)
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

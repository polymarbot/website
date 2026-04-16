<script setup lang="ts">
const canvasRef = ref<HTMLCanvasElement | null>(null)
const animationId = ref<number>(0)
const mousePos = ref({ x: -1000, y: -1000 })

interface Node {
  x: number
  y: number
  baseX: number
  baseY: number
  offsetX: number
  offsetY: number
  pulsePhase: number
  pulseSpeed: number
}

interface DataStream {
  startNode: number
  endNode: number
  progress: number
  speed: number
  active: boolean
}

let nodes: Node[] = []
let streams: DataStream[] = []
let ctx: CanvasRenderingContext2D | null = null
let dpr = 1

// Pre-computed constants
const TWO_PI = Math.PI * 2

const config = {
  gridSpacing: 80,
  nodeRadius: 3,
  connectionDistance: 120,
  connectionDistanceSq: 120 * 120, // Squared for faster comparison
  magneticRadius: 150,
  magneticRadiusSq: 150 * 150, // Squared for faster comparison
  magneticStrength: 40,
  returnSpeed: 0.08,
  streamCount: 8,
  neighborThreshold: 80 * 1.5, // gridSpacing * 1.5
  neighborThresholdSq: (80 * 1.5) ** 2,
}

// Pre-computed color strings to avoid recreation every frame
const colors = {
  dark: {
    primary: '161,161,170',
    secondary: '212,212,216',
    gridLine: 'rgba(161,161,170,0.08)',
    gradient: [ '#1f1f23', '#18181b', '#09090b' ] as const,
  },
  light: {
    primary: '63,63,70',
    secondary: '82,82,91',
    gridLine: 'rgba(63,63,70,0.06)',
    gradient: [ '#fafafa', '#f4f4f5', '#e4e4e7' ] as const,
  },
}

function initNodes (width: number, height: number, devicePixelRatio: number) {
  nodes = []

  // Calculate canvas center in logical pixels
  const centerX = width / devicePixelRatio / 2
  const centerY = height / devicePixelRatio / 2

  // Calculate how many nodes we need on each side of center
  const halfCols = Math.ceil(centerX / config.gridSpacing) + 1
  const halfRows = Math.ceil(centerY / config.gridSpacing) + 1

  // Generate grid centered on screen center
  for (let row = -halfRows; row <= halfRows; row++) {
    for (let col = -halfCols; col <= halfCols; col++) {
      const x = centerX + col * config.gridSpacing
      const y = centerY + row * config.gridSpacing
      nodes.push({
        x,
        y,
        baseX: x,
        baseY: y,
        offsetX: 0,
        offsetY: 0,
        pulsePhase: Math.random() * TWO_PI,
        pulseSpeed: 0.02 + Math.random() * 0.02,
      })
    }
  }

  // Initialize data streams
  streams = []
  for (let i = 0; i < config.streamCount; i++) {
    createNewStream()
  }
}

function createNewStream () {
  if (nodes.length === 0) return

  const startNodeIdx = Math.floor(Math.random() * nodes.length)
  const startNodeData = nodes[startNodeIdx]
  if (!startNodeData) return

  let endNodeIdx = startNodeIdx

  // Find a nearby node (using squared distance)
  const neighbors: number[] = []
  for (let idx = 0; idx < nodes.length; idx++) {
    if (idx !== startNodeIdx) {
      const node = nodes[idx]!
      const dx = node.baseX - startNodeData.baseX
      const dy = node.baseY - startNodeData.baseY
      const distSq = dx * dx + dy * dy
      if (distSq <= config.neighborThresholdSq) {
        neighbors.push(idx)
      }
    }
  }

  if (neighbors.length > 0) {
    endNodeIdx = neighbors[Math.floor(Math.random() * neighbors.length)] ?? startNodeIdx
  }

  streams.push({
    startNode: startNodeIdx,
    endNode: endNodeIdx,
    progress: 0,
    speed: 0.01 + Math.random() * 0.02,
    active: true,
  })
}

function animate () {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return

  const width = canvas.width
  const height = canvas.height

  ctx.clearRect(0, 0, width, height)

  const isDark = document.documentElement.classList.contains('dark')
  const theme = isDark ? colors.dark : colors.light
  const baseAlpha = isDark ? 0.4 : 0.3
  const connectionAlpha = isDark ? 0.15 : 0.1

  // Draw background gradient
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) / 1.5,
  )
  gradient.addColorStop(0, theme.gradient[0])
  gradient.addColorStop(0.5, theme.gradient[1])
  gradient.addColorStop(1, theme.gradient[2])

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // Draw grid lines first (subtle) - centered on screen
  ctx.strokeStyle = theme.gridLine
  ctx.lineWidth = 1

  const centerX = width / dpr / 2
  const centerY = height / dpr / 2

  // Vertical lines (centered)
  const startColOffset = centerX % config.gridSpacing
  for (let x = startColOffset; x <= width / dpr; x += config.gridSpacing) {
    ctx.beginPath()
    ctx.moveTo(x * dpr, 0)
    ctx.lineTo(x * dpr, height)
    ctx.stroke()
  }

  // Horizontal lines (centered)
  const startRowOffset = centerY % config.gridSpacing
  for (let y = startRowOffset; y <= height / dpr; y += config.gridSpacing) {
    ctx.beginPath()
    ctx.moveTo(0, y * dpr)
    ctx.lineTo(width, y * dpr)
    ctx.stroke()
  }

  // Update node positions with magnetic repulsion effect
  const mouseX = mousePos.value.x
  const mouseY = mousePos.value.y

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!
    node.pulsePhase += node.pulseSpeed

    // Calculate distance from mouse to node base position (squared for comparison)
    const dx = mouseX - node.baseX
    const dy = mouseY - node.baseY
    const distSq = dx * dx + dy * dy

    // Calculate target offset based on magnetic repulsion
    let targetOffsetX = 0
    let targetOffsetY = 0

    if (distSq < config.magneticRadiusSq && distSq > 0) {
      const dist = Math.sqrt(distSq)
      // Repulsion strength decreases with distance (inverse square-ish)
      const force = (1 - dist / config.magneticRadius) ** 2 * config.magneticStrength
      // Push away from mouse (opposite direction)
      targetOffsetX = (-dx / dist) * force
      targetOffsetY = (-dy / dist) * force
    }

    // Smoothly interpolate current offset towards target (easing)
    node.offsetX += (targetOffsetX - node.offsetX) * config.returnSpeed
    node.offsetY += (targetOffsetY - node.offsetY) * config.returnSpeed

    // Apply subtle floating animation + magnetic offset
    node.x = node.baseX + Math.sin(node.pulsePhase) * 2 + node.offsetX
    node.y = node.baseY + Math.cos(node.pulsePhase * 0.7) * 2 + node.offsetY
  }

  // Draw connections between nearby nodes (using squared distance)
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!
    for (let j = i + 1; j < nodes.length; j++) {
      const other = nodes[j]!

      const dx = node.x - other.x
      const dy = node.y - other.y
      const distSq = dx * dx + dy * dy

      if (distSq < config.connectionDistanceSq) {
        const dist = Math.sqrt(distSq)
        const alpha = (1 - dist / config.connectionDistance) * connectionAlpha
        ctx.beginPath()
        ctx.moveTo(node.x * dpr, node.y * dpr)
        ctx.lineTo(other.x * dpr, other.y * dpr)
        ctx.strokeStyle = `rgba(${theme.primary},${alpha})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
  }

  // Draw and update data streams
  for (let idx = 0; idx < streams.length; idx++) {
    const stream = streams[idx]!
    if (!stream.active) continue

    stream.progress += stream.speed

    if (stream.progress >= 1) {
      // Reset stream
      const newStartNode = stream.endNode
      stream.startNode = newStartNode
      stream.endNode = -1
      stream.progress = 0
      stream.speed = 0.01 + Math.random() * 0.02

      // Find new end node
      const startNodeData = nodes[newStartNode]
      if (!startNodeData) continue

      const neighbors: number[] = []
      for (let nodeIdx = 0; nodeIdx < nodes.length; nodeIdx++) {
        if (nodeIdx !== newStartNode) {
          const node = nodes[nodeIdx]!
          const dx = node.baseX - startNodeData.baseX
          const dy = node.baseY - startNodeData.baseY
          const distSq = dx * dx + dy * dy
          if (distSq <= config.neighborThresholdSq) {
            neighbors.push(nodeIdx)
          }
        }
      }

      stream.endNode = neighbors.length > 0
        ? (neighbors[Math.floor(Math.random() * neighbors.length)] ?? Math.floor(Math.random() * nodes.length))
        : Math.floor(Math.random() * nodes.length)

      continue
    }

    const startNode = nodes[stream.startNode]
    const endNode = nodes[stream.endNode]

    if (!startNode || !endNode) continue

    const x = startNode.x + (endNode.x - startNode.x) * stream.progress
    const y = startNode.y + (endNode.y - startNode.y) * stream.progress

    // Draw stream particle with glow
    const glowRadius = 15
    const particleGradient = ctx.createRadialGradient(
      x * dpr, y * dpr, 0,
      x * dpr, y * dpr, glowRadius * dpr,
    )
    particleGradient.addColorStop(0, `rgba(${theme.secondary},0.8)`)
    particleGradient.addColorStop(0.5, `rgba(${theme.secondary},0.3)`)
    particleGradient.addColorStop(1, `rgba(${theme.secondary},0)`)

    ctx.beginPath()
    ctx.arc(x * dpr, y * dpr, glowRadius * dpr, 0, TWO_PI)
    ctx.fillStyle = particleGradient
    ctx.fill()

    // Draw particle core
    ctx.beginPath()
    ctx.arc(x * dpr, y * dpr, 3 * dpr, 0, TWO_PI)
    ctx.fillStyle = `rgba(${theme.secondary},1)`
    ctx.fill()

    // Draw trail
    const trailLength = 0.2
    const trailStart = Math.max(0, stream.progress - trailLength)
    const trailX = startNode.x + (endNode.x - startNode.x) * trailStart
    const trailY = startNode.y + (endNode.y - startNode.y) * trailStart

    const trailGradient = ctx.createLinearGradient(
      trailX * dpr, trailY * dpr,
      x * dpr, y * dpr,
    )
    trailGradient.addColorStop(0, `rgba(${theme.secondary},0)`)
    trailGradient.addColorStop(1, `rgba(${theme.secondary},0.6)`)

    ctx.beginPath()
    ctx.moveTo(trailX * dpr, trailY * dpr)
    ctx.lineTo(x * dpr, y * dpr)
    ctx.strokeStyle = trailGradient
    ctx.lineWidth = 2 * dpr
    ctx.stroke()
  }

  // Draw nodes
  const radius = config.nodeRadius
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!

    // Increase brightness when node is displaced (being repelled)
    const displacement = Math.sqrt(node.offsetX ** 2 + node.offsetY ** 2)
    const activeBoost = Math.min(displacement / config.magneticStrength, 1) * 0.3
    const alpha = baseAlpha + activeBoost

    // Draw node glow
    const nodeGradient = ctx.createRadialGradient(
      node.x * dpr, node.y * dpr, 0,
      node.x * dpr, node.y * dpr, radius * 3 * dpr,
    )
    nodeGradient.addColorStop(0, `rgba(${theme.primary},${alpha})`)
    nodeGradient.addColorStop(1, `rgba(${theme.primary},0)`)

    ctx.beginPath()
    ctx.arc(node.x * dpr, node.y * dpr, radius * 3 * dpr, 0, TWO_PI)
    ctx.fillStyle = nodeGradient
    ctx.fill()

    // Draw node core
    ctx.beginPath()
    ctx.arc(node.x * dpr, node.y * dpr, radius * dpr, 0, TWO_PI)
    ctx.fillStyle = `rgba(${theme.primary},${alpha + 0.2})`
    ctx.fill()
  }

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

  initNodes(rect.width * dpr, rect.height * dpr, dpr)
}

function handleMouseMove (e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  mousePos.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function handleMouseLeave () {
  mousePos.value = { x: -1000, y: -1000 }
}

onMounted(() => {
  handleResize()
  animate()
  window.addEventListener('resize', handleResize)

  const canvas = canvasRef.value
  if (canvas) {
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)
  }
})

onUnmounted(() => {
  cancelAnimationFrame(animationId.value)
  window.removeEventListener('resize', handleResize)

  const canvas = canvasRef.value
  if (canvas) {
    canvas.removeEventListener('mousemove', handleMouseMove)
    canvas.removeEventListener('mouseleave', handleMouseLeave)
  }
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute inset-0 size-full"
  />
</template>

import { useEffect, useRef, useState } from 'react'
import {
  ASCII_TRAIL_CHARACTERS,
  getTrailBounds,
  getTrailGlyph,
  getTrailIntensity,
  hasTrailMoved,
  isTrailPointerType,
  type TrailPoint,
} from './trailMath'

const CELL_SIZE = 12
const INFLUENCE_RADIUS = 120
const MAX_POINTS = 24
const MAX_ALPHA = 0.42

type MutableTrailPoint = {
  x: number
  y: number
  life: number
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

export function AsciiFlowTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const smoothRef = useRef<{ x: number; y: number } | null>(null)
  const pointsRef = useRef<MutableTrailPoint[]>([])
  const [visible, setVisible] = useState(true)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    )
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || reducedMotion || !visible) return

    const context = canvas.getContext('2d')
    if (!context) return
    const drawingContext = context

    let frame = 0
    let width = 0
    let height = 0
    let running = false
    let previousTime = 0
    let lastSample: { x: number; y: number } | null = null

    function requestDraw(continuous = false) {
      if (running) return
      if (!continuous) previousTime = 0
      running = true
      frame = window.requestAnimationFrame(draw)
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = bounds.width
      height = bounds.height
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0)
      requestDraw()
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!isTrailPointerType(event.pointerType)) return

      const bounds = canvas.getBoundingClientRect()
      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top
      pointerRef.current = x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height
        ? { x, y }
        : null
      if (!pointerRef.current) {
        smoothRef.current = null
        lastSample = null
      }
      requestDraw()
    }

    const resetPointer = () => {
      pointerRef.current = null
      smoothRef.current = null
      lastSample = null
      requestDraw()
    }

    const handlePointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) resetPointer()
    }

    function draw(timestamp: number) {
      running = false
      const deltaSeconds = previousTime === 0
        ? 1 / 60
        : Math.min((timestamp - previousTime) / 1000, 0.1)
      previousTime = timestamp
      drawingContext.clearRect(0, 0, width, height)

      const pointer = pointerRef.current
      if (pointer) {
        const smooth = smoothRef.current ?? { ...pointer }
        const smoothing = 1 - Math.exp(-12 * deltaSeconds)
        smooth.x += (pointer.x - smooth.x) * smoothing
        smooth.y += (pointer.y - smooth.y) * smoothing
        smoothRef.current = smooth
        if (!lastSample || hasTrailMoved(lastSample, smooth, CELL_SIZE * 0.35)) {
          pointsRef.current.push({ x: smooth.x, y: smooth.y, life: 1 })
          lastSample = { ...smooth }
        }
      }

      pointsRef.current = pointsRef.current
        .slice(-MAX_POINTS)
        .map((point) => ({ ...point, life: point.life - deltaSeconds * 1.35 }))
        .filter((point) => point.life > 0)

      drawingContext.font = `${CELL_SIZE}px monospace`
      drawingContext.textAlign = 'center'
      drawingContext.textBaseline = 'middle'

      const points: readonly TrailPoint[] = pointsRef.current
      const bounds = getTrailBounds(points, INFLUENCE_RADIUS, width, height)
      if (bounds) {
        const startX = Math.floor(bounds.left / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2
        const startY = Math.floor(bounds.top / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2
        for (let y = startY; y <= bounds.bottom; y += CELL_SIZE) {
          for (let x = startX; x <= bounds.right; x += CELL_SIZE) {
            const intensity = getTrailIntensity(x, y, points, INFLUENCE_RADIUS)
            const glyph = getTrailGlyph(intensity)
            if (!glyph) continue
            drawingContext.fillStyle = `rgb(255 255 255 / ${intensity * MAX_ALPHA})`
            drawingContext.fillText(glyph, x, y)
          }
        }
      }

      const smooth = smoothRef.current
      const moving = Boolean(pointer && smooth && hasTrailMoved(smooth, pointer, 0.5))
      if (pointsRef.current.length > 0 || moving) requestDraw(true)
    }

    const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerout', handlePointerOut)
    window.addEventListener('blur', resetPointer)
    window.addEventListener('scroll', resetPointer, { passive: true })
    resizeObserver?.observe(canvas)
    resize()

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerout', handlePointerOut)
      window.removeEventListener('blur', resetPointer)
      window.removeEventListener('scroll', resetPointer)
      resizeObserver?.disconnect()
      pointerRef.current = null
      smoothRef.current = null
      pointsRef.current = []
    }
  }, [reducedMotion, visible])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-background="transparent"
      data-characters={ASCII_TRAIL_CHARACTERS}
      className="ascii-flow-trail pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}

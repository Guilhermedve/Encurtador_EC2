import { useEffect, useRef, useState } from 'react'
import {
  ASCII_TRAIL_CHARACTERS,
  getTrailGlyph,
  getTrailIntensity,
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

    let frame = 0
    let width = 0
    let height = 0

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = bounds.width
      height = bounds.height
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      const x = event.clientX - bounds.left
      const y = event.clientY - bounds.top
      pointerRef.current = x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height
        ? { x, y }
        : null
    }

    const draw = () => {
      context.clearRect(0, 0, width, height)

      const pointer = pointerRef.current
      if (pointer) {
        const smooth = smoothRef.current ?? { ...pointer }
        smooth.x += (pointer.x - smooth.x) * 0.18
        smooth.y += (pointer.y - smooth.y) * 0.18
        smoothRef.current = smooth
        pointsRef.current.push({ x: smooth.x, y: smooth.y, life: 1 })
      }

      pointsRef.current = pointsRef.current
        .slice(-MAX_POINTS)
        .map((point) => ({ ...point, life: point.life - 0.045 }))
        .filter((point) => point.life > 0)

      context.font = `${CELL_SIZE}px monospace`
      context.textAlign = 'center'
      context.textBaseline = 'middle'

      const points: readonly TrailPoint[] = pointsRef.current
      for (let y = CELL_SIZE / 2; y < height; y += CELL_SIZE) {
        for (let x = CELL_SIZE / 2; x < width; x += CELL_SIZE) {
          const intensity = getTrailIntensity(x, y, points, INFLUENCE_RADIUS)
          const glyph = getTrailGlyph(intensity)
          if (!glyph) continue
          context.fillStyle = `rgb(255 255 255 / ${intensity * MAX_ALPHA})`
          context.fillText(glyph, x, y)
        }
      }

      frame = window.requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    frame = window.requestAnimationFrame(draw)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
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

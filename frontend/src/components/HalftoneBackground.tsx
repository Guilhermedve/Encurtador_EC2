import { useEffect, useRef } from 'react'
import p5 from 'p5'

const GAP = 28
const MIN_R = 2
const MAX_R = 16
const DEFAULT_R = 8
const INFLUENCE = 220

export function HalftoneBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouse = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }
    }
    const handleMouseLeave = () => {
      mouse.current = null
    }
    if (!reducedMotion) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseleave', handleMouseLeave)
    }

    const sketch = (p: p5) => {
      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight)
        canvas.parent(container)
        p.frameRate(30)
        p.noStroke()
        if (reducedMotion) {
          p.noLoop()
        }
      }

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight)
        if (reducedMotion) p.redraw()
      }

      p.draw = () => {
        p.background(0)
        p.fill(255)

        const mx = mouse.current?.x ?? null
        const my = mouse.current?.y ?? null

        for (let x = GAP / 2; x < p.width; x += GAP) {
          for (let y = GAP / 2; y < p.height; y += GAP) {
            let r = DEFAULT_R
            if (mx !== null && my !== null) {
              const d = Math.hypot(x - mx, y - my)
              if (d < INFLUENCE) {
                const t = 1 - d / INFLUENCE
                r = MIN_R + (MAX_R - MIN_R) * Math.pow(t, 0.85)
              } else {
                r = MIN_R
              }
            }
            p.circle(x, y, r * 2)
          }
        }
      }
    }

    const instance = new p5(sketch)

    return () => {
      if (!reducedMotion) {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseleave', handleMouseLeave)
      }
      instance.remove()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 -z-0 pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}

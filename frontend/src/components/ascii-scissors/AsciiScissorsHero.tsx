import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { ScissorsFallback } from './ScissorsFallback'
import { ScissorsScene } from './ScissorsScene'

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

export function AsciiScissorsHero() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const compact = useMediaQuery('(max-width: 767px)')

  useEffect(() => {
    const element = wrapperRef.current
    if (!element) return
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const animate = visible && !reducedMotion

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="ascii-scissors-hero pointer-events-none relative h-[38svh] min-h-[280px] w-full overflow-hidden md:h-[min(70vh,720px)]"
    >
      <Canvas
        fallback={<ScissorsFallback />}
        frameloop={animate ? 'always' : 'demand'}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6.5], fov: 42, near: 0.1, far: 30 }}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      >
        <ScissorsScene animate={animate} resolution={compact ? 0.12 : 0.16} />
      </Canvas>
    </div>
  )
}

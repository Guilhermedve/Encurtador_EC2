import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ScissorsFallback } from './ScissorsFallback'
import { ScissorsScene } from './ScissorsScene'
import { canPlayCut } from './cutAnimation'

type AsciiScissorsHeroProps = {
  cutRequestId: number
  cutting: boolean
  onCutComplete: (requestId: number) => void
}

function supportsWebGL2(): boolean {
  if (typeof document === 'undefined') return false

  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
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

export function AsciiScissorsHero({
  cutRequestId,
  cutting,
  onCutComplete,
}: AsciiScissorsHeroProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [webglAvailable, setWebglAvailable] = useState(supportsWebGL2)
  const [rendererCanvas, setRendererCanvas] =
    useState<HTMLCanvasElement | null>(null)
  const lastHandledRequestRef = useRef(0)
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
  const cutAllowed = canPlayCut({
    visible,
    reducedMotion,
    webglAvailable,
  })

  const handleSceneCutComplete = useCallback(
    (requestId: number) => {
      lastHandledRequestRef.current = Math.max(
        lastHandledRequestRef.current,
        requestId,
      )
      onCutComplete(requestId)
    },
    [onCutComplete],
  )

  useEffect(() => {
    if (!cutting || cutRequestId <= 0 || cutAllowed) return
    if (cutRequestId <= lastHandledRequestRef.current) return

    lastHandledRequestRef.current = cutRequestId
    onCutComplete(cutRequestId)
  }, [cutAllowed, cutRequestId, cutting, onCutComplete])

  const activeSceneRequestId =
    cutting &&
    cutAllowed &&
    cutRequestId > lastHandledRequestRef.current
      ? cutRequestId
      : null

  useEffect(() => {
    if (!rendererCanvas) return

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      setWebglAvailable(false)
    }

    rendererCanvas.addEventListener('webglcontextlost', handleContextLost)

    return () => {
      rendererCanvas.removeEventListener('webglcontextlost', handleContextLost)
    }
  }, [rendererCanvas])

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="ascii-scissors-hero pointer-events-none relative h-[38svh] min-h-[280px] w-full overflow-hidden md:h-[min(70vh,720px)]"
    >
      {webglAvailable ? (
        <Canvas
          fallback={<ScissorsFallback />}
          frameloop={animate ? 'always' : 'demand'}
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 6.3], fov: 42, near: 0.1, far: 30 }}
          gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => setRendererCanvas(gl.domElement)}
        >
          <ScissorsScene
            animate={visible && !reducedMotion}
            resolution={compact ? 0.12 : 0.16}
            cutRequestId={activeSceneRequestId}
            onCutComplete={handleSceneCutComplete}
          />
        </Canvas>
      ) : (
        <ScissorsFallback />
      )}
    </div>
  )
}

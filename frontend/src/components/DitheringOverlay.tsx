export function DitheringOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{ opacity: 0.06, mixBlendMode: 'overlay' as const }}
    >
      <svg
        width="100%"
        height="100%"
        style={{ width: '100vw', height: '100vh' }}
      >
        <filter id="dither">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves={3}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#dither)" />
      </svg>
    </div>
  )
}

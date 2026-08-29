export const ASCII_TRAIL_CHARACTERS = ' .:-=+*#%@'

export type TrailPoint = Readonly<{
  x: number
  y: number
  life: number
}>

type TrailPosition = Readonly<{
  x: number
  y: number
}>

export type TrailBounds = Readonly<{
  left: number
  top: number
  right: number
  bottom: number
}>

export function isTrailPointerType(pointerType: string): boolean {
  return pointerType !== 'touch'
}

export function hasTrailMoved(
  previous: TrailPosition,
  next: TrailPosition,
  minimumDistance: number,
): boolean {
  return Math.hypot(next.x - previous.x, next.y - previous.y) > minimumDistance
}

export function getTrailBounds(
  points: readonly TrailPoint[],
  radius: number,
  width: number,
  height: number,
): TrailBounds | null {
  if (points.length === 0) return null

  let left = width
  let top = height
  let right = 0
  let bottom = 0

  for (const point of points) {
    left = Math.min(left, point.x - radius)
    top = Math.min(top, point.y - radius)
    right = Math.max(right, point.x + radius)
    bottom = Math.max(bottom, point.y + radius)
  }

  return {
    left: Math.max(0, left),
    top: Math.max(0, top),
    right: Math.min(width, right),
    bottom: Math.min(height, bottom),
  }
}

export function getTrailIntensity(
  x: number,
  y: number,
  points: readonly TrailPoint[],
  radius: number,
): number {
  if (radius <= 0) return 0

  let intensity = 0
  for (const point of points) {
    const distance = Math.hypot(x - point.x, y - point.y)
    if (distance >= radius) continue

    const value = (1 - distance / radius) * point.life
    intensity = 1 - (1 - intensity) * (1 - value)
  }

  return Math.max(0, Math.min(1, intensity))
}

export function getTrailGlyph(intensity: number): string {
  if (intensity <= 0.01) return ''
  const normalized = Math.max(0, Math.min(1, intensity))
  const index = Math.floor(normalized * (ASCII_TRAIL_CHARACTERS.length - 1))
  return ASCII_TRAIL_CHARACTERS[index]
}

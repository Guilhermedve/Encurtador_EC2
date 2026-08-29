export const ASCII_TRAIL_CHARACTERS = ' .:-=+*#%@'

export type TrailPoint = Readonly<{
  x: number
  y: number
  life: number
}>

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

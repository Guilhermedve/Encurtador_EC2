export const CUT_TIMING = {
  closeMs: 420,
  holdMs: 180,
  openMs: 520,
  totalMs: 1120,
  watchdogMs: 1370,
} as const

export const OPEN_BLADE_ANGLE = 0.3
export const CLOSED_BLADE_ANGLE = 0.02

export type CutAnimationPhase = 'closing' | 'holding' | 'opening' | 'complete'

export type CutAnimationFrame = {
  phase: CutAnimationPhase
  bladeAngle: number
  alignment: number
}

export type CutCapability = {
  visible: boolean
  reducedMotion: boolean
  webglAvailable: boolean
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const lerp = (start: number, end: number, amount: number) =>
  start + (end - start) * amount
const easeInCubic = (value: number) => value ** 3
const easeInOutCubic = (value: number) =>
  value < 0.5
    ? 4 * value ** 3
    : 1 - ((-2 * value + 2) ** 3) / 2

export function normalizeRadians(value: number): number {
  return Math.atan2(Math.sin(value), Math.cos(value))
}

export function canPlayCut({
  visible,
  reducedMotion,
  webglAvailable,
}: CutCapability): boolean {
  return visible && !reducedMotion && webglAvailable
}

export function getCutAnimationFrame(elapsedMs: number): CutAnimationFrame {
  const elapsed = Math.max(0, elapsedMs)

  if (elapsed < CUT_TIMING.closeMs) {
    const progress = clamp01(elapsed / CUT_TIMING.closeMs)
    return {
      phase: 'closing',
      bladeAngle: lerp(
        OPEN_BLADE_ANGLE,
        CLOSED_BLADE_ANGLE,
        easeInCubic(progress),
      ),
      alignment: easeInOutCubic(progress),
    }
  }

  const openStart = CUT_TIMING.closeMs + CUT_TIMING.holdMs

  if (elapsed < openStart) {
    return {
      phase: 'holding',
      bladeAngle: CLOSED_BLADE_ANGLE,
      alignment: 1,
    }
  }

  if (elapsed < CUT_TIMING.totalMs) {
    const progress = clamp01((elapsed - openStart) / CUT_TIMING.openMs)
    return {
      phase: 'opening',
      bladeAngle: lerp(
        CLOSED_BLADE_ANGLE,
        OPEN_BLADE_ANGLE,
        easeInOutCubic(progress),
      ),
      alignment: 1,
    }
  }

  return {
    phase: 'complete',
    bladeAngle: OPEN_BLADE_ANGLE,
    alignment: 1,
  }
}

import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import * as THREE from 'three'
import {
  BLADE_EXTRUDE_SETTINGS,
  createAsciiFieldPositions,
  createBladeShape,
} from '../src/components/ascii-scissors/scissorsGeometry'
import { ScissorsFallback } from '../src/components/ascii-scissors/ScissorsFallback'
import {
  CLOSED_BLADE_ANGLE,
  CUT_TIMING,
  OPEN_BLADE_ANGLE,
  canPlayCut,
  getCutAnimationFrame,
  getCutAnimationFrameInto,
  normalizeRadians,
} from '../src/components/ascii-scissors/cutAnimation'

describe('ASCII scissors geometry', () => {
  test('creates a tapered volumetric blade extending from the pivot', () => {
    const geometry = new THREE.ExtrudeGeometry(createBladeShape(), BLADE_EXTRUDE_SETTINGS)
    geometry.computeBoundingBox()

    expect(geometry.boundingBox).not.toBeNull()
    expect(geometry.boundingBox!.min.x).toBeLessThanOrEqual(0)
    expect(geometry.boundingBox!.max.x).toBeGreaterThan(2.5)
    expect(geometry.boundingBox!.max.y - geometry.boundingBox!.min.y).toBeGreaterThan(0.2)
    expect(geometry.boundingBox!.max.z - geometry.boundingBox!.min.z).toBeGreaterThan(0.1)

    geometry.dispose()
  })

  test('creates deterministic sparse field positions', () => {
    const first = createAsciiFieldPositions(72, 0xec2)
    const second = createAsciiFieldPositions(72, 0xec2)

    expect(first).toHaveLength(216)
    expect(Array.from(first)).toEqual(Array.from(second))
    expect(new Set(Array.from(first)).size).toBeGreaterThan(1)
  })

  test('renders a decorative static fallback', () => {
    const markup = renderToStaticMarkup(<ScissorsFallback />)

    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('pointer-events-none')
    expect(markup).toContain('scissors-fallback')
    expect(markup).toContain('X')
  })
})

describe('ASCII scissors cut animation', () => {
  test('uses the approved 420/180/520 millisecond sequence', () => {
    expect(CUT_TIMING).toEqual({
      closeMs: 420,
      holdMs: 180,
      openMs: 520,
      totalMs: 1120,
      watchdogMs: 1370,
    })

    expect(getCutAnimationFrame(0)).toEqual({
      phase: 'closing',
      bladeAngle: OPEN_BLADE_ANGLE,
      alignment: 0,
    })
    expect(getCutAnimationFrame(420)).toEqual({
      phase: 'holding',
      bladeAngle: CLOSED_BLADE_ANGLE,
      alignment: 1,
    })
    expect(getCutAnimationFrame(600)).toEqual({
      phase: 'opening',
      bladeAngle: CLOSED_BLADE_ANGLE,
      alignment: 1,
    })
    expect(getCutAnimationFrame(1120)).toEqual({
      phase: 'complete',
      bladeAngle: OPEN_BLADE_ANGLE,
      alignment: 1,
    })
  })

  test('keeps blade angles bounded and closes without overshoot', () => {
    const samples = Array.from({ length: 113 }, (_, index) =>
      getCutAnimationFrame(index * 10),
    )

    for (const frame of samples) {
      expect(frame.bladeAngle).toBeGreaterThanOrEqual(CLOSED_BLADE_ANGLE)
      expect(frame.bladeAngle).toBeLessThanOrEqual(OPEN_BLADE_ANGLE)
      expect(frame.alignment).toBeGreaterThanOrEqual(0)
      expect(frame.alignment).toBeLessThanOrEqual(1)
    }

    expect(getCutAnimationFrame(210).bladeAngle).toBeGreaterThan(
      (OPEN_BLADE_ANGLE + CLOSED_BLADE_ANGLE) / 2,
    )
  })

  test('normalizes long-running ambient rotation before frontal alignment', () => {
    expect(normalizeRadians(Math.PI * 4 + 0.25)).toBeCloseTo(0.25)
    expect(normalizeRadians(-Math.PI * 4 - 0.25)).toBeCloseTo(-0.25)
  })

  test('plays only when motion, visibility, and WebGL permit it', () => {
    expect(canPlayCut({ visible: true, reducedMotion: false, webglAvailable: true })).toBe(true)
    expect(canPlayCut({ visible: false, reducedMotion: false, webglAvailable: true })).toBe(false)
    expect(canPlayCut({ visible: true, reducedMotion: true, webglAvailable: true })).toBe(false)
    expect(canPlayCut({ visible: true, reducedMotion: false, webglAvailable: false })).toBe(false)
  })

  test('writes frames into a reusable object', () => {
    const frame = getCutAnimationFrameInto(0)

    expect(getCutAnimationFrameInto(210, frame)).toBe(frame)
    expect(frame).toEqual(getCutAnimationFrame(210))
  })
})

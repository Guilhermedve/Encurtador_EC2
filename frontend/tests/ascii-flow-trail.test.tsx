import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { AsciiFlowTrail } from '../src/components/ascii-flow-trail/AsciiFlowTrail'
import {
  ASCII_TRAIL_CHARACTERS,
  getTrailBounds,
  getTrailGlyph,
  getTrailIntensity,
  hasTrailMoved,
  isTrailPointerType,
} from '../src/components/ascii-flow-trail/trailMath'

describe('ASCII flow trail', () => {
  test('calculates deterministic intensity and glyphs', () => {
    const points = [{ x: 0, y: 0, life: 1 }]

    expect(getTrailIntensity(0, 0, points, 100)).toBe(1)
    expect(getTrailIntensity(50, 0, points, 100)).toBe(0.5)
    expect(getTrailIntensity(100, 0, points, 100)).toBe(0)
    expect(getTrailGlyph(0)).toBe('')
    expect(getTrailGlyph(0.5)).toBe('=')
    expect(getTrailGlyph(1)).toBe('@')
    expect(ASCII_TRAIL_CHARACTERS).toBe(' .:-=+*#%@')
    expect(hasTrailMoved({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(false)
    expect(hasTrailMoved({ x: 0, y: 0 }, { x: 6, y: 0 }, 5)).toBe(true)
    expect(getTrailBounds(points, 20, 100, 100)).toEqual({
      left: 0,
      top: 0,
      right: 20,
      bottom: 20,
    })
    expect(isTrailPointerType('mouse')).toBe(true)
    expect(isTrailPointerType('pen')).toBe(true)
    expect(isTrailPointerType('touch')).toBe(false)
  })

  test('renders a decorative transparent canvas', () => {
    const markup = renderToStaticMarkup(<AsciiFlowTrail />)

    expect(markup).toContain('<canvas')
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('ascii-flow-trail')
    expect(markup).toContain('pointer-events-none')
    expect(markup).toContain('absolute')
    expect(markup).toContain('data-background="transparent"')
  })
})

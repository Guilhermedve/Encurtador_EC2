import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import * as THREE from 'three'
import {
  BLADE_EXTRUDE_SETTINGS,
  createAsciiFieldPositions,
  createBladeShape,
} from '../src/components/ascii-scissors/scissorsGeometry'
import { ScissorsFallback } from '../src/components/ascii-scissors/ScissorsFallback'

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

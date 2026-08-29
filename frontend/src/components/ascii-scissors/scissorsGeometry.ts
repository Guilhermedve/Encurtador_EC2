import * as THREE from 'three'

export const BLADE_EXTRUDE_SETTINGS: THREE.ExtrudeGeometryOptions = {
  depth: 0.16,
  bevelEnabled: true,
  bevelSegments: 1,
  bevelSize: 0.025,
  bevelThickness: 0.025,
}

export function createBladeShape(): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(0, -0.15)
  shape.lineTo(2.65, -0.045)
  shape.lineTo(2.78, 0)
  shape.lineTo(2.65, 0.045)
  shape.lineTo(0, 0.15)
  shape.closePath()
  return shape
}

export function createAsciiFieldPositions(count = 72, seed = 0xec2): Float32Array {
  let state = seed >>> 0
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
  const positions = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3
    positions[offset] = (next() - 0.5) * 8
    positions[offset + 1] = (next() - 0.5) * 5.5
    positions[offset + 2] = -1.6 - next() * 1.4
  }

  return positions
}

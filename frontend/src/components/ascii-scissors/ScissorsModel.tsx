import { useMemo } from 'react'
import { BLADE_EXTRUDE_SETTINGS, createBladeShape } from './scissorsGeometry'

const OPEN_ANGLE = 0.3

type ScissorHalfProps = {
  rotation: number
  z: number
}

function ScissorHalf({ rotation, z }: ScissorHalfProps) {
  const bladeShape = useMemo(createBladeShape, [])

  return (
    <group rotation={[0, 0, rotation]} position={[0, 0, z]}>
      <mesh position={[-0.82, 0, 0]}>
        <torusGeometry args={[0.55, 0.12, 8, 32]} />
        <meshStandardMaterial color="#ffffff" metalness={0.18} roughness={0.62} />
      </mesh>
      <mesh position={[0.08, 0, -0.08]}>
        <extrudeGeometry args={[bladeShape, BLADE_EXTRUDE_SETTINGS]} />
        <meshStandardMaterial color="#ffffff" metalness={0.18} roughness={0.62} />
      </mesh>
    </group>
  )
}

export function ScissorsModel() {
  return (
    <group position={[-0.75, 0, 0]} rotation={[0, 0, -0.08]} scale={1.02}>
      <ScissorHalf rotation={OPEN_ANGLE} z={0.08} />
      <ScissorHalf rotation={-OPEN_ANGLE} z={-0.08} />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.34, 12]} />
        <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  )
}

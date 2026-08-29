import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import type { Ref } from 'react'
import type { Group } from 'three'
import { BLADE_EXTRUDE_SETTINGS, createBladeShape } from './scissorsGeometry'
import { OPEN_BLADE_ANGLE } from './cutAnimation'

type ScissorHalfProps = {
  halfRef: Ref<Group>
  rotation: number
  z: number
}

function ScissorHalf({ halfRef, rotation, z }: ScissorHalfProps) {
  const bladeShape = useMemo(createBladeShape, [])

  return (
    <group ref={halfRef} rotation={[0, 0, rotation]} position={[0, 0, z]}>
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

export type ScissorsModelHandle = {
  setBladeAngle: (angle: number) => void
}

export const ScissorsModel = forwardRef<ScissorsModelHandle>(
  function ScissorsModel(_, ref) {
    const upperHalfRef = useRef<Group>(null)
    const lowerHalfRef = useRef<Group>(null)

    useImperativeHandle(ref, () => ({
      setBladeAngle(angle) {
        if (upperHalfRef.current) upperHalfRef.current.rotation.z = angle
        if (lowerHalfRef.current) lowerHalfRef.current.rotation.z = -angle
      },
    }), [])

    return (
      <group position={[-0.75, 0, 0]} rotation={[0, 0, -0.08]} scale={1.02}>
        <ScissorHalf halfRef={upperHalfRef} rotation={OPEN_BLADE_ANGLE} z={0.08} />
        <ScissorHalf halfRef={lowerHalfRef} rotation={-OPEN_BLADE_ANGLE} z={-0.08} />
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.34, 12]} />
          <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.5} />
        </mesh>
      </group>
    )
  },
)

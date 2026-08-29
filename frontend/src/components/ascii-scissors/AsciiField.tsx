import { useMemo } from 'react'
import { createAsciiFieldPositions } from './scissorsGeometry'

export function AsciiField() {
  const positions = useMemo(() => createAsciiFieldPositions(), [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#4a4a4a" size={0.035} sizeAttenuation transparent opacity={0.42} />
    </points>
  )
}

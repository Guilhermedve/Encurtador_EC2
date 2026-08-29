import { AsciiRenderer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { AsciiField } from './AsciiField'
import { ScissorsModel } from './ScissorsModel'

type ScissorsSceneProps = {
  animate: boolean
  resolution: number
}

export function ScissorsScene({ animate, resolution }: ScissorsSceneProps) {
  const sceneRef = useRef<Group>(null)

  useFrame(({ clock }, delta) => {
    if (!animate || !sceneRef.current) return
    sceneRef.current.rotation.y += Math.min(delta, 1 / 30) * 0.18
    sceneRef.current.rotation.x = -0.12 + Math.sin(clock.elapsedTime * 0.36) * 0.08
  })

  return (
    <>
      <ambientLight intensity={1.25} />
      <directionalLight position={[3, 4, 5]} intensity={2.1} />
      <group ref={sceneRef} rotation={[-0.12, -0.28, 0]}>
        <ScissorsModel />
      </group>
      <AsciiField />
      <AsciiRenderer
        fgColor="#ffffff"
        bgColor="transparent"
        characters=" .:-=+*#%@"
        color={false}
        resolution={resolution}
      />
    </>
  )
}

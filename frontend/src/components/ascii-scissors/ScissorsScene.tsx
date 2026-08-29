import { AsciiRenderer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { AsciiField } from './AsciiField'
import {
  OPEN_BLADE_ANGLE,
  getCutAnimationFrame,
  normalizeRadians,
} from './cutAnimation'
import {
  ScissorsModel,
  type ScissorsModelHandle,
} from './ScissorsModel'

type ScissorsSceneProps = {
  animate: boolean
  resolution: number
  cutRequestId?: number | null
  onCutComplete?: (requestId: number) => void
}

type ActiveCut = {
  requestId: number
  startedAtMs: number | null
  startX: number
  startY: number
}

const NEUTRAL_X = -0.12
const FRONT_Y = 0

export function ScissorsScene({
  animate,
  resolution,
  cutRequestId = null,
  onCutComplete = () => undefined,
}: ScissorsSceneProps) {
  const sceneRef = useRef<THREE.Group>(null)
  const modelRef = useRef<ScissorsModelHandle>(null)
  const ambientPhaseRef = useRef(0)
  const activeCutRef = useRef<ActiveCut | null>(null)
  const lastStartedRequestRef = useRef(0)
  const onCutCompleteRef = useRef(onCutComplete)

  useEffect(() => {
    onCutCompleteRef.current = onCutComplete
  }, [onCutComplete])

  useEffect(() => {
    const scene = sceneRef.current
    const model = modelRef.current

    if (cutRequestId === null) {
      if (activeCutRef.current === null) return

      activeCutRef.current = null
      ambientPhaseRef.current = 0
      scene?.rotation.set(NEUTRAL_X, FRONT_Y, 0)
      model?.setBladeAngle(OPEN_BLADE_ANGLE)
      return
    }

    if (
      cutRequestId <= 0 ||
      cutRequestId <= lastStartedRequestRef.current
    ) {
      return
    }

    lastStartedRequestRef.current = cutRequestId
    activeCutRef.current = {
      requestId: cutRequestId,
      startedAtMs: null,
      startX: scene?.rotation.x ?? NEUTRAL_X,
      startY: normalizeRadians(scene?.rotation.y ?? FRONT_Y),
    }
  }, [cutRequestId])

  useFrame(({ clock }, delta) => {
    const scene = sceneRef.current
    const model = modelRef.current

    if (!scene || !model) return

    const activeCut = activeCutRef.current

    if (activeCut) {
      const nowMs = clock.elapsedTime * 1000

      if (activeCut.startedAtMs === null) {
        activeCut.startedAtMs = nowMs
        activeCut.startX = scene.rotation.x
        activeCut.startY = normalizeRadians(scene.rotation.y)
      }

      const frame = getCutAnimationFrame(nowMs - activeCut.startedAtMs)
      model.setBladeAngle(frame.bladeAngle)
      scene.rotation.x = THREE.MathUtils.lerp(
        activeCut.startX,
        NEUTRAL_X,
        frame.alignment,
      )
      scene.rotation.y = THREE.MathUtils.lerp(
        activeCut.startY,
        FRONT_Y,
        frame.alignment,
      )

      if (frame.phase === 'complete') {
        const completedRequestId = activeCut.requestId
        activeCutRef.current = null
        ambientPhaseRef.current = 0
        scene.rotation.set(NEUTRAL_X, FRONT_Y, 0)
        model.setBladeAngle(OPEN_BLADE_ANGLE)
        onCutCompleteRef.current(completedRequestId)
      }

      return
    }

    if (!animate) return

    const boundedDelta = Math.min(delta, 1 / 30)
    ambientPhaseRef.current += boundedDelta * 0.36
    scene.rotation.y = normalizeRadians(scene.rotation.y + boundedDelta * 0.18)
    scene.rotation.x =
      NEUTRAL_X + Math.sin(ambientPhaseRef.current) * 0.08
  })

  return (
    <>
      <ambientLight intensity={1.25} />
      <directionalLight position={[3, 4, 5]} intensity={2.1} />
      <group ref={sceneRef} rotation={[-0.12, -0.28, 0]}>
        <ScissorsModel ref={modelRef} />
      </group>
      <AsciiField />
      <AsciiRenderer
        fgColor="#ffffff"
        bgColor="transparent"
        characters=" .:-=+*#%@"
        invert={false}
        color={false}
        resolution={resolution}
      />
    </>
  )
}

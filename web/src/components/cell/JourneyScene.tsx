import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { Cell, type Glow } from './CellScene'

// Camera stops along the scroll story: far → orbit → into the nucleus → back out → wide.
const STOPS: [number, number, number][] = [[0, 1.5, 15], [7, 3.5, 8.5], [1.6, 1.1, 5.4], [-4, 2.5, 9], [0, 2, 13.5]]
const ease = (x: number) => x * x * (3 - 2 * x)

function Rig({ progress, reduce }: { progress: RefObject<number>; reduce: boolean }) {
  const want = useMemo(() => new THREE.Vector3(), [])
  const next = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera }, dt) => {
    const t = (progress.current ?? 0) * (STOPS.length - 1)
    const i = Math.min(STOPS.length - 2, Math.floor(t))
    want.set(...STOPS[i]).lerp(next.set(...STOPS[i + 1]), ease(t - i))
    camera.position.lerp(want, reduce ? 1 : 1 - Math.pow(0.002, dt)) // frame-rate independent damping
    camera.lookAt(0, 0, 0)
  })
  return null
}

export function JourneyScene({ progress, glow, onPoke, eventSource, reduce }: {
  progress: RefObject<number>; glow: Glow; onPoke: () => void; eventSource: RefObject<HTMLElement | null>; reduce: boolean
}) {
  return (
    <Canvas camera={{ position: STOPS[0], fov: 45 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}
      eventSource={eventSource as RefObject<HTMLElement>} eventPrefix="client">
      <Tilted progress={progress} reduce={reduce}>
        <Cell variant="cancer" glow={glow} onSelect={onPoke} />
      </Tilted>
    </Canvas>
  )
}

function Tilted({ progress, reduce, children }: { progress: RefObject<number>; reduce: boolean; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  // Gentle idle spin plus a tilt toward the cursor.
  useFrame(({ pointer, clock }, dt) => {
    if (!g.current) return
    const spin = reduce ? 0 : clock.elapsedTime * 0.06
    g.current.rotation.y += (spin + pointer.x * 0.35 - g.current.rotation.y) * Math.min(1, dt * 3)
    g.current.rotation.x += (-pointer.y * 0.2 - g.current.rotation.x) * Math.min(1, dt * 3)
  })
  return (
    <>
      <Rig progress={progress} reduce={reduce} />
      <group ref={g}>{children}</group>
    </>
  )
}

import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { AlbumAssets } from '../textures/assets'
import { useApp } from '../store'
import { focusOn, openInspect } from '../app/actions'
import { INNER_FLOOR, LCARD } from './dims'
import { dampQuat, dampVec } from './anim'
import { noRaycast } from './useDrag'

const HOME: [number, number, number] = [-2.2, INNER_FLOOR + 0.04, -3.4]
const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _m = new THREE.Matrix4()
const _up = new THREE.Vector3(0, 1, 0)

/** Credit-card sized stats insert. Click to lift and read. */
export function ListenerCard({ assets }: { assets: AlbumAssets }) {
  const group = useRef<THREE.Group>(null)
  const unbox = useApp((s) => s.unbox)
  const focus = useApp((s) => s.focus)
  const reduced = useApp((s) => s.reducedMotion)
  const camera = useThree((s) => s.camera)
  const [hover, setHover] = useState(false)
  const mats = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 })
    const front = new THREE.MeshStandardMaterial({ map: assets.listenerCard, roughness: 0.5 })
    const back = new THREE.MeshStandardMaterial({ color: assets.theme.colors.accent, roughness: 0.6 })
    return [edge, edge, edge, edge, front, back]
  }, [assets])
  const enabled = unbox.bookOut
  const focused = focus === 'card'

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    if (focused) {
      _v.set(-2.2, 5.5, -1.5)
      dampVec(g.position, _v, 6, dt, reduced)
      _m.lookAt(camera.position, g.position, _up)
      _q.setFromRotationMatrix(_m)
      dampQuat(g.quaternion, _q, 6, dt, reduced)
    } else {
      dampVec(g.position, HOME, 6, dt, reduced)
      _q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.08))
      dampQuat(g.quaternion, _q, 6, dt, reduced)
    }
  })

  return (
    <group ref={group} position={HOME} rotation={[-Math.PI / 2, 0, 0.08]}>
      <mesh
        material={mats}
        castShadow
        receiveShadow
        scale={hover ? 1.02 : 1}
        raycast={enabled ? undefined : noRaycast}
        onClick={(e) => {
          e.stopPropagation()
          if (!enabled) return
          if (!focused) focusOn('card')
          else openInspect('card')
        }}
        onPointerOver={(e) => {
          if (!enabled) return
          e.stopPropagation()
          setHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = ''
        }}
      >
        <boxGeometry args={[LCARD.w, LCARD.h, 0.06]} />
      </mesh>
    </group>
  )
}

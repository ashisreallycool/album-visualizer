import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { AlbumAssets } from '../textures/assets'
import { useApp } from '../store'
import { slideDisc, focusOn, openInspect } from '../app/actions'
import { DISC, SLEEVE_Y, TABLE_SPOTS } from './dims'
import { dampQuat, dampVec } from './anim'
import { noRaycast, useDrag } from './useDrag'
import { PLAYER_POS } from './AddIn'

const SLEEVE_SIZE = 12.6
const DISC_HOME: [number, number, number] = [0, SLEEVE_Y + 0.02, 0.7]
const _v = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()

/** CD in a paper sleeve with a window; slides out, spins, and drops into the player. */
export function Disc({ assets }: { assets: AlbumAssets }) {
  const group = useRef<THREE.Group>(null)
  const spinner = useRef<THREE.Group>(null)
  const sleeveGroup = useRef<THREE.Group>(null)
  const unbox = useApp((s) => s.unbox)
  const focus = useApp((s) => s.focus)
  const reduced = useApp((s) => s.reducedMotion)
  const profile = assets.profile
  const [slide, setSlide] = useState(0)

  const { labelMat, bottomMat, rimMat, sleeveMat, sleeveBottom } = useMemo(() => {
    const labelMat = new THREE.MeshPhysicalMaterial({ map: assets.discLabel, roughness: 0.28, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.35, iridescenceIOR: 1.4 })
    const bottomMat = new THREE.MeshPhysicalMaterial({ map: assets.discBottom, roughness: 0.12, metalness: 0.9, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [150, 700], clearcoat: 1 })
    const rimMat = new THREE.MeshStandardMaterial({ color: '#cfd4dc', roughness: 0.3, metalness: 0.6 })
    const sleeveMat = new THREE.MeshStandardMaterial({ map: assets.sleeve, alphaMap: assets.sleeveAlpha, transparent: true, roughness: 0.9, side: THREE.DoubleSide, alphaTest: 0.5 })
    const sleeveBottom = new THREE.MeshStandardMaterial({ color: assets.theme.colors.paper, roughness: 0.9 })
    return { labelMat, bottomMat, rimMat, sleeveMat, sleeveBottom }
  }, [assets])

  const enabled = unbox.bookOut && !unbox.discOut
  const drag = useDrag(
    {
      onMove: ({ dy }) => setSlide(Math.max(0, Math.min(1, -dy / 140))),
      onEnd: ({ dy, isClick }) => {
        const p = Math.max(0, Math.min(1, -dy / 140))
        setSlide(0)
        if (isClick || p > 0.45) slideDisc()
      },
    },
    enabled,
  )

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const inPlayer = unbox.discInPlayer && profile.addIn === 'cd-player'
    // The paper sleeve leaves the box with the disc, uncovering the inserts beneath it.
    const sg = sleeveGroup.current
    if (sg) {
      dampVec(sg.position, unbox.discOut ? TABLE_SPOTS.sleeve : [0, 0, 0], 4, dt, reduced)
      sg.rotation.y = unbox.discOut ? (reduced ? 0.4 : sg.rotation.y + (0.4 - sg.rotation.y) * Math.min(1, dt * 4)) : 0
    }
    if (!unbox.discOut) {
      _v.set(DISC_HOME[0], DISC_HOME[1] + slide * 0.5, DISC_HOME[2] + slide * 8)
      dampVec(g.position, _v, 16, dt, reduced)
      _e.set(0, 0, 0)
      _q.setFromEuler(_e)
      dampQuat(g.quaternion, _q, 10, dt, reduced)
    } else if (inPlayer) {
      _v.set(PLAYER_POS[0], PLAYER_POS[1] + 0.46, PLAYER_POS[2])
      dampVec(g.position, _v, 5, dt, reduced)
      _e.set(0, 0, 0)
      _q.setFromEuler(_e)
      dampQuat(g.quaternion, _q, 6, dt, reduced)
    } else if (focus === 'disc') {
      // Tilt the label side up toward the camera
      _v.set(12, 5, -5)
      dampVec(g.position, _v, 5, dt, reduced)
      _e.set(0.9, 0, 0)
      _q.setFromEuler(_e)
      dampQuat(g.quaternion, _q, 5, dt, reduced)
    } else {
      dampVec(g.position, TABLE_SPOTS.disc, 5, dt, reduced)
      _e.set(0, 0, 0)
      _q.setFromEuler(_e)
      dampQuat(g.quaternion, _q, 5, dt, reduced)
    }
    if (spinner.current) {
      const speed = inPlayer && unbox.playing ? 9 : unbox.discOut && !inPlayer ? 0.6 : 0
      if (!reduced) spinner.current.rotation.y += speed * dt
    }
  })

  return (
    <group>
      {/* Paper sleeve */}
      <group ref={sleeveGroup}>
        <mesh position={[0, SLEEVE_Y - 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} material={sleeveBottom} raycast={noRaycast} receiveShadow>
          <planeGeometry args={[SLEEVE_SIZE, SLEEVE_SIZE]} />
        </mesh>
        <mesh position={[0, SLEEVE_Y + 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} material={sleeveMat} raycast={noRaycast} renderOrder={2}>
          <planeGeometry args={[SLEEVE_SIZE, SLEEVE_SIZE]} />
        </mesh>
      </group>
      {/* Disc */}
      <group ref={group} position={DISC_HOME}>
        <group ref={spinner}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, DISC.t / 2, 0]}
            material={labelMat}
            castShadow
            {...drag}
            onClick={(e) => {
              e.stopPropagation()
              if (!unbox.discOut) return
              if (focus !== 'disc') focusOn('disc')
              else openInspect('disc')
            }}
            onPointerOver={(e) => {
              if (!unbox.bookOut) return
              e.stopPropagation()
              document.body.style.cursor = enabled ? 'grab' : 'pointer'
            }}
            onPointerOut={() => {
              document.body.style.cursor = ''
            }}
          >
            <ringGeometry args={[DISC.hole, DISC.r, 96]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -DISC.t / 2, 0]} material={bottomMat} raycast={noRaycast}>
            <ringGeometry args={[DISC.hole, DISC.r, 96]} />
          </mesh>
          <mesh material={rimMat} raycast={noRaycast}>
            <cylinderGeometry args={[DISC.r, DISC.r, DISC.t, 96, 1, true]} />
          </mesh>
          <mesh material={rimMat} raycast={noRaycast}>
            <cylinderGeometry args={[DISC.hole, DISC.hole, DISC.t, 32, 1, true]} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

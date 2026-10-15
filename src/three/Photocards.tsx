import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { AlbumAssets } from '../textures/assets'
import { useApp } from '../store'
import { pullCard, focusOn } from '../app/actions'
import { CARD, LAYER2_Y, TABLE_SPOTS } from './dims'
import { dampQuat, dampVec, damp } from './anim'
import { noRaycast, useDrag } from './useDrag'

const PACK_POS: [number, number, number] = [-3.6, LAYER2_Y + 0.2, 2.4]
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _m = new THREE.Matrix4()
const _up = new THREE.Vector3(0, 1, 0)
const _v = new THREE.Vector3()

interface CardProps {
  index: number
  assets: AlbumAssets
  state: 'packed' | 'top' | 'out'
  packDepth: number
}

function Card({ index, assets, state, packDepth }: CardProps) {
  const group = useRef<THREE.Group>(null)
  const unbox = useApp((s) => s.unbox)
  const focus = useApp((s) => s.focus)
  const reduced = useApp((s) => s.reducedMotion)
  const flipCard = useApp((s) => s.flipCard)
  const camera = useThree((s) => s.camera)
  const [slide, setSlide] = useState(0)

  const mats = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 })
    const front =
      index === 0
        ? new THREE.MeshPhysicalMaterial({ map: assets.cards[0].front, roughness: 0.25, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.1, iridescence: 0.9, iridescenceIOR: 1.5, iridescenceThicknessRange: [120, 420] })
        : new THREE.MeshStandardMaterial({ map: assets.cards[index].front, roughness: 0.4, metalness: 0.05 })
    const back = new THREE.MeshStandardMaterial({ map: assets.cards[index].back, roughness: 0.7 })
    return [edge, edge, edge, edge, front, back]
  }, [assets, index])

  const flipped = Boolean(unbox.cardFlipped[index])
  const drag = useDrag(
    {
      onMove: ({ dy }) => setSlide(Math.max(0, Math.min(1, -dy / 120))),
      onEnd: ({ dy, isClick }) => {
        const p = Math.max(0, Math.min(1, -dy / 120))
        setSlide(0)
        if (isClick) {
          pullCard()
          return
        }
        if (p > 0.45) pullCard()
      },
    },
    state === 'top',
  )

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    if (state !== 'out') {
      // Face-down in the pack, stacked by depth; the top card slides forward on drag
      const y = PACK_POS[1] + 0.06 * (packDepth - index)
      _v.set(PACK_POS[0], y + (state === 'top' ? slide * 0.6 : 0), PACK_POS[2] + (state === 'top' ? slide * 7 : 0))
      dampVec(g.position, _v, 16, dt, reduced)
      _e.set(Math.PI / 2, 0, 0)
      _q.setFromEuler(_e)
      dampQuat(g.quaternion, _q, 16, dt, reduced)
      return
    }
    if (focus === 'cards') {
      const n = unbox.cardsPulled
      const spread = Math.min(5.2, 24 / Math.max(1, n))
      const x = 4 + (index - (n - 1) / 2) * spread
      _v.set(x, 7.5 - Math.abs(index - (n - 1) / 2) * 0.3, 2 - Math.abs(index - (n - 1) / 2) * 0.6)
      dampVec(g.position, _v, 6, dt, reduced)
      _m.lookAt(camera.position, g.position, _up)
      _q.setFromRotationMatrix(_m)
      if (flipped) _q.multiply(new THREE.Quaternion().setFromAxisAngle(_up, Math.PI))
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (index - (n - 1) / 2) * -0.05))
      dampQuat(g.quaternion, _q, 6, dt, reduced)
    } else {
      const [tx, ty, tz] = TABLE_SPOTS.cards
      _v.set(tx + index * 1.6, ty + index * 0.06, tz - index * 0.9)
      dampVec(g.position, _v, 5, dt, reduced)
      _e.set(-Math.PI / 2, 0, -0.35 + index * 0.08)
      _q.setFromEuler(_e)
      if (flipped) _q.multiply(new THREE.Quaternion().setFromAxisAngle(_up, Math.PI))
      dampQuat(g.quaternion, _q, 5, dt, reduced)
    }
  })

  const outHandlers =
    state === 'out'
      ? {
          onClick: (e: { stopPropagation: () => void }) => {
            e.stopPropagation()
            if (focus !== 'cards') focusOn('cards')
            else flipCard(index)
          },
        }
      : {}

  return (
    <group ref={group} position={PACK_POS} rotation={[Math.PI / 2, 0, 0]}>
      <mesh
        material={mats}
        castShadow
        receiveShadow
        raycast={state === 'packed' ? noRaycast : undefined}
        {...(state === 'top' ? drag : {})}
        {...outHandlers}
        onPointerOver={(e) => {
          if (state === 'packed') return
          e.stopPropagation()
          document.body.style.cursor = state === 'top' ? 'grab' : 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <boxGeometry args={[CARD.w, CARD.h, CARD.t]} />
      </mesh>
    </group>
  )
}

/** Five photocards in a frosted sleeve; pull them out one at a time. */
export function Photocards({ assets }: { assets: AlbumAssets }) {
  const unbox = useApp((s) => s.unbox)
  const pulled = unbox.cardsPulled
  const total = 5
  const sleeveRef = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (sleeveRef.current) {
      const m = sleeveRef.current.material as THREE.MeshPhysicalMaterial
      m.opacity = damp(m.opacity, pulled >= total ? 0.12 : 0.3, 4, dt)
    }
  })
  return (
    <group>
      {Array.from({ length: total }, (_, i) => {
        const state: CardProps['state'] = i < pulled ? 'out' : i === pulled ? 'top' : 'packed'
        return <Card key={i} index={i} assets={assets} state={state} packDepth={total} />
      })}
      {/* Frosted sleeve, open toward +z */}
      <mesh ref={sleeveRef} position={[PACK_POS[0], PACK_POS[1] + 0.18, PACK_POS[2] - 0.6]} raycast={noRaycast} renderOrder={3}>
        <boxGeometry args={[CARD.w + 0.5, 0.5, CARD.h - 0.4]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.3} roughness={0.35} clearcoat={1} depthWrite={false} />
      </mesh>
      {/* Label on the sleeve */}
      <mesh position={[PACK_POS[0], PACK_POS[1] + 0.44, PACK_POS[2] - 3.2]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <planeGeometry args={[CARD.w, 0.9]} />
        <meshStandardMaterial color={assets.theme.colors.accent} roughness={0.6} />
      </mesh>
    </group>
  )
}

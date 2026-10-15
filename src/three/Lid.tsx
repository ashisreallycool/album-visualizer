import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { AlbumAssets } from '../textures/assets'
import { useApp } from '../store'
import { openLid, closeLid } from '../app/actions'
import { BOX } from './dims'
import { damp } from './anim'
import { useDrag } from './useDrag'
import { useStickable } from './stickables'

const OPEN_ANGLE = -1.95

/** Hinged lid. Cover art on top, liner notes inside. */
export function Lid({ assets, interactive }: { assets: AlbumAssets; interactive: boolean }) {
  const group = useRef<THREE.Group>(null)
  const unbox = useApp((s) => s.unbox)
  const reduced = useApp((s) => s.reducedMotion)
  const [preview, setPreview] = useState<number | null>(null)
  const stickable = useStickable('lid')

  const mats = useMemo(() => {
    const spine = new THREE.MeshStandardMaterial({ map: assets.spine, roughness: 0.8 })
    const cover = new THREE.MeshStandardMaterial({ map: assets.cover, roughness: 0.55, metalness: 0.02 })
    const inner = new THREE.MeshStandardMaterial({ map: assets.lidInner, roughness: 0.9 })
    return [spine, spine, cover, inner, spine, spine]
  }, [assets])

  const enabled = interactive && unbox.wrapTorn
  const drag = useDrag(
    {
      onMove: ({ dy }) => {
        if (unbox.lidOpen) return
        setPreview(Math.max(0, Math.min(1, -dy / 170)))
      },
      onEnd: ({ dy, isClick }) => {
        const p = Math.max(0, Math.min(1, -dy / 170))
        setPreview(null)
        if (isClick) {
          if (unbox.lidOpen) closeLid()
          else openLid()
          return
        }
        if (!unbox.lidOpen && p > 0.3) openLid()
        if (unbox.lidOpen && dy > 60) closeLid()
      },
    },
    enabled,
  )

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const target = unbox.lidOpen ? OPEN_ANGLE : preview !== null ? OPEN_ANGLE * preview * 0.85 : 0
    g.rotation.x = damp(g.rotation.x, target, preview !== null ? 18 : 6, dt, reduced)
  })

  return (
    <group ref={group} position={[0, BOX.h, -BOX.d / 2]}>
      <mesh
        ref={stickable}
        position={[0, BOX.lidH / 2, BOX.d / 2]}
        material={mats}
        castShadow
        receiveShadow
        {...drag}
        onPointerOver={(e) => {
          if (!enabled) return
          e.stopPropagation()
          document.body.style.cursor = 'grab'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <boxGeometry args={[BOX.w, BOX.lidH, BOX.d]} />
      </mesh>
    </group>
  )
}

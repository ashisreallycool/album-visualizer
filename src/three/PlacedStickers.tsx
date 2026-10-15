import { useMemo } from 'react'
import * as THREE from 'three'
import { createPortal } from '@react-three/fiber'
import type { AlbumAssets } from '../textures/assets'
import { useApp, type PlacedSticker } from '../store'
import { getStickable, useStickableRegistry } from './stickables'
import { HYPE } from './dims'

function Placed({ placed, assets }: { placed: PlacedSticker; assets: AlbumAssets }) {
  const removeSticker = useApp((s) => s.removeSticker)
  const toast = useApp((s) => s.toast)
  const sticker = assets.stickers.find((s) => s.id === placed.stickerId)
  const quaternion = useMemo(() => new THREE.Quaternion(...placed.quaternion), [placed.quaternion])
  if (!sticker) return null
  const isHype = sticker.id === 'hype'
  const w = isHype ? HYPE.w * 0.9 : placed.scale
  const h = isHype ? HYPE.h * 0.9 : placed.scale
  return (
    <group position={placed.position} quaternion={quaternion}>
      <mesh
        rotation={[0, 0, placed.rotation]}
        renderOrder={3}
        onClick={(e) => {
          e.stopPropagation()
          removeSticker(placed.id)
          toast(`${sticker.label} peeled back off.`)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={sticker.texture} transparent roughness={0.45} alphaTest={0.2} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  )
}

/** Renders every placed sticker as a child of the surface it was dropped on. */
export function PlacedStickers({ assets }: { assets: AlbumAssets }) {
  useStickableRegistry()
  const placed = useApp((s) => s.unbox.stickersPlaced)
  return (
    <>
      {placed.map((p) => {
        const target = getStickable(p.surface)
        if (!target) return null
        return <group key={p.id}>{createPortal(<Placed placed={p} assets={assets} />, target)}</group>
      })}
    </>
  )
}

import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { AlbumAssets, StickerAsset } from '../textures/assets'
import { useApp, type PlacedSticker } from '../store'
import { focusOn } from '../app/actions'
import { INNER_FLOOR, SHEET } from './dims'
import { noRaycast, useDrag } from './useDrag'
import { stickableObjects } from './stickables'

const SHEET_POS: [number, number, number] = [2.6, INNER_FLOOR + 0.02, 3.6]
const raycaster = new THREE.Raycaster()
const _p = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _qw = new THREE.Quaternion()
const Z = new THREE.Vector3(0, 0, 1)

interface Hit {
  surface: string
  object: THREE.Object3D
  point: THREE.Vector3
  normal: THREE.Vector3
}

function raycastSurfaces(ray: THREE.Ray): Hit | null {
  raycaster.ray.copy(ray)
  const hits = raycaster.intersectObjects(stickableObjects(), true)
  for (const h of hits) {
    if (!h.face) continue
    let o: THREE.Object3D | null = h.object
    while (o && !o.userData.stickableId) o = o.parent
    if (!o) continue
    const normal = h.face.normal.clone().transformDirection(h.object.matrixWorld)
    return { surface: o.userData.stickableId as string, object: o, point: h.point.clone(), normal }
  }
  return null
}

interface GhostState {
  sticker: StickerAsset
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  hit: Hit | null
}

function SheetSticker({ sticker, size, onLift }: { sticker: StickerAsset; size: number; onLift: (s: StickerAsset, ghost: GhostState) => void }) {
  const ghost = useRef<GhostState | null>(null)
  const drag = useDrag(
    {
      onStart: () => {
        ghost.current = { sticker, position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), hit: null }
        useApp.getState().setLiftedSticker(sticker.id)
        return true
      },
      onMove: ({ event }) => {
        const g = ghost.current
        if (!g) return
        const hit = raycastSurfaces(event.ray)
        if (hit) {
          g.hit = hit
          g.position.copy(hit.point).addScaledVector(hit.normal, 0.03)
          g.quaternion.setFromUnitVectors(Z, hit.normal)
        } else {
          g.hit = null
          // Float the sticker on a plane above the table
          const t = (8 - event.ray.origin.y) / event.ray.direction.y
          g.position.copy(event.ray.origin).addScaledVector(event.ray.direction, t)
          g.quaternion.setFromUnitVectors(Z, new THREE.Vector3(0, 1, 0))
        }
        onLift(sticker, g)
      },
      onEnd: ({ isClick }) => {
        const g = ghost.current
        ghost.current = null
        useApp.getState().setLiftedSticker(null)
        if (!g || isClick) {
          if (isClick) focusOn('stickers')
          onLift(sticker, { ...(g ?? { sticker, position: new THREE.Vector3(), quaternion: new THREE.Quaternion() }), hit: null, sticker })
          return
        }
        if (g.hit) {
          const obj = g.hit.object
          obj.updateWorldMatrix(true, false)
          const local = obj.worldToLocal(_p.copy(g.position))
          obj.getWorldQuaternion(_qw)
          const localQ = _q.copy(_qw).invert().multiply(g.quaternion)
          const placed: PlacedSticker = {
            id: `${sticker.id}-${Date.now()}`,
            stickerId: sticker.id,
            surface: g.hit.surface,
            position: [local.x, local.y, local.z],
            quaternion: [localQ.x, localQ.y, localQ.z, localQ.w],
            rotation: (Math.random() - 0.5) * 0.5,
            scale: size,
          }
          useApp.getState().placeSticker(placed)
          useApp.getState().toast(`${sticker.label} stuck on the ${g.hit.surface === 'lid' ? 'cover' : g.hit.surface}.`, 'success')
        }
        onLift(sticker, { ...g, hit: null })
      },
    },
    true,
  )
  const lifted = useApp((s) => s.liftedSticker === sticker.id)
  return (
    <mesh
      {...drag}
      visible={!lifted}
      position={[0, 0, 0.02]}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'grab'
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
      }}
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={sticker.texture} transparent roughness={0.5} alphaTest={0.2} />
    </mesh>
  )
}

/** Sheet of badge stickers; drag any sticker onto the album. */
export function StickerSheet({ assets }: { assets: AlbumAssets }) {
  const unbox = useApp((s) => s.unbox)
  const ghostMesh = useRef<THREE.Mesh>(null)
  const [ghost, setGhost] = useState<GhostState | null>(null)
  const sheetMat = useMemo(() => new THREE.MeshStandardMaterial({ map: assets.sheet, roughness: 0.9 }), [assets])
  const enabled = unbox.bookOut
  const placedIds = new Set(unbox.stickersPlaced.map((p) => p.stickerId))
  const available = assets.stickers.filter((s) => s.slot && !placedIds.has(s.id))

  useFrame(() => {
    const m = ghostMesh.current
    if (!m || !ghost) return
    m.position.copy(ghost.position)
    m.quaternion.copy(ghost.quaternion)
  })

  const onLift = (_s: StickerAsset, g: GhostState) => {
    setGhost(g.hit || useApp.getState().liftedSticker ? { ...g } : null)
  }

  return (
    <group>
      <group position={SHEET_POS} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={sheetMat} receiveShadow raycast={noRaycast}>
          <planeGeometry args={[SHEET.w, SHEET.h]} />
        </mesh>
        {enabled &&
          available.map((s) => (
            <group key={s.id} position={[(s.slot!.u - 0.5) * SHEET.w, (0.5 - s.slot!.v) * SHEET.h, 0]}>
              <SheetSticker sticker={s} size={s.slot!.size * SHEET.w} onLift={onLift} />
            </group>
          ))}
      </group>
      {ghost && (
        <mesh ref={ghostMesh} raycast={noRaycast} renderOrder={8}>
          <planeGeometry args={[ghost.sticker.slot ? ghost.sticker.slot.size * SHEET.w : 3, ghost.sticker.slot ? ghost.sticker.slot.size * SHEET.w : 3]} />
          <meshStandardMaterial map={ghost.sticker.texture} transparent roughness={0.5} alphaTest={0.2} depthTest={false} />
        </mesh>
      )}
    </group>
  )
}

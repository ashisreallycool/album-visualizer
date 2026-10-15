import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { AlbumAssets } from '../textures/assets'
import { useApp } from '../store'
import { nextPage, prevPage, takeBook, focusOn, openInspect } from '../app/actions'
import { BOOK, BOOK_Y, TABLE_SPOTS } from './dims'
import { damp, dampQuat, dampVec } from './anim'
import { useStickable } from './stickables'

const FOCUS_POS = new THREE.Vector3(-10.5, 8, 6)
const _target = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _m = new THREE.Matrix4()
const _up = new THREE.Vector3(0, 1, 0)

interface LeafProps {
  index: number
  front: THREE.Texture
  back: THREE.Texture
  flipped: boolean
  thick?: boolean
  onClick: () => void
  paper: string
  stickableRef?: (o: THREE.Object3D | null) => void
}

/**
 * Stacking order along local z (toward the reader): closed cover at 0, unflipped
 * leaves just above the page block, flipped leaves on the left on top of the
 * flipped cover, which lies lowest.
 */
function leafZ(index: number, flipped: boolean): number {
  if (flipped) return index === 0 ? -0.62 : -0.45 + 0.03 * index
  return index === 0 ? 0 : -0.115 - 0.01 * index
}

/** One leaf of the book, hinged on the spine (x = 0), extending along +x. */
function Leaf({ index, front, back, flipped, thick, onClick, paper, stickableRef }: LeafProps) {
  const pivot = useRef<THREE.Group>(null)
  const reduced = useApp((s) => s.reducedMotion)
  const mats = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: paper, roughness: 0.9 })
    const f = new THREE.MeshStandardMaterial({ map: front, roughness: 0.6 })
    const b = new THREE.MeshStandardMaterial({ map: back, roughness: 0.8 })
    return thick ? [edge, edge, edge, edge, f, b] : { f, b }
  }, [front, back, paper, thick])

  useFrame((_, dt) => {
    const g = pivot.current
    if (!g) return
    const target = flipped ? -Math.PI : 0
    g.rotation.y = damp(g.rotation.y, target, 7, dt, reduced)
    g.position.z = damp(g.position.z, leafZ(index, flipped), 7, dt, reduced)
  })

  const w = BOOK.w
  const h = BOOK.h
  return (
    <group ref={pivot} position={[0, 0, leafZ(index, false)]}>
      {thick && Array.isArray(mats) ? (
        <mesh ref={stickableRef} position={[w / 2, 0, 0]} material={mats} castShadow receiveShadow onClick={(e) => (e.stopPropagation(), onClick())}>
          <boxGeometry args={[w + 0.2, h + 0.2, 0.22]} />
        </mesh>
      ) : (
        !Array.isArray(mats) && (
          <group position={[w / 2 - 0.1, 0, 0]} onClick={(e) => (e.stopPropagation(), onClick())}>
            <mesh material={mats.f} position={[0, 0, 0.005]} castShadow>
              <planeGeometry args={[w - 0.2, h - 0.2]} />
            </mesh>
            <mesh material={mats.b} rotation={[0, Math.PI, 0]} position={[0, 0, -0.005]}>
              <planeGeometry args={[w - 0.2, h - 0.2]} />
            </mesh>
          </group>
        )
      )}
    </group>
  )
}

/** Hardcover photobook: lives in the box, lifts out, flips open page by page. */
export function Photobook({ assets }: { assets: AlbumAssets }) {
  const group = useRef<THREE.Group>(null)
  const unbox = useApp((s) => s.unbox)
  const focus = useApp((s) => s.focus)
  const reduced = useApp((s) => s.reducedMotion)
  const camera = useThree((s) => s.camera)
  const stickable = useStickable('book')
  const paper = assets.theme.colors.paper

  const focused = focus === 'book' && unbox.bookOut
  const page = unbox.page
  // Leaves: 0 = cover (front: cover, back: inside-cover page), then 3 inner leaves, last = back cover inside
  const leaves = useMemo(() => {
    const p = assets.pages
    return [
      { front: assets.cover, back: p[0] },
      { front: p[1], back: p[2] },
      { front: p[3], back: p[4] },
      { front: p[5], back: assets.back },
    ]
  }, [assets])

  const backMats = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: paper, roughness: 0.9 })
    const inner = new THREE.MeshStandardMaterial({ color: paper, roughness: 0.9 })
    const back = new THREE.MeshStandardMaterial({ map: assets.back, roughness: 0.6 })
    return [edge, edge, edge, edge, inner, back]
  }, [assets, paper])

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    if (!unbox.bookOut) {
      dampVec(g.position, [0, BOOK_Y, 0], 6, dt, reduced)
      _q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
      dampQuat(g.quaternion, _q, 6, dt, reduced)
      return
    }
    if (focused) {
      // Centre the open spread (spine at the origin) or the closed book in front of the camera
      const offset = page > 0 ? 0 : -BOOK.w / 2
      _target.copy(FOCUS_POS)
      dampVec(g.position, _target, 5, dt, reduced)
      _m.lookAt(camera.position, g.position, _up)
      _q.setFromRotationMatrix(_m)
      dampQuat(g.quaternion, _q, 5, dt, reduced)
      g.children[0].position.x = damp(g.children[0].position.x, offset, 6, dt, reduced)
    } else {
      dampVec(g.position, TABLE_SPOTS.book, 5, dt, reduced)
      _q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.2))
      dampQuat(g.quaternion, _q, 5, dt, reduced)
      g.children[0].position.x = damp(g.children[0].position.x, -BOOK.w / 2, 6, dt, reduced)
    }
  })

  const enabled = unbox.lidOpen
  const onLeafClick = (i: number) => {
    if (!unbox.bookOut) {
      takeBook()
      return
    }
    if (!focused) {
      focusOn('book')
      return
    }
    if (i < page) prevPage()
    else nextPage()
  }

  return (
    <group ref={group} position={[0, BOOK_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <group position={[-BOOK.w / 2, 0, 0]}>
        {leaves.map((leaf, i) => (
          <Leaf
            key={i}
            index={i}
            front={leaf.front}
            back={leaf.back}
            flipped={i < page}
            thick={i === 0}
            paper={paper}
            onClick={() => enabled && onLeafClick(i)}
            stickableRef={i === 0 ? stickable : undefined}
          />
        ))}
        {/* Back cover board */}
        <mesh
          position={[BOOK.w / 2, 0, -0.73]}
          material={backMats}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation()
            if (!enabled) return
            if (!unbox.bookOut) takeBook()
            else openInspect('book')
          }}
        >
          <boxGeometry args={[BOOK.w + 0.2, BOOK.h + 0.2, 0.22]} />
        </mesh>
        {/* Page block between covers */}
        <mesh position={[BOOK.w / 2, 0, -0.41]} receiveShadow>
          <boxGeometry args={[BOOK.w - 0.3, BOOK.h - 0.3, 0.42]} />
          <meshStandardMaterial color="#f4f1ea" roughness={0.95} />
        </mesh>
      </group>
    </group>
  )
}

import { useMemo } from 'react'
import * as THREE from 'three'
import type { AlbumAssets } from '../textures/assets'
import { BOX } from './dims'
import { useStickable } from './stickables'

/** The open tray of the box: floor + four walls. Tracklist is printed underneath. */
export function BoxBase({ assets }: { assets: AlbumAssets }) {
  const paper = assets.theme.colors.paper
  const stickable = useStickable('base')
  const { floorMats, wallX, wallZ } = useMemo(() => {
    const plain = new THREE.MeshStandardMaterial({ color: paper, roughness: 0.85 })
    const inner = new THREE.MeshStandardMaterial({ color: new THREE.Color(paper).multiplyScalar(0.92), roughness: 0.9 })
    const spine = new THREE.MeshStandardMaterial({ map: assets.spine, roughness: 0.8 })
    const back = new THREE.MeshStandardMaterial({ map: assets.back, roughness: 0.8 })
    // BoxGeometry material order: +x, -x, +y, -y, +z, -z
    const floorMats = [spine, spine, inner, back, spine, spine]
    const wallX = [spine, inner, plain, plain, plain, plain]
    const wallZ = [plain, plain, plain, plain, spine, inner]
    return { floorMats, wallX, wallZ }
  }, [assets, paper])

  const innerH = BOX.h - BOX.wall
  return (
    <group ref={stickable}>
      <mesh position={[0, BOX.wall / 2, 0]} material={floorMats} castShadow receiveShadow>
        <boxGeometry args={[BOX.w, BOX.wall, BOX.d]} />
      </mesh>
      {/* right / left walls */}
      <mesh position={[BOX.w / 2 - BOX.wall / 2, BOX.wall + innerH / 2, 0]} material={wallX} castShadow receiveShadow>
        <boxGeometry args={[BOX.wall, innerH, BOX.d]} />
      </mesh>
      <mesh position={[-BOX.w / 2 + BOX.wall / 2, BOX.wall + innerH / 2, 0]} material={wallX} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
        <boxGeometry args={[BOX.wall, innerH, BOX.d]} />
      </mesh>
      {/* front / back walls */}
      <mesh position={[0, BOX.wall + innerH / 2, BOX.d / 2 - BOX.wall / 2]} material={wallZ} castShadow receiveShadow>
        <boxGeometry args={[BOX.w - BOX.wall * 2, innerH, BOX.wall]} />
      </mesh>
      <mesh position={[0, BOX.wall + innerH / 2, -BOX.d / 2 + BOX.wall / 2]} material={wallZ} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
        <boxGeometry args={[BOX.w - BOX.wall * 2, innerH, BOX.wall]} />
      </mesh>
    </group>
  )
}

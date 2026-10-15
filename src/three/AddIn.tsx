import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { AlbumAssets } from '../textures/assets'
import { useApp } from '../store'
import { useAddIn, focusOn } from '../app/actions'
import { paintPlayerScreen } from '../textures/parts'
import { LAYER2_Y } from './dims'
import { damp } from './anim'
import { noRaycast } from './useDrag'
import { useStickable } from './stickables'

export const PLAYER_POS: [number, number, number] = [3.2, LAYER2_Y + 0.4, -2.6]

function CdPlayer({ assets }: { assets: AlbumAssets }) {
  const unbox = useApp((s) => s.unbox)
  const focus = useApp((s) => s.focus)
  const reduced = useApp((s) => s.reducedMotion)
  const stickable = useStickable('player')
  const lid = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  const screen = useMemo(() => {
    const t = new THREE.CanvasTexture(paintPlayerScreen(assets.profile, false))
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [assets])
  useEffect(() => {
    screen.image = paintPlayerScreen(assets.profile, unbox.playing && unbox.discInPlayer)
    screen.needsUpdate = true
  }, [assets, screen, unbox.playing, unbox.discInPlayer])
  useEffect(() => () => screen.dispose(), [screen])

  useFrame((_, dt) => {
    if (!lid.current) return
    const open = unbox.discOut && !unbox.discInPlayer
    lid.current.rotation.x = damp(lid.current.rotation.x, open ? -1.2 : 0, 6, dt, reduced)
  })

  const enabled = unbox.bookOut
  return (
    <group position={PLAYER_POS}>
      <RoundedBox
        ref={stickable}
        args={[7, 0.8, 7]}
        radius={0.3}
        smoothness={4}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          if (!enabled) return
          if (focus !== 'addin' && !unbox.discOut) {
            focusOn('addin')
            return
          }
          useAddIn()
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
        <meshStandardMaterial color={hover ? '#3b3b44' : '#2b2b33'} roughness={0.35} metalness={0.6} />
      </RoundedBox>
      {/* Spindle */}
      <mesh position={[0, 0.5, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.55, 0.6, 0.25, 24]} />
        <meshStandardMaterial color="#9aa0aa" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* LCD */}
      <mesh position={[0.4, 0.41, 2.8]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <planeGeometry args={[3.8, 1.2]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      {/* Buttons */}
      {[-2.9, -2.3, -1.7].map((x, i) => (
        <mesh key={i} position={[x, 0.44, 2.8]} raycast={noRaycast}>
          <cylinderGeometry args={[0.22, 0.22, 0.12, 16]} />
          <meshStandardMaterial color={i === 1 ? assets.theme.colors.accent : '#e6e6e6'} roughness={0.5} />
        </mesh>
      ))}
      {/* Clear lid hinged at the back */}
      <group ref={lid} position={[0, 0.42, -3.3]}>
        <mesh position={[0, 0.08, 3.0]} raycast={noRaycast} renderOrder={4}>
          <boxGeometry args={[6.6, 0.16, 5.6]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.32} roughness={0.08} clearcoat={1} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

function Digicam({ assets }: { assets: AlbumAssets }) {
  const unbox = useApp((s) => s.unbox)
  const focus = useApp((s) => s.focus)
  const flash = useRef<THREE.PointLight>(null)
  const flashPlane = useRef<THREE.Mesh>(null)
  const stickable = useStickable('camera')
  const [hover, setHover] = useState(false)
  const burst = useRef(0)
  const lastPhotos = useRef(unbox.photosTaken)
  useEffect(() => {
    if (unbox.photosTaken > lastPhotos.current) burst.current = 1
    lastPhotos.current = unbox.photosTaken
  }, [unbox.photosTaken])
  useFrame((_, dt) => {
    burst.current = Math.max(0, burst.current - dt * 4)
    if (flash.current) flash.current.intensity = burst.current * 60
    if (flashPlane.current) (flashPlane.current.material as THREE.MeshBasicMaterial).opacity = burst.current * 0.9
  })
  const enabled = unbox.bookOut
  return (
    <group position={[3.2, LAYER2_Y + 0.45, -2.6]}>
      <RoundedBox
        ref={stickable}
        args={[5.8, 0.9, 3.4]}
        radius={0.25}
        smoothness={4}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          if (!enabled) return
          if (focus !== 'addin') focusOn('addin')
          useAddIn()
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
        <meshStandardMaterial color={hover ? '#d9dde6' : '#c9ced8'} roughness={0.35} metalness={0.75} />
      </RoundedBox>
      {/* Lens pointing up */}
      <mesh position={[-1.1, 0.6, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.95, 1.05, 0.4, 32]} />
        <meshStandardMaterial color="#1a1a1f" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[-1.1, 0.82, 0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 32]} />
        <meshPhysicalMaterial color="#2a3b66" roughness={0.05} metalness={0.2} clearcoat={1} />
      </mesh>
      {/* Flash */}
      <mesh ref={flashPlane} position={[1.4, 0.47, -0.8]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <planeGeometry args={[1.2, 0.7]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} toneMapped={false} />
      </mesh>
      <mesh position={[1.4, 0.46, -0.8]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <planeGeometry args={[1.2, 0.7]} />
        <meshStandardMaterial color="#f3f0e6" roughness={0.3} />
      </mesh>
      <pointLight ref={flash} position={[1.4, 1.5, -0.8]} intensity={0} distance={30} color="#fff6e0" />
      {/* Shutter button */}
      <mesh position={[2.2, 0.5, 1.0]} raycast={noRaycast}>
        <cylinderGeometry args={[0.3, 0.3, 0.14, 16]} />
        <meshStandardMaterial color={assets.theme.colors.accent} roughness={0.5} />
      </mesh>
    </group>
  )
}

function Keychain({ assets }: { assets: AlbumAssets }) {
  const unbox = useApp((s) => s.unbox)
  const focus = useApp((s) => s.focus)
  const reduced = useApp((s) => s.reducedMotion)
  const swing = useRef<THREE.Group>(null)
  const energy = useRef(0)
  const [hover, setHover] = useState(false)
  const stickable = useStickable('tag')
  const lastUsed = useRef(unbox.addInUsed)
  useEffect(() => {
    if (unbox.addInUsed && !lastUsed.current) energy.current = 1
    lastUsed.current = unbox.addInUsed
  }, [unbox.addInUsed])
  useFrame((state, dt) => {
    energy.current = Math.max(0, energy.current - dt * 0.35)
    if (swing.current && !reduced) swing.current.rotation.z = Math.sin(state.clock.elapsedTime * 5) * 0.4 * energy.current
  })
  const enabled = unbox.bookOut
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: assets.tag, roughness: 0.8, side: THREE.DoubleSide }), [assets])
  return (
    <group position={[3.4, LAYER2_Y + 0.12, -4.6]}>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} raycast={noRaycast} castShadow>
        <torusGeometry args={[0.7, 0.09, 12, 32]} />
        <meshStandardMaterial color="#c9ced8" roughness={0.25} metalness={0.9} />
      </mesh>
      <group ref={swing} position={[0, 0.05, 0.6]}>
        <mesh
          ref={stickable}
          material={mat}
          position={[0, 0, 2.8]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
          scale={hover ? 1.03 : 1}
          onClick={(e) => {
            e.stopPropagation()
            if (!enabled) return
            if (focus !== 'addin') focusOn('addin')
            energy.current = 1
            useAddIn()
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
          <planeGeometry args={[3.2, 5.6]} />
        </mesh>
      </group>
    </group>
  )
}

export function AddIn({ assets }: { assets: AlbumAssets }) {
  switch (assets.profile.addIn) {
    case 'digicam':
      return <Digicam assets={assets} />
    case 'keychain':
      return <Keychain assets={assets} />
    default:
      return <CdPlayer assets={assets} />
  }
}

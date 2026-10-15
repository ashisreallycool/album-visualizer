import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, ContactShadows, Environment, Lightformer, type CameraControlsImpl } from '@react-three/drei'
import type { AlbumAssets } from '../textures/assets'
import { useApp } from '../store'
import { presetFor } from './camera'
import { Album } from './Album'

function CameraRig({ teaser }: { teaser?: boolean }) {
  const ref = useRef<CameraControlsImpl>(null)
  const focus = useApp((s) => s.focus)
  const dragging = useApp((s) => s.dragging)
  const reduced = useApp((s) => s.reducedMotion)
  const size = useThree((s) => s.size)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const p = presetFor(teaser ? 'overview' : focus, size.width / size.height, teaser ? 0 : size.width)
    void c.setLookAt(p.pos[0], p.pos[1], p.pos[2], p.target[0], p.target[1], p.target[2], !reduced)
  }, [focus, reduced, size.width, size.height, teaser])

  useEffect(() => {
    if (ref.current) ref.current.enabled = !dragging && !teaser
  }, [dragging, teaser])

  useFrame((_, delta) => {
    if (teaser && !reduced && ref.current) ref.current.azimuthAngle += delta * 0.12
  })

  return <CameraControls ref={ref} makeDefault minDistance={8} maxDistance={90} maxPolarAngle={Math.PI / 2 - 0.04} smoothTime={0.4} dollySpeed={0.5} truckSpeed={0.8} />
}

function Table({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0} />
    </mesh>
  )
}

export function Scene({ assets, teaser = false }: { assets: AlbumAssets; teaser?: boolean }) {
  const stage = assets.theme.colors.stage
  const floor = assets.theme.colors.floor
  const epoch = useApp((s) => s.epoch)
  // Phones get lighter shadow work; the look barely changes at that size.
  const small = typeof window !== 'undefined' && window.innerWidth < 768
  const shadowSize = small ? 1024 : 2048
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 32, position: [0, 24, 34], near: 0.5, far: 400 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
      style={{ touchAction: 'none' }}
      eventSource={undefined}
    >
      <color attach="background" args={[stage]} />
      <fog attach="fog" args={[stage, 70, 160]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        castShadow
        position={[12, 30, 16]}
        intensity={2.4}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-18, 14, -12]} intensity={0.7} />
      <Suspense fallback={null}>
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 12, -8]} scale={[24, 10, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1.6} position={[-14, 6, 6]} scale={[8, 12, 1]} target={[0, 0, 0]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.2} position={[14, 4, 8]} scale={[8, 10, 1]} target={[0, 0, 0]} color="#dfe8ff" />
          <Lightformer form="circle" intensity={0.8} position={[0, -6, 0]} scale={[20, 20, 1]} target={[0, 0, 0]} color={floor} />
        </Environment>
      </Suspense>
      <Table color={floor} />
      <Album key={`${epoch}-${assets.profile.user.id}`} assets={assets} teaser={teaser} />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.5} scale={80} blur={2.4} far={14} resolution={small ? 256 : 512} />
      <CameraRig teaser={teaser} />
    </Canvas>
  )
}

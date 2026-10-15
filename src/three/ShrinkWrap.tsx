import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { AlbumAssets } from '../textures/assets'
import { useApp } from '../store'
import { tearWrap } from '../app/actions'
import { WRAP, HYPE, BOX } from './dims'
import { useDrag } from './useDrag'
import { PeelSticker } from './PeelSticker'
import { damp } from './anim'

/**
 * Clear shrink wrap around the closed box. Dragging across the top draws a jagged
 * tear into an alpha map; once the tear is long enough the wrap lifts away.
 */
export function ShrinkWrap({ assets, interactive }: { assets: AlbumAssets; interactive: boolean }) {
  const unbox = useApp((s) => s.unbox)
  const reduced = useApp((s) => s.reducedMotion)
  const group = useRef<THREE.Group>(null)
  const [gone, setGone] = useState(false)
  const [peelDone, setPeelDone] = useState(false)
  const removal = useRef(0)
  const tearLength = useRef(0)
  const lastUv = useRef<THREE.Vector2 | null>(null)

  const { alphaCanvas, alphaTex, mats } = useMemo(() => {
    const alphaCanvas = document.createElement('canvas')
    alphaCanvas.width = 512
    alphaCanvas.height = 512
    const ctx = alphaCanvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 512, 512)
    const alphaTex = new THREE.CanvasTexture(alphaCanvas)
    const base = () =>
      new THREE.MeshPhysicalMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.16,
        roughness: 0.04,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        normalMap: assets.wrapNormal,
        normalScale: new THREE.Vector2(0.22, 0.22),
        envMapIntensity: 2.2,
        specularIntensity: 1.5,
        depthWrite: false,
        side: THREE.FrontSide,
      })
    const side = base()
    const top = base()
    top.alphaMap = alphaTex
    top.normalScale = new THREE.Vector2(0.34, 0.34)
    const mats = [side, side, top, side, side, side]
    return { alphaCanvas, alphaTex, mats }
  }, [assets])

  useEffect(() => () => alphaTex.dispose(), [alphaTex])

  const enabled = interactive && !unbox.wrapTorn
  const drag = useDrag(
    {
      onStart: () => {
        lastUv.current = null
      },
      onMove: ({ event }) => {
        const uv = event.uv
        if (!uv) return
        const ctx = alphaCanvas.getContext('2d')!
        const x = uv.x * 512
        const y = (1 - uv.y) * 512
        if (lastUv.current) {
          const seg = Math.hypot(uv.x - lastUv.current.x, uv.y - lastUv.current.y)
          if (seg < 0.25) {
            tearLength.current += seg
            ctx.strokeStyle = '#000'
            ctx.lineCap = 'round'
            ctx.lineWidth = 9
            ctx.beginPath()
            ctx.moveTo(lastUv.current.x * 512, (1 - lastUv.current.y) * 512)
            // Jagged edge: jitter the midpoint
            const mx = (lastUv.current.x * 512 + x) / 2 + (Math.random() - 0.5) * 10
            const my = ((1 - lastUv.current.y) * 512 + y) / 2 + (Math.random() - 0.5) * 10
            ctx.quadraticCurveTo(mx, my, x, y)
            ctx.stroke()
            // Side notches
            if (Math.random() < 0.25) {
              ctx.lineWidth = 3
              ctx.beginPath()
              ctx.moveTo(x, y)
              ctx.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30)
              ctx.stroke()
            }
            alphaTex.needsUpdate = true
          }
        }
        lastUv.current = uv.clone()
        if (tearLength.current > 0.7) tearWrap()
      },
      onEnd: () => {
        lastUv.current = null
      },
    },
    enabled,
  )

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    if (!unbox.wrapTorn) return
    removal.current = reduced ? 1 : Math.min(1, removal.current + dt / 0.9)
    const t = removal.current
    const ease = 1 - Math.pow(1 - t, 3)
    g.position.y = ease * 14
    g.position.x = ease * 6
    g.rotation.z = ease * 0.9
    g.rotation.x = ease * 0.5
    g.scale.setScalar(1 - ease * 0.55)
    g.scale.y = damp(g.scale.y, 0.25, 6, dt, reduced)
    for (const m of mats) m.opacity = 0.16 * (1 - ease)
    if (t >= 1) setGone(true)
  })

  if (gone) return null
  // Keep the sticker mounted until its curl has played; a torn wrap takes it along instantly.
  const showSticker = !(unbox.stickerPeeled && (peelDone || unbox.wrapTorn))
  return (
    <group ref={group}>
      <mesh
        position={[0, WRAP.h / 2, 0]}
        material={mats}
        renderOrder={5}
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
        <boxGeometry args={[WRAP.w, WRAP.h, WRAP.d]} />
      </mesh>
      {/* Heat-seal seam along the back edge */}
      <mesh position={[0, WRAP.h + 0.01, -WRAP.d / 2 + 0.6]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
        <planeGeometry args={[WRAP.w * 0.96, 0.18]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {showSticker && (
        <group position={[BOX.w / 2 - HYPE.w / 2 - 1.1, WRAP.h + 0.02, -BOX.d / 2 + HYPE.h / 2 + 1.4]} rotation={[-Math.PI / 2, 0, -0.12]}>
          <PeelSticker texture={assets.hype} width={HYPE.w} height={HYPE.h} interactive={interactive && !unbox.wrapTorn} onDone={() => setPeelDone(true)} />
        </group>
      )}
    </group>
  )
}

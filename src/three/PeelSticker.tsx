import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useApp } from '../store'
import { peelSticker } from '../app/actions'
import { useDrag } from './useDrag'
import { damp } from './anim'

const vertex = /* glsl */ `
  uniform float uProgress;
  uniform float uRadius;
  uniform float uHalfWidth;
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vec3 p = position;
    // Fold line sweeps from the +x edge to beyond the -x edge.
    float fold = uHalfWidth - uProgress * (2.0 * uHalfWidth + 3.14159 * uRadius + 0.4);
    float s = p.x - fold;
    if (s > 0.0) {
      float ang = s / uRadius;
      if (ang < 3.14159) {
        p.x = fold + uRadius * sin(ang);
        p.z = uRadius * (1.0 - cos(ang));
      } else {
        p.x = fold - (s - 3.14159 * uRadius);
        p.z = 2.0 * uRadius;
      }
    }
    vec4 world = modelMatrix * vec4(p, 1.0);
    vPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    if (c.a < 0.05) discard;
    vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
    vec3 l = normalize(vec3(0.4, 1.0, 0.6));
    float shade = 0.72 + 0.28 * max(0.0, dot(n, l));
    vec3 col = gl_FrontFacing ? c.rgb : vec3(0.97, 0.96, 0.93);
    gl_FragColor = vec4(col * shade, c.a);
  }
`

interface Props {
  texture: THREE.Texture
  width: number
  height: number
  interactive: boolean
  /** Called once the curl animation has fully played after the sticker was peeled. */
  onDone?: () => void
}

/** Die-cut sticker that curls off its surface as you drag it. */
export function PeelSticker({ texture, width, height, interactive, onDone }: Props) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const unbox = useApp((s) => s.unbox)
  const reduced = useApp((s) => s.reducedMotion)
  const [dragProgress, setDragProgress] = useState(0)
  const progress = useRef(0)
  const done = useRef(false)
  const [hover, setHover] = useState(false)

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uRadius: { value: 0.35 },
      uHalfWidth: { value: width / 2 },
      uMap: { value: texture },
    }),
    [texture, width],
  )

  const drag = useDrag(
    {
      onMove: ({ distance }) => setDragProgress(Math.min(1, distance / 260)),
      onEnd: ({ distance, isClick }) => {
        const p = Math.min(1, distance / 260)
        if (isClick) {
          setDragProgress(0.18)
          window.setTimeout(() => setDragProgress(0), 320)
          return
        }
        if (p > 0.5) peelSticker()
        else setDragProgress(0)
      },
    },
    interactive && !unbox.stickerPeeled,
  )

  useFrame((_, dt) => {
    const target = unbox.stickerPeeled ? 1 : dragProgress
    progress.current = damp(progress.current, target, unbox.stickerPeeled ? 5 : 14, dt, reduced)
    if (mat.current) mat.current.uniforms.uProgress.value = progress.current
    if (unbox.stickerPeeled && !done.current && progress.current > 0.985) {
      done.current = true
      onDone?.()
    }
  })

  return (
    <mesh
      {...drag}
      onPointerOver={(e) => {
        if (!interactive) return
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'grab'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
      renderOrder={7}
      scale={hover ? 1.02 : 1}
    >
      <planeGeometry args={[width, height, 64, 24]} />
      <shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent side={THREE.DoubleSide} />
    </mesh>
  )
}

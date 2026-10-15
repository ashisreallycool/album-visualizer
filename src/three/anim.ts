import * as THREE from 'three'

/** Frame-rate independent damping; snaps when the user prefers reduced motion. */
export function damp(current: number, target: number, lambda: number, dt: number, instant = false): number {
  if (instant) return target
  return THREE.MathUtils.damp(current, target, lambda, Math.min(dt, 0.12))
}

export function dampVec(current: THREE.Vector3, target: THREE.Vector3 | [number, number, number], lambda: number, dt: number, instant = false): void {
  const t = Array.isArray(target) ? target : [target.x, target.y, target.z]
  current.set(damp(current.x, t[0], lambda, dt, instant), damp(current.y, t[1], lambda, dt, instant), damp(current.z, t[2], lambda, dt, instant))
}

export function dampEuler(current: THREE.Euler, target: [number, number, number], lambda: number, dt: number, instant = false): void {
  current.set(damp(current.x, target[0], lambda, dt, instant), damp(current.y, target[1], lambda, dt, instant), damp(current.z, target[2], lambda, dt, instant))
}

const _q = new THREE.Quaternion()
export function dampQuat(current: THREE.Quaternion, target: THREE.Quaternion, lambda: number, dt: number, instant = false): void {
  if (instant) {
    current.copy(target)
    return
  }
  const t = 1 - Math.exp(-lambda * Math.min(dt, 0.12))
  current.slerp(_q.copy(target), t)
}

export function near(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) < eps
}

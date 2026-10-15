import { useCallback, useSyncExternalStore } from 'react'
import type * as THREE from 'three'

/** Surfaces stickers may be dropped on, keyed by a stable id. */
const registry = new Map<string, THREE.Object3D>()
const listeners = new Set<() => void>()
let version = 0

function notify() {
  version++
  listeners.forEach((l) => l())
}

export function registerStickable(id: string, object: THREE.Object3D | null): void {
  if (object) {
    object.userData.stickableId = id
    registry.set(id, object)
  } else registry.delete(id)
  notify()
}

export function stickableObjects(): THREE.Object3D[] {
  return [...registry.values()]
}

export function getStickable(id: string): THREE.Object3D | undefined {
  return registry.get(id)
}

export function useStickableRegistry(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => version,
  )
}

/** Ref callback that registers a mesh as a stickable surface. */
export function useStickable(id: string): (object: THREE.Object3D | null) => void {
  return useCallback((object: THREE.Object3D | null) => registerStickable(id, object), [id])
}

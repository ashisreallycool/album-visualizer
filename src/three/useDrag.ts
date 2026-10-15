import { useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useApp } from '../store'

export interface DragInfo {
  dx: number
  dy: number
  distance: number
  isClick: boolean
  event: ThreeEvent<PointerEvent>
}

export interface DragHandlers {
  /** Return false to ignore this pointer-down. */
  onStart?: (event: ThreeEvent<PointerEvent>) => boolean | void
  onMove?: (info: DragInfo) => void
  onEnd?: (info: DragInfo) => void
}

const CLICK_THRESHOLD = 6

/**
 * Pointer-capture based drag for meshes. Disables camera controls while active and
 * reports clicks (tiny drags) so a tap can toggle the same object.
 */
export function useDrag(handlers: DragHandlers, enabled = true) {
  const state = useRef<{ active: boolean; startX: number; startY: number; pointerId: number }>({ active: false, startX: 0, startY: 0, pointerId: -1 })

  const info = (e: ThreeEvent<PointerEvent>): DragInfo => {
    const dx = e.nativeEvent.clientX - state.current.startX
    const dy = e.nativeEvent.clientY - state.current.startY
    const distance = Math.hypot(dx, dy)
    return { dx, dy, distance, isClick: distance < CLICK_THRESHOLD, event: e }
  }

  const finish = (e: ThreeEvent<PointerEvent>) => {
    if (!state.current.active) return
    state.current.active = false
    try {
      ;(e.target as Element | null)?.releasePointerCapture?.(e.pointerId)
    } catch {
      // Capture may already be gone.
    }
    useApp.getState().setDragging(false)
    handlers.onEnd?.(info(e))
  }

  return {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (!enabled) return
      if (e.nativeEvent.button !== undefined && e.nativeEvent.button !== 0) return
      e.stopPropagation()
      if (handlers.onStart?.(e) === false) return
      // Keep the camera controls (listening on the same canvas) from starting an orbit.
      e.nativeEvent.stopImmediatePropagation()
      state.current = { active: true, startX: e.nativeEvent.clientX, startY: e.nativeEvent.clientY, pointerId: e.pointerId }
      try {
        ;(e.target as Element | null)?.setPointerCapture?.(e.pointerId)
      } catch {
        // Some browsers refuse capture on synthetic events; drag still works while hovering.
      }
      useApp.getState().setDragging(true)
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      if (!state.current.active) return
      e.stopPropagation()
      handlers.onMove?.(info(e))
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      if (!state.current.active) return
      e.stopPropagation()
      finish(e)
    },
    onPointerCancel: (e: ThreeEvent<PointerEvent>) => finish(e),
    onLostPointerCapture: (e: ThreeEvent<PointerEvent>) => finish(e),
  }
}

/** Raycast-disabling stub for meshes that should be visible but inert. */
export const noRaycast = () => null

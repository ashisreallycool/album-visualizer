import type { Focus } from '../store'

export interface CameraPreset {
  pos: [number, number, number]
  target: [number, number, number]
}

export const CAMERA_PRESETS: Record<Focus, CameraPreset> = {
  overview: { pos: [0, 24, 34], target: [0, 1.5, 0] },
  lid: { pos: [2, 19, 25], target: [0, 2, -1] },
  inside: { pos: [0, 27, 13], target: [0, 1, 0] },
  book: { pos: [-10, 16, 42], target: [-10, 7.5, 5] },
  cards: { pos: [4, 13, 32], target: [4, 7, 2] },
  disc: { pos: [12, 13, 17], target: [12, 4, -5] },
  addin: { pos: [4, 14, 12], target: [3.2, 1.2, -2.6] },
  stickers: { pos: [2.6, 15, 14], target: [2.6, 0.6, 3.2] },
  card: { pos: [-2, 12, 9], target: [-2.2, 3, -2.5] },
}

/**
 * Phone screens need the camera further back to fit the box; wide screens keep the
 * inclusions panel on the right, so the subject shifts left of centre.
 */
export function presetFor(focus: Focus, aspect: number, width: number): CameraPreset {
  const p = CAMERA_PRESETS[focus]
  const shift = width >= 1024 ? 3 : 0
  const k = aspect >= 0.9 ? 1 : 1 + (0.9 - aspect) * 1.6
  const pos: [number, number, number] = [
    p.target[0] + (p.pos[0] - p.target[0]) * k + shift,
    p.target[1] + (p.pos[1] - p.target[1]) * k,
    p.target[2] + (p.pos[2] - p.target[2]) * k,
  ]
  return { pos, target: [p.target[0] + shift, p.target[1], p.target[2]] }
}

import { create } from 'zustand'
import type { ListeningProfile } from './analysis/types'

export type Phase = 'landing' | 'authorizing' | 'loading' | 'stage' | 'error'

export type Focus = 'overview' | 'lid' | 'inside' | 'book' | 'cards' | 'disc' | 'addin' | 'stickers' | 'card'

export type InspectId = 'cover' | 'book' | 'cards' | 'disc' | 'addin' | 'stickers' | 'card' | 'hype'

export interface PlacedSticker {
  id: string
  stickerId: string
  surface: string
  position: [number, number, number]
  quaternion: [number, number, number, number]
  rotation: number
  scale: number
}

export interface Toast {
  id: number
  text: string
  tone?: 'info' | 'success' | 'error'
}

export interface UnboxState {
  stickerPeeled: boolean
  wrapTorn: boolean
  lidOpen: boolean
  bookOut: boolean
  page: number
  cardsPulled: number
  cardFlipped: Record<number, boolean>
  discOut: boolean
  discInPlayer: boolean
  playing: boolean
  addInUsed: boolean
  photosTaken: number
  stickersPlaced: PlacedSticker[]
  /** Stickers lifted off their sheet and now in the tray (not placed). */
  tray: string[]
  shared: boolean
}

const initialUnbox: UnboxState = {
  stickerPeeled: false,
  wrapTorn: false,
  lidOpen: false,
  bookOut: false,
  page: 0,
  cardsPulled: 0,
  cardFlipped: {},
  discOut: false,
  discInPlayer: false,
  playing: false,
  addInUsed: false,
  photosTaken: 0,
  stickersPlaced: [],
  tray: [],
  shared: false,
}

export interface AppState {
  phase: Phase
  error: string | null
  progress: string[]
  profile: ListeningProfile | null
  demoPersonaId: string | null
  focus: Focus
  dragging: boolean
  inspect: InspectId | null
  statsOpen: boolean
  shareOpen: boolean
  setupOpen: boolean
  reducedMotion: boolean
  toasts: Toast[]
  unbox: UnboxState
  /** Bumped on every re-wrap so the 3D album remounts in its sealed state. */
  epoch: number
  /** Which sticker (by id) is currently being dragged, for HUD hints. */
  liftedSticker: string | null

  setPhase: (phase: Phase, error?: string | null) => void
  pushProgress: (label: string) => void
  setProfile: (profile: ListeningProfile | null) => void
  setDemoPersona: (id: string | null) => void
  setFocus: (focus: Focus) => void
  setDragging: (dragging: boolean) => void
  setInspect: (id: InspectId | null) => void
  setStatsOpen: (open: boolean) => void
  setShareOpen: (open: boolean) => void
  setSetupOpen: (open: boolean) => void
  setReducedMotion: (value: boolean) => void
  toast: (text: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
  update: (patch: Partial<UnboxState>) => void
  flipCard: (index: number) => void
  placeSticker: (sticker: PlacedSticker) => void
  removeSticker: (id: string) => void
  setLiftedSticker: (id: string | null) => void
  resetUnbox: () => void
}

let toastId = 0

export const useApp = create<AppState>((set, get) => ({
  phase: 'landing',
  error: null,
  progress: [],
  profile: null,
  demoPersonaId: null,
  focus: 'overview',
  dragging: false,
  inspect: null,
  statsOpen: false,
  shareOpen: false,
  setupOpen: false,
  reducedMotion: typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  toasts: [],
  unbox: initialUnbox,
  epoch: 0,
  liftedSticker: null,

  setPhase: (phase, error = null) => set({ phase, error }),
  pushProgress: (label) => set((s) => ({ progress: [...s.progress, label] })),
  setProfile: (profile) => set({ profile }),
  setDemoPersona: (id) => set({ demoPersonaId: id }),
  setFocus: (focus) => set({ focus }),
  setDragging: (dragging) => set({ dragging }),
  setInspect: (inspect) => set({ inspect }),
  setStatsOpen: (statsOpen) => set({ statsOpen }),
  setShareOpen: (shareOpen) => set({ shareOpen }),
  setSetupOpen: (setupOpen) => set({ setupOpen }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  toast: (text, tone = 'info') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts.slice(-1), { id, text, tone }] }))
    window.setTimeout(() => get().dismissToast(id), 4200)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  update: (patch) => set((s) => ({ unbox: { ...s.unbox, ...patch } })),
  flipCard: (index) => set((s) => ({ unbox: { ...s.unbox, cardFlipped: { ...s.unbox.cardFlipped, [index]: !s.unbox.cardFlipped[index] } } })),
  placeSticker: (sticker) =>
    set((s) => ({
      unbox: {
        ...s.unbox,
        stickersPlaced: [...s.unbox.stickersPlaced.filter((p) => p.stickerId !== sticker.stickerId), sticker],
        tray: s.unbox.tray.filter((t) => t !== sticker.stickerId),
      },
    })),
  removeSticker: (id) => set((s) => ({ unbox: { ...s.unbox, stickersPlaced: s.unbox.stickersPlaced.filter((p) => p.id !== id) } })),
  setLiftedSticker: (liftedSticker) => set({ liftedSticker }),
  resetUnbox: () => set((s) => ({ unbox: initialUnbox, focus: 'overview', inspect: null, liftedSticker: null, epoch: s.epoch + 1 })),
}))

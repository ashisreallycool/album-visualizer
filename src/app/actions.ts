/**
 * High-level unboxing actions. Both the 3D gestures and the HUD buttons call these,
 * so every drag has a one-click/keyboard equivalent.
 */
import { useApp, type Focus, type InspectId } from '../store'
import { assetsRef } from '../textures/assets'

const s = () => useApp.getState()

export function focusOn(focus: Focus): void {
  s().setFocus(focus)
}

export function openInspect(id: InspectId): void {
  s().setInspect(id)
}

export function peelSticker(): void {
  const { unbox, update, toast } = s()
  if (unbox.stickerPeeled) return
  update({ stickerPeeled: true, tray: [...unbox.tray, 'hype'] })
  toast('Hype sticker peeled. It is in your tray — stick it anywhere later.', 'success')
}

export function tearWrap(): void {
  const { unbox, update, toast, setFocus } = s()
  if (unbox.wrapTorn) return
  const tray = unbox.stickerPeeled ? unbox.tray : [...unbox.tray, 'hype']
  update({ wrapTorn: true, stickerPeeled: true, tray })
  if (!unbox.stickerPeeled) toast('Wrap torn. The hype sticker came off with it and landed in your tray.', 'success')
  else toast('Wrap torn open.', 'success')
  setFocus('lid')
}

export function openLid(): void {
  const { unbox, update, setFocus, toast } = s()
  if (!unbox.wrapTorn) {
    toast('Tear the shrink wrap first.')
    return
  }
  if (unbox.lidOpen) return
  update({ lidOpen: true })
  setFocus('inside')
}

export function closeLid(): void {
  const { unbox, update, setFocus } = s()
  if (unbox.bookOut) return
  update({ lidOpen: false })
  setFocus('lid')
}

export function takeBook(): void {
  const { unbox, update, setFocus, toast } = s()
  if (!unbox.lidOpen) {
    toast('Open the lid first.')
    return
  }
  if (unbox.bookOut) {
    setFocus('book')
    return
  }
  update({ bookOut: true, page: 0 })
  setFocus('book')
}

export function nextPage(): void {
  const { unbox, update } = s()
  if (!unbox.bookOut) return
  update({ page: Math.min(4, unbox.page + 1) })
}

export function prevPage(): void {
  const { unbox, update } = s()
  if (!unbox.bookOut) return
  update({ page: Math.max(0, unbox.page - 1) })
}

export function pullCard(): void {
  const { unbox, update, setFocus, toast } = s()
  if (!unbox.bookOut) {
    toast('Lift the photobook out first.')
    return
  }
  if (unbox.cardsPulled >= 5) {
    setFocus('cards')
    return
  }
  const next = unbox.cardsPulled + 1
  update({ cardsPulled: next })
  setFocus('cards')
  const profile = s().profile
  const artist = profile?.artists[next - 1]
  if (artist) toast(next === 1 ? `Pulled #1 — ${artist.name}. Holo edition.` : `Pulled #${next} — ${artist.name}.`, 'success')
}

export function slideDisc(): void {
  const { unbox, update, setFocus, toast } = s()
  if (!unbox.bookOut) {
    toast('Lift the photobook out first.')
    return
  }
  if (unbox.discOut) {
    setFocus('disc')
    return
  }
  update({ discOut: true })
  setFocus('disc')
}

/** Use whichever add-in the listener earned. */
export function useAddIn(): void {
  const { unbox, update, setFocus, toast, profile } = s()
  if (!unbox.bookOut) {
    toast('Lift the photobook out first.')
    return
  }
  const addIn = profile?.addIn ?? 'cd-player'
  if (addIn === 'cd-player') {
    if (!unbox.discOut) {
      toast('Slide the disc out of its sleeve first.')
      setFocus('disc')
      return
    }
    if (!unbox.discInPlayer) {
      update({ discInPlayer: true, playing: true, addInUsed: true })
      toast(`Now spinning: ${profile?.tracks[0]?.name ?? 'track 01'}.`, 'success')
    } else update({ playing: !unbox.playing })
    setFocus('addin')
    return
  }
  if (addIn === 'digicam') {
    update({ photosTaken: unbox.photosTaken + 1, addInUsed: true })
    setFocus('addin')
    return
  }
  update({ addInUsed: true })
  setFocus('addin')
  s().setInspect('addin')
}

/** Keyboard/one-click alternative to dragging a sticker: place it on the cover. */
export function stickDefault(stickerId?: string): void {
  const { unbox, placeSticker, toast, setFocus, update } = s()
  const assets = assetsRef.current
  if (!assets) return
  const placedIds = new Set(unbox.stickersPlaced.map((p) => p.stickerId))
  const candidate = stickerId ?? unbox.tray.find((id) => !placedIds.has(id)) ?? assets.stickers.find((st) => st.slot && !placedIds.has(st.id))?.id
  if (!candidate) {
    toast('Every sticker is already on the album.')
    return
  }
  const n = unbox.stickersPlaced.length
  const col = n % 3
  const row = Math.floor(n / 3) % 3
  // Target a surface the camera can see: the photobook cover once it is out, else the box front.
  const onBook = unbox.bookOut
  placeSticker({
    id: `${candidate}-${Date.now()}`,
    stickerId: candidate,
    surface: onBook ? 'book' : 'base',
    position: onBook ? [-3 + col * 3, 3 - row * 3, 0.13] : [-4 + col * 4, 1.4, 7.03],
    quaternion: [0, 0, 0, 1],
    rotation: (Math.random() - 0.5) * 0.4,
    scale: 2.3,
  })
  if (onBook) update({ page: 0 })
  setFocus(onBook ? 'book' : 'overview')
  toast(onBook ? 'Stuck on the photobook cover. Tap a sticker to peel it back off.' : 'Stuck on the front of the box. Tap a sticker to peel it back off.', 'success')
}

export function markShared(): void {
  s().update({ shared: true })
}

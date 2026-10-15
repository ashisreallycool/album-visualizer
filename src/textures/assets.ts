import * as THREE from 'three'
import type { ListeningProfile } from '../analysis/types'
import { THEMES, ensureThemeFonts, type Theme } from '../themes'
import { seededRng } from '../lib/rng'
import { paintCover } from './cover'
import { loadImageOrFallback, proceduralPortrait } from './images'
import { paintBookPages, paintListenerCard, paintPhotocardBack, paintPhotocardFront, paintStickerSheet, type StickerSlot } from './inserts'
import {
  paintBack,
  paintDiscBottom,
  paintDiscLabel,
  paintHypeSticker,
  paintLidInner,
  paintPassportTag,
  paintSleeve,
  paintSpine,
  paintWrapNormal,
} from './parts'

export interface StickerAsset {
  id: string
  label: string
  canvas: HTMLCanvasElement
  texture: THREE.CanvasTexture
  slot?: StickerSlot
}

export interface AlbumAssets {
  theme: Theme
  profile: ListeningProfile
  images: CanvasImageSource[]
  albumArt: CanvasImageSource[]
  coverCanvas: HTMLCanvasElement
  discCanvas: HTMLCanvasElement
  cardCanvases: HTMLCanvasElement[]
  cover: THREE.CanvasTexture
  back: THREE.CanvasTexture
  lidInner: THREE.CanvasTexture
  spine: THREE.CanvasTexture
  sleeve: THREE.CanvasTexture
  sleeveAlpha: THREE.CanvasTexture
  discLabel: THREE.CanvasTexture
  discBottom: THREE.CanvasTexture
  hype: THREE.CanvasTexture
  wrapNormal: THREE.CanvasTexture
  listenerCard: THREE.CanvasTexture
  sheet: THREE.CanvasTexture
  tag: THREE.CanvasTexture
  stickers: StickerAsset[]
  cards: Array<{ front: THREE.CanvasTexture; back: THREE.CanvasTexture }>
  pages: THREE.CanvasTexture[]
  all: THREE.Texture[]
}

function colorTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function dataTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas)
  t.anisotropy = 4
  return t
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

export type AssetProgress = (label: string) => void

export async function buildAlbumAssets(profile: ListeningProfile, report: AssetProgress = () => {}): Promise<AlbumAssets> {
  const theme = THEMES[profile.theme]
  report('Loading type')
  await ensureThemeFonts(theme)

  report('Collecting artwork')
  const images: CanvasImageSource[] = await Promise.all(
    profile.artists.slice(0, 5).map((a) => loadImageOrFallback(a.imageUrl, `${profile.user.id}:${a.id}`, a.name)),
  )
  while (images.length < 5) images.push(proceduralPortrait(`${profile.user.id}:filler:${images.length}`, profile.artistName))
  const albumArt: CanvasImageSource[] = await Promise.all(
    profile.tracks.slice(0, 10).map((t) => loadImageOrFallback(t.albumImageUrl, `${profile.user.id}:${t.id}`, t.album || t.name, 256)),
  )

  const rng = seededRng(`${profile.user.id}:${profile.theme}`)
  const all: THREE.Texture[] = []
  const keep = <T extends THREE.Texture>(t: T): T => {
    all.push(t)
    return t
  }

  report('Pressing the cover')
  await nextFrame()
  const coverCanvas = paintCover({ theme, profile, images, rng })
  const cover = keep(colorTexture(coverCanvas))

  report('Printing the packaging')
  await nextFrame()
  const back = keep(colorTexture(paintBack({ theme, profile, rng })))
  const lidInner = keep(colorTexture(paintLidInner({ theme, profile, rng })))
  const spine = keep(colorTexture(paintSpine({ theme, profile, rng })))
  const sleeveCanvases = paintSleeve({ theme, profile, rng })
  const sleeve = keep(colorTexture(sleeveCanvases.color))
  const sleeveAlpha = keep(dataTexture(sleeveCanvases.alpha))
  const hype = keep(colorTexture(paintHypeSticker({ theme, profile, rng })))
  const wrapNormal = keep(dataTexture(paintWrapNormal(rng)))
  wrapNormal.wrapS = wrapNormal.wrapT = THREE.RepeatWrapping

  report('Cutting the disc')
  await nextFrame()
  const discCanvas = paintDiscLabel({ theme, profile, rng })
  const discLabel = keep(colorTexture(discCanvas))
  const discBottom = keep(colorTexture(paintDiscBottom()))

  report('Printing photocards')
  await nextFrame()
  const insertInput = { theme, profile, rng, images, albumArt }
  const cardCanvases: HTMLCanvasElement[] = []
  const cards = Array.from({ length: 5 }, (_, i) => {
    const front = paintPhotocardFront(insertInput, i)
    cardCanvases.push(front)
    return { front: keep(colorTexture(front)), back: keep(colorTexture(paintPhotocardBack(insertInput, i))) }
  })

  report('Die-cutting stickers')
  await nextFrame()
  const sheetResult = paintStickerSheet(insertInput)
  const sheet = keep(colorTexture(sheetResult.sheet))
  const stickers: StickerAsset[] = sheetResult.stickers.map((s) => ({
    id: s.id,
    label: s.label,
    canvas: s.canvas,
    texture: keep(colorTexture(s.canvas)),
    slot: sheetResult.slots.find((slot) => slot.id === s.id),
  }))
  stickers.push({ id: 'hype', label: 'Hype sticker', canvas: hype.image as HTMLCanvasElement, texture: hype })

  report('Binding the photobook')
  await nextFrame()
  const pages = paintBookPages(insertInput).map((p) => keep(colorTexture(p)))
  const listenerCard = keep(colorTexture(paintListenerCard(insertInput)))
  const tag = keep(colorTexture(paintPassportTag({ theme, profile, rng })))

  return {
    theme,
    profile,
    images,
    albumArt,
    coverCanvas,
    discCanvas,
    cardCanvases,
    cover,
    back,
    lidInner,
    spine,
    sleeve,
    sleeveAlpha,
    discLabel,
    discBottom,
    hype,
    wrapNormal,
    listenerCard,
    sheet,
    tag,
    stickers,
    cards,
    pages,
    all,
  }
}

export function disposeAssets(assets: AlbumAssets | null): void {
  if (!assets) return
  for (const t of assets.all) t.dispose()
}

/** Assets live outside React state: they are large and mutate on the GPU. */
export const assetsRef: { current: AlbumAssets | null } = { current: null }

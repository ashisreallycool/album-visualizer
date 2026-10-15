import type { ListeningProfile } from '../analysis/types'
import type { Theme } from '../themes/types'
import { readableOn, withAlpha, mix } from '../lib/colors'
import { formatDuration, formatHour, formatNumber } from '../lib/format'
import type { Rng } from '../lib/rng'
import { barcode, drawCover, fitText, grain, holoGradient, makeCanvas, metallicGradient, roundRect, stamp, wrap, type Ctx } from './paint'

export interface PartInput {
  theme: Theme
  profile: ListeningProfile
  rng: Rng
}

function paperBackground(ctx: Ctx, theme: Theme, w: number, h: number, rng: Rng): void {
  const c = theme.colors
  if (theme.id === 'velvet') {
    const g = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) * 0.8)
    g.addColorStop(0, mix(c.paper, '#ffffff', 0.12))
    g.addColorStop(1, '#1A0409')
    ctx.fillStyle = g
  } else if (theme.id === 'coquette') {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#F6F2FC')
    g.addColorStop(1, c.paper)
    ctx.fillStyle = g
  } else {
    ctx.fillStyle = c.paper
  }
  ctx.fillRect(0, 0, w, h)
  grain(ctx, w, h, theme.id === 'acid' || theme.id === 'coquette' ? 0.06 : 0.14, rng)
}

/** Text color that reads on the theme paper. */
export function inkFor(theme: Theme): string {
  return readableOn(theme.colors.paper, [theme.colors.ink, '#111111', '#F7F4EE'])
}

/** Back cover / tracklist. */
export function paintBack({ theme, profile, rng }: PartInput): HTMLCanvasElement {
  const S = 1024
  const { canvas, ctx } = makeCanvas(S, S)
  const c = theme.colors
  paperBackground(ctx, theme, S, S, rng)
  const ink = inkFor(theme)

  ctx.fillStyle = ink
  ctx.font = `${theme.fonts.displayWeight} 44px ${theme.fonts.display}`
  ctx.textBaseline = 'top'
  ctx.fillText(profile.albumTitle, 72, 60, 620)
  ctx.font = `400 20px ${theme.fonts.accent}`
  ctx.fillText(`${profile.artistName}  ·  ${profile.persona.short} ${theme.versionSuffix}`, 72, 118, 620)

  const sideA = profile.tracks.slice(0, 6)
  const sideB = profile.recentTracks.filter((t) => !sideA.some((a) => a.id === t.id)).slice(0, 6)
  const list = (title: string, items: typeof sideA, y: number) => {
    ctx.fillStyle = c.accent
    ctx.fillRect(72, y, 54, 4)
    ctx.fillStyle = ink
    ctx.font = `700 18px "Space Grotesk Variable", sans-serif`
    ctx.fillText(title, 72, y + 12)
    let yy = y + 46
    items.forEach((t, i) => {
      ctx.font = `400 15px ${theme.fonts.accent}`
      ctx.fillStyle = withAlpha(ink, 0.7)
      ctx.fillText((i + 1).toString().padStart(2, '0'), 72, yy)
      ctx.fillStyle = ink
      ctx.font = `500 22px ${theme.fonts.body}`
      ctx.fillText(t.name, 112, yy - 3, 560)
      ctx.font = `400 15px ${theme.fonts.accent}`
      ctx.fillStyle = withAlpha(ink, 0.7)
      ctx.fillText(t.artist, 112, yy + 24, 560)
      ctx.textAlign = 'right'
      ctx.fillText(formatDuration(t.durationMs), 740, yy)
      ctx.textAlign = 'left'
      yy += 56
    })
    return yy
  }
  let y = list('SIDE A — THE YEAR', sideA, 180)
  y = list('SIDE B — RIGHT NOW', sideB.length ? sideB : profile.tracks.slice(6, 12), y + 24)

  // Credits
  ctx.fillStyle = withAlpha(ink, 0.85)
  ctx.font = `400 15px ${theme.fonts.accent}`
  const credits = [
    `Produced by ${profile.artistName}. Recorded ${profile.stats.nightShare >= 0.25 ? 'mostly after midnight' : `around ${formatHour(profile.stats.peakHour)}`}.`,
    `Mixed in ${profile.user.country ?? 'the browser'} across ${profile.stats.distinctArtists} artists and ${profile.stats.distinctGenres} genres.`,
    `℗ ${new Date().getFullYear()} ${profile.artistName} Records. ${profile.catalog}. Unauthorised replaying is encouraged.`,
  ]
  credits.forEach((line, i) => ctx.fillText(line, 72, 905 + i * 22, 640))

  // Barcode + catalog
  const barColor = readableOn(c.paper, ['#000000', '#ffffff'])
  ctx.fillStyle = barColor === '#000000' ? '#ffffff' : '#000000'
  ctx.fillRect(772, 876, 180, 84)
  barcode(ctx, String(profile.stats.yearMinutes || 240000).padStart(12, '0'), 784, 886, 156, 50, barColor)
  ctx.fillStyle = barColor
  ctx.font = `400 13px "Space Mono", monospace`
  ctx.textAlign = 'center'
  ctx.fillText(profile.catalog, 862, 942)
  ctx.textAlign = 'left'

  // Explicit badge
  if (profile.stats.explicitShare >= 0.4) {
    ctx.fillStyle = '#111'
    ctx.fillRect(772, 780, 180, 80)
    ctx.fillStyle = '#fff'
    ctx.font = `700 14px "Space Grotesk Variable", sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('PARENTAL', 862, 798)
    ctx.fillText('ADVISORY', 862, 816)
    ctx.font = `400 11px "Space Grotesk Variable", sans-serif`
    ctx.fillText('EXPLICIT CONTENT', 862, 840)
    ctx.textAlign = 'left'
  }
  return canvas
}

/** Inside of the lid: liner notes + thank-yous. */
export function paintLidInner({ theme, profile, rng }: PartInput): HTMLCanvasElement {
  const S = 1024
  const { canvas, ctx } = makeCanvas(S, S)
  paperBackground(ctx, theme, S, S, rng)
  const ink = inkFor(theme)
  const c = theme.colors
  ctx.fillStyle = ink
  ctx.font = `${theme.fonts.displayWeight} 72px ${theme.fonts.display}`
  ctx.textBaseline = 'top'
  const t = fitText(ctx, profile.persona.title, { maxWidth: 880, maxSize: 96, minSize: 48, weight: theme.fonts.displayWeight, family: theme.fonts.display, maxLines: 2 })
  ctx.font = `${theme.fonts.displayWeight} ${t.size}px ${theme.fonts.display}`
  t.lines.forEach((l, i) => ctx.fillText(l, 72, 72 + i * t.size * 1.05))
  let y = 72 + t.lines.length * t.size * 1.05 + 16
  ctx.font = `italic 400 28px ${theme.fonts.body}`
  ctx.fillStyle = withAlpha(ink, 0.85)
  ctx.fillText(profile.persona.tagline, 72, y, 880)
  y += 70
  ctx.fillStyle = c.accent
  ctx.fillRect(72, y, 80, 4)
  y += 28
  ctx.fillStyle = ink
  ctx.font = `400 24px ${theme.fonts.body}`
  const lines = wrap(ctx, profile.linerNotes, 880)
  lines.forEach((l, i) => ctx.fillText(l, 72, y + i * 34))
  y += lines.length * 34 + 40

  ctx.font = `700 16px "Space Grotesk Variable", sans-serif`
  ctx.fillStyle = withAlpha(ink, 0.7)
  ctx.fillText('WITH THANKS TO', 72, y)
  y += 30
  ctx.font = `400 22px ${theme.fonts.accent}`
  ctx.fillStyle = ink
  const names = profile.artists.slice(0, 12).map((a) => a.name)
  const thanks = wrap(ctx, names.join('  ·  '), 880)
  thanks.forEach((l, i) => ctx.fillText(l, 72, y + i * 32))
  stamp(ctx, 860, 880, 84, c.accent, `${theme.name} · ${new Date().getFullYear()} · `, profile.catalog.slice(-4), theme.fonts.accent, rng)
  return canvas
}

/** Long thin strip for the box sides. */
export function paintSpine({ theme, profile }: PartInput): HTMLCanvasElement {
  const W = 1024
  const H = 128
  const { canvas, ctx } = makeCanvas(W, H)
  const c = theme.colors
  ctx.fillStyle = c.paper
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = c.accent
  ctx.fillRect(0, 0, 18, H)
  const ink = inkFor(theme)
  ctx.fillStyle = ink
  ctx.textBaseline = 'middle'
  ctx.font = `${theme.fonts.displayWeight} 44px ${theme.fonts.display}`
  ctx.fillText(profile.albumTitle, 48, H / 2, 520)
  ctx.font = `400 20px ${theme.fonts.accent}`
  ctx.textAlign = 'right'
  ctx.fillText(`${profile.artistName}  ·  ${profile.catalog}`, W - 40, H / 2, 400)
  return canvas
}

/** CD paper sleeve with a circular window. Returns colour + alpha canvases. */
export function paintSleeve({ theme, profile, rng }: PartInput): { color: HTMLCanvasElement; alpha: HTMLCanvasElement } {
  const S = 1024
  const { canvas, ctx } = makeCanvas(S, S)
  const alphaC = makeCanvas(S, S)
  paperBackground(ctx, theme, S, S, rng)
  const ink = inkFor(theme)
  ctx.strokeStyle = withAlpha(ink, 0.5)
  ctx.lineWidth = 3
  ctx.setLineDash([8, 8])
  ctx.beginPath()
  ctx.arc(S / 2, S / 2 + 60, 330, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = ink
  ctx.font = `700 18px "Space Grotesk Variable", sans-serif`
  ctx.textBaseline = 'top'
  ctx.fillText('COMPACT DISC · HANDLE BY THE EDGES', 72, 60)
  ctx.font = `${theme.fonts.displayWeight} 54px ${theme.fonts.display}`
  ctx.fillText(profile.albumTitle, 72, 96, 740)
  ctx.font = `400 20px ${theme.fonts.accent}`
  ctx.fillText(`${profile.artistName} · ${formatNumber(profile.stats.yearMinutes || 0)} minutes pressed at this pace`, 72, 170, 800)
  ctx.font = `400 14px "Space Mono", monospace`
  ctx.textAlign = 'right'
  ctx.fillText(profile.catalog, S - 72, 60)

  // Alpha: white opaque, black transparent window
  const a = alphaC.ctx
  a.fillStyle = '#fff'
  a.fillRect(0, 0, S, S)
  a.fillStyle = '#000'
  a.beginPath()
  a.arc(S / 2, S / 2 + 60, 318, 0, Math.PI * 2)
  a.fill()
  return { color: canvas, alpha: alphaC.canvas }
}

/** Top (label) side of the disc. */
export function paintDiscLabel({ theme, profile }: PartInput): HTMLCanvasElement {
  const S = 1024
  const { canvas, ctx } = makeCanvas(S, S)
  const c = theme.colors
  const cx = S / 2
  // Rainbow data area under a tinted label
  ctx.fillStyle = holoGradient(ctx, 0, 0, S, S)
  ctx.beginPath()
  ctx.arc(cx, cx, S / 2, 0, Math.PI * 2)
  ctx.fill()
  const tint = ctx.createRadialGradient(cx, cx, 120, cx, cx, S / 2)
  tint.addColorStop(0, withAlpha(c.disc, 0.98))
  tint.addColorStop(0.62, withAlpha(c.disc, 0.96))
  tint.addColorStop(0.64, withAlpha(c.disc, 0.35))
  tint.addColorStop(1, withAlpha(c.disc, 0.15))
  ctx.fillStyle = tint
  ctx.beginPath()
  ctx.arc(cx, cx, S / 2, 0, Math.PI * 2)
  ctx.fill()
  // Grooves
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1
  for (let r = 140; r < S / 2; r += 9) {
    ctx.beginPath()
    ctx.arc(cx, cx, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  const ink = readableOn(c.disc, [c.ink, '#111111', '#FFFFFF'])
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const t = fitText(ctx, profile.albumTitle, { maxWidth: 440, maxSize: 70, minSize: 30, weight: theme.fonts.displayWeight, family: theme.fonts.display, maxLines: 2 })
  ctx.font = `${theme.fonts.displayWeight} ${t.size}px ${theme.fonts.display}`
  t.lines.forEach((l, i) => ctx.fillText(l, cx, 300 + i * t.size * 1.05))
  ctx.font = `400 22px ${theme.fonts.accent}`
  ctx.fillText(profile.artistName, cx, 300 + t.lines.length * t.size * 1.05 + 10)
  ctx.font = `400 15px "Space Mono", monospace`
  ctx.fillText(`${profile.tracks.length} TRACKS · ${profile.catalog}`, cx, 700)
  ctx.fillText(`TOP ARTIST: ${(profile.artists[0]?.name ?? '').toUpperCase()}`, cx, 724)
  // Ring text around the hub
  ctx.save()
  ctx.translate(cx, cx)
  const ring = `${profile.persona.title.toUpperCase()} · ${theme.versionSuffix.toUpperCase()} · `
  ctx.font = `700 14px "Space Grotesk Variable", sans-serif`
  const chars = ring.split('')
  chars.forEach((ch, i) => {
    const a = (i / chars.length) * Math.PI * 2
    ctx.save()
    ctx.rotate(a)
    ctx.translate(0, -150)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  })
  ctx.restore()
  // Hub clear ring
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.beginPath()
  ctx.arc(cx, cx, 118, 0, Math.PI * 2)
  ctx.arc(cx, cx, 76, 0, Math.PI * 2, true)
  ctx.fill()
  return canvas
}

/** Data side of the disc: mirror rainbow. */
export function paintDiscBottom(): HTMLCanvasElement {
  const S = 512
  const { canvas, ctx } = makeCanvas(S, S)
  ctx.fillStyle = '#d9dce3'
  ctx.fillRect(0, 0, S, S)
  ctx.globalAlpha = 0.7
  ctx.fillStyle = holoGradient(ctx, 0, 0, S, S)
  ctx.fillRect(0, 0, S, S)
  ctx.globalAlpha = 1
  for (let r = 60; r < S / 2; r += 5) {
    ctx.strokeStyle = r % 10 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)'
    ctx.beginPath()
    ctx.arc(S / 2, S / 2, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  return canvas
}

/** Hype sticker that sits on the shrink wrap. */
export function paintHypeSticker({ theme, profile }: PartInput): HTMLCanvasElement {
  const W = 640
  const H = 320
  const { canvas, ctx } = makeCanvas(W, H)
  const c = theme.colors
  const bg = theme.id === 'velvet' ? c.foil : theme.id === 'concrete' ? c.accent : theme.id === 'newsprint' ? c.accent : c.accent
  ctx.fillStyle = bg
  roundRect(ctx, 6, 6, W - 12, H - 12, 60)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 6
  ctx.setLineDash([14, 10])
  roundRect(ctx, 22, 22, W - 44, H - 44, 48)
  ctx.stroke()
  ctx.setLineDash([])
  const ink = readableOn(bg)
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 22px "Space Grotesk Variable", sans-serif`
  ctx.fillText('FEATURING THE HIT SINGLE', W / 2, 70)
  const top = profile.tracks[0]
  const t = fitText(ctx, `"${top?.name ?? profile.albumTitle}"`, { maxWidth: 540, maxSize: 54, minSize: 26, weight: theme.fonts.displayWeight, family: theme.fonts.display, maxLines: 2 })
  ctx.font = `${theme.fonts.displayWeight} ${t.size}px ${theme.fonts.display}`
  t.lines.forEach((l, i) => ctx.fillText(l, W / 2, 140 + (i - (t.lines.length - 1) / 2) * t.size * 1.05))
  ctx.font = `400 20px "Space Mono", monospace`
  const more = profile.artists[0] ? `+ ${Math.max(1, profile.tracks.length - 1)} more · top artist ${profile.artists[0].name}` : `${profile.tracks.length} tracks`
  ctx.fillText(more, W / 2, 232, 560)
  ctx.font = `700 16px "Space Grotesk Variable", sans-serif`
  ctx.fillText(`${profile.persona.short.toUpperCase()} ${theme.versionSuffix.toUpperCase()} · LIMITED PRESSING`, W / 2, 272, 560)
  return canvas
}

/** Wrinkle normal map for the shrink wrap, from layered value noise. */
export function paintWrapNormal(rng: Rng, size = 512): HTMLCanvasElement {
  const grid = 16
  const nodes: number[] = []
  for (let i = 0; i < (grid + 1) * (grid + 1); i++) nodes.push(rng())
  const value = (x: number, y: number) => {
    const gx = (x / size) * grid
    const gy = (y / size) * grid
    const x0 = Math.floor(gx)
    const y0 = Math.floor(gy)
    const tx = gx - x0
    const ty = gy - y0
    const n = (xx: number, yy: number) => nodes[((yy % (grid + 1)) * (grid + 1) + (xx % (grid + 1))) % nodes.length]
    const sx = tx * tx * (3 - 2 * tx)
    const sy = ty * ty * (3 - 2 * ty)
    const a = n(x0, y0) + (n(x0 + 1, y0) - n(x0, y0)) * sx
    const b = n(x0, y0 + 1) + (n(x0 + 1, y0 + 1) - n(x0, y0 + 1)) * sx
    return a + (b - a) * sy
  }
  const height = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = value(x, y) * 0.6 + value((x * 3) % size, (y * 3) % size) * 0.3 + value((x * 7) % size, (y * 7) % size) * 0.1
      // Sharp creases
      const crease = Math.pow(Math.abs(Math.sin(v * 9.5)), 12) * 0.5
      height[y * size + x] = v + crease
    }
  }
  const { canvas, ctx } = makeCanvas(size, size)
  const img = ctx.createImageData(size, size)
  const strength = 2.5
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = height[y * size + ((x - 1 + size) % size)]
      const r = height[y * size + ((x + 1) % size)]
      const u = height[((y - 1 + size) % size) * size + x]
      const d = height[((y + 1) % size) * size + x]
      const nx = (l - r) * strength
      const ny = (u - d) * strength
      const len = Math.hypot(nx, ny, 1)
      const i = (y * size + x) * 4
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      img.data[i + 2] = (1 / len) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

/** LCD for the CD player add-in. */
export function paintPlayerScreen(profile: ListeningProfile, playing: boolean): HTMLCanvasElement {
  const W = 512
  const H = 160
  const { canvas, ctx } = makeCanvas(W, H)
  ctx.fillStyle = '#0d1a10'
  ctx.fillRect(0, 0, W, H)
  const lime = '#9BFF6B'
  ctx.fillStyle = lime
  ctx.font = `700 54px "Space Mono", monospace`
  ctx.textBaseline = 'middle'
  ctx.fillText(playing ? '01  ▶' : '01  ■', 24, 52)
  ctx.font = `400 26px "Space Mono", monospace`
  const t = profile.tracks[0]
  ctx.fillText(t ? `${t.name} — ${t.artist}`.slice(0, 30) : 'NO DISC', 24, 112, W - 48)
  ctx.fillStyle = 'rgba(155,255,107,0.3)'
  for (let i = 0; i < 12; i++) ctx.fillRect(360 + i * 11, 36 - (playing ? (i % 4) * 6 : 0), 7, 20 + (playing ? (i % 4) * 6 : 0))
  return canvas
}

/** Luggage-tag keychain with genre "visa" stamps. */
export function paintPassportTag({ theme, profile, rng }: PartInput): HTMLCanvasElement {
  const W = 512
  const H = 896
  const { canvas, ctx } = makeCanvas(W, H)
  const c = theme.colors
  paperBackground(ctx, theme, W, H, rng)
  const ink = inkFor(theme)
  ctx.fillStyle = c.accent
  ctx.fillRect(0, 0, W, 120)
  ctx.fillStyle = readableOn(c.accent)
  ctx.font = `700 26px "Space Grotesk Variable", sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillText('WRAPPED AIRLINES', 40, 48)
  ctx.font = `400 18px "Space Mono", monospace`
  ctx.fillText(`PASSENGER · ${profile.artistName.toUpperCase()}`, 40, 84, 430)
  ctx.fillStyle = ink
  ctx.font = `${theme.fonts.displayWeight} 48px ${theme.fonts.display}`
  ctx.fillText('GENRE VISAS', 40, 180)
  profile.families.slice(0, 5).forEach((f, i) => {
    stamp(ctx, 110 + (i % 2) * 290, 300 + Math.floor(i / 2) * 190, 78, i % 2 ? c.accent2 : c.accent, `${f.label} · `, `${Math.round(f.weight * 100)}%`, theme.fonts.accent, rng)
  })
  ctx.fillStyle = ink
  ctx.font = `400 16px "Space Mono", monospace`
  ctx.fillText(`${profile.stats.distinctGenres} GENRES · ${profile.stats.distinctArtists} ARTISTS`, 40, 840)
  // Hole
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.arc(W / 2, 40, 0, 0, Math.PI * 2)
  ctx.fill()
  return canvas
}

/** Instant-camera print for the digicam add-in. */
export function paintPolaroid(theme: Theme, profile: ListeningProfile, img: CanvasImageSource, caption: string, time: string): HTMLCanvasElement {
  const W = 512
  const H = 620
  const { canvas, ctx } = makeCanvas(W, H)
  ctx.fillStyle = '#FBF8F1'
  ctx.fillRect(0, 0, W, H)
  drawCover(ctx, img, 28, 28, W - 56, W - 56)
  // Night flash vignette
  const v = ctx.createRadialGradient(W / 2, W / 2, 100, W / 2, W / 2, 360)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,20,0.55)')
  ctx.fillStyle = v
  ctx.fillRect(28, 28, W - 56, W - 56)
  ctx.fillStyle = '#FFB347'
  ctx.font = `700 22px "Space Mono", monospace`
  ctx.textAlign = 'right'
  ctx.fillText(time, W - 44, W - 10)
  ctx.textAlign = 'left'
  ctx.fillStyle = theme.colors.ink === '#F4E4C8' ? '#2B1F14' : theme.colors.ink
  ctx.font = `700 30px ${theme.fonts.display === '"Parisienne", cursive' ? theme.fonts.accent : theme.fonts.display}`
  ctx.fillText(caption, 36, H - 60, W - 72)
  ctx.font = `400 16px "Space Mono", monospace`
  ctx.fillStyle = '#6b6b6b'
  ctx.fillText(`${profile.artistName} · wrapped album`, 36, H - 28)
  return canvas
}

export function labelFont(theme: Theme): string {
  return theme.fonts.display
}

export function metallic(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, base: string): CanvasGradient {
  return metallicGradient(ctx, x0, y0, x1, y1, base)
}

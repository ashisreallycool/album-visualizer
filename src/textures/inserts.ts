import type { Badge, ListeningProfile } from '../analysis/types'
import type { Theme } from '../themes/types'
import { readableOn, withAlpha } from '../lib/colors'
import { formatCompact, formatDuration, formatHour, formatNumber } from '../lib/format'
import type { Rng } from '../lib/rng'
import { drawCover, fitText, glyph, grain, heartPath, holoGradient, makeCanvas, metallicGradient, roundRect, starPath, wrap, type Ctx } from './paint'
import { inkFor } from './parts'

export interface InsertInput {
  theme: Theme
  profile: ListeningProfile
  rng: Rng
  images: CanvasImageSource[]
  albumArt: CanvasImageSource[]
}

const CARD_W = 512
const CARD_H = 768

function cardFrame(ctx: Ctx, theme: Theme, rank: number): void {
  const c = theme.colors
  ctx.save()
  ctx.lineWidth = 18
  if (rank === 0) ctx.strokeStyle = holoGradient(ctx, 0, 0, CARD_W, CARD_H)
  else ctx.strokeStyle = theme.id === 'velvet' || theme.id === 'coquette' ? metallicGradient(ctx, 0, 0, CARD_W, CARD_H, c.foil) : c.paper
  roundRect(ctx, 9, 9, CARD_W - 18, CARD_H - 18, 28)
  ctx.stroke()
  ctx.restore()
}

export function paintPhotocardFront(input: InsertInput, index: number): HTMLCanvasElement {
  const { theme, profile, images, rng } = input
  const { canvas, ctx } = makeCanvas(CARD_W, CARD_H)
  const artist = profile.artists[index]
  const c = theme.colors
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 30)
  ctx.clip()
  drawCover(ctx, images[index] ?? images[0], 0, 0, CARD_W, CARD_H)
  // Theme treatment
  if (theme.id === 'newsprint') {
    ctx.fillStyle = 'rgba(20,20,20,0.25)'
    ctx.fillRect(0, 0, CARD_W, CARD_H)
  }
  if (theme.id === 'coquette') {
    const g = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
    g.addColorStop(0, 'rgba(255,255,255,0.35)')
    g.addColorStop(1, withAlpha(c.accent, 0.3))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CARD_W, CARD_H)
  }
  // Bottom gradient for legibility
  const g = ctx.createLinearGradient(0, CARD_H * 0.55, 0, CARD_H)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.78)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  cardFrame(ctx, theme, index)

  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'alphabetic'
  const name = fitText(ctx, artist?.name ?? '', { maxWidth: CARD_W - 80, maxSize: 60, minSize: 28, weight: theme.fonts.displayWeight, family: theme.fonts.display, maxLines: 2 })
  ctx.font = `${theme.fonts.displayWeight} ${name.size}px ${theme.fonts.display}`
  name.lines.forEach((l, i) => ctx.fillText(l, 40, CARD_H - 110 + (i - name.lines.length + 1) * name.size * 1.02))
  ctx.font = `400 18px "Space Mono", monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(`#${index + 1} · ${(artist?.genres[0] ?? profile.families[0]?.label ?? '').toUpperCase()}`, 40, CARD_H - 66, CARD_W - 80)
  ctx.fillText(`${index + 1} OF 5 · ${index === 0 ? 'HOLO' : 'STANDARD'}`, 40, CARD_H - 40)

  // Rank badge
  ctx.save()
  ctx.translate(CARD_W - 64, 64)
  ctx.fillStyle = index === 0 ? holoGradient(ctx, -40, -40, 40, 40) : c.accent
  if (theme.stickerShape === 'heart') heartPath(ctx, 0, 4, 76)
  else if (theme.stickerShape === 'badge') starPath(ctx, 0, 0, 40, 32, 12)
  else {
    ctx.beginPath()
    ctx.arc(0, 0, 36, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.fillStyle = index === 0 ? '#111' : readableOn(c.accent)
  ctx.font = `700 30px "Space Grotesk Variable", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${index + 1}`, 0, 2)
  ctx.restore()
  grain(ctx, CARD_W, CARD_H, 0.06, rng)
  return canvas
}

export function paintPhotocardBack(input: InsertInput, index: number): HTMLCanvasElement {
  const { theme, profile, rng } = input
  const { canvas, ctx } = makeCanvas(CARD_W, CARD_H)
  const c = theme.colors
  const artist = profile.artists[index]
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 30)
  ctx.clip()
  ctx.fillStyle = c.paper
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  grain(ctx, CARD_W, CARD_H, 0.1, rng)
  const ink = inkFor(theme)
  cardFrame(ctx, theme, index)
  ctx.fillStyle = ink
  ctx.textBaseline = 'top'
  ctx.font = `700 16px "Space Grotesk Variable", sans-serif`
  ctx.fillText(`PHOTOCARD ${index + 1}/5`, 48, 48)
  const name = fitText(ctx, artist?.name ?? '', { maxWidth: CARD_W - 96, maxSize: 54, minSize: 26, weight: theme.fonts.displayWeight, family: theme.fonts.display, maxLines: 2 })
  ctx.font = `${theme.fonts.displayWeight} ${name.size}px ${theme.fonts.display}`
  name.lines.forEach((l, i) => ctx.fillText(l, 48, 84 + i * name.size * 1.05))
  let y = 84 + name.lines.length * name.size * 1.05 + 24
  ctx.fillStyle = c.accent
  ctx.fillRect(48, y, 60, 4)
  y += 24
  const rows: Array<[string, string]> = [
    ['Genres', artist?.genres.slice(0, 3).join(', ') || 'uncharted'],
    ['Followers', artist ? formatCompact(artist.followers) : '—'],
    ['Popularity', artist ? `${artist.popularity}/100` : '—'],
    ['Your rank · 4 weeks', artist?.ranks.short_term ? `#${artist.ranks.short_term}` : 'not in top 50'],
    ['Your rank · 6 months', artist?.ranks.medium_term ? `#${artist.ranks.medium_term}` : 'not in top 50'],
    ['Your rank · all time', artist?.ranks.long_term ? `#${artist.ranks.long_term}` : 'not in top 50'],
  ]
  for (const [k, v] of rows) {
    ctx.fillStyle = withAlpha(ink, 0.65)
    ctx.font = `400 15px "Space Mono", monospace`
    ctx.fillText(k.toUpperCase(), 48, y)
    ctx.fillStyle = ink
    ctx.font = `500 24px ${theme.fonts.body}`
    const lines = wrap(ctx, v, CARD_W - 96).slice(0, 2)
    lines.forEach((l, i) => ctx.fillText(l, 48, y + 22 + i * 28))
    y += 22 + lines.length * 28 + 18
  }
  // "Signature"
  ctx.font = `400 44px "Caveat Variable", cursive`
  ctx.fillStyle = c.accent2
  ctx.fillText(`for ${profile.artistName}`, 48, CARD_H - 120)
  ctx.font = `400 13px "Space Mono", monospace`
  ctx.fillStyle = withAlpha(ink, 0.6)
  ctx.fillText(`${profile.catalog} · ${theme.versionSuffix.toUpperCase()}`, 48, CARD_H - 56)
  return canvas
}

export interface StickerSlot {
  id: string
  /** Position of the sticker centre in sheet UV space (0..1, origin top-left). */
  u: number
  v: number
  /** Size relative to sheet width. */
  size: number
}

export interface StickerSheetResult {
  sheet: HTMLCanvasElement
  stickers: Array<{ id: string; canvas: HTMLCanvasElement; label: string }>
  slots: StickerSlot[]
}

/** Draws one die-cut sticker onto its own transparent canvas. */
export function paintSticker(theme: Theme, badge: Badge, size = 256): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size, size)
  const c = theme.colors
  const cx = size / 2
  const cy = size / 2
  const fill = badge.glyph === 'advisory' ? '#111111' : theme.id === 'velvet' ? c.foil : theme.id === 'concrete' ? c.accent : theme.id === 'newsprint' ? c.ink : c.accent
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 10
  ctx.shadowOffsetY = 4
  ctx.fillStyle = '#fff'
  shapePath(ctx, theme, cx, cy, size * 0.94)
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.fillStyle = fill
  shapePath(ctx, theme, cx, cy, size * 0.84)
  ctx.fill()
  ctx.restore()
  const ink = readableOn(fill)
  if (badge.glyph === 'advisory') {
    ctx.fillStyle = '#fff'
    ctx.font = `700 ${size * 0.11}px "Space Grotesk Variable", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('PARENTAL', cx, cy - size * 0.16)
    ctx.fillText('ADVISORY', cx, cy - size * 0.04)
    ctx.fillStyle = '#fff'
    ctx.fillRect(cx - size * 0.3, cy + size * 0.07, size * 0.6, size * 0.16)
    ctx.fillStyle = '#111'
    ctx.font = `700 ${size * 0.07}px "Space Grotesk Variable", sans-serif`
    ctx.fillText('EXPLICIT CONTENT', cx, cy + size * 0.15)
    return canvas
  }
  glyph(ctx, badge.glyph, cx, cy - size * 0.1, size * 0.3, ink)
  ctx.fillStyle = ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const t = fitText(ctx, badge.label, { maxWidth: size * 0.6, maxSize: size * 0.1, minSize: size * 0.06, weight: 700, family: '"Space Grotesk Variable", sans-serif', maxLines: 2 })
  ctx.font = `700 ${t.size}px "Space Grotesk Variable", sans-serif`
  t.lines.forEach((l, i) => ctx.fillText(l, cx, cy + size * 0.17 + i * t.size * 1.05))
  return canvas
}

function shapePath(ctx: Ctx, theme: Theme, cx: number, cy: number, d: number): void {
  switch (theme.stickerShape) {
    case 'heart':
      heartPath(ctx, cx, cy, d * 0.95)
      break
    case 'badge':
      starPath(ctx, cx, cy, d / 2, d * 0.42, 14)
      break
    case 'label':
      roundRect(ctx, cx - d / 2, cy - d * 0.36, d, d * 0.72, d * 0.08)
      break
    case 'tag':
      roundRect(ctx, cx - d / 2, cy - d / 2, d, d, d * 0.04)
      break
    case 'diecut':
      starPath(ctx, cx, cy, d / 2, d * 0.46, 10)
      break
    default:
      ctx.beginPath()
      ctx.arc(cx, cy, d / 2, 0, Math.PI * 2)
  }
}

export function paintStickerSheet(input: InsertInput): StickerSheetResult {
  const { theme, profile, rng } = input
  const W = 1024
  const H = 768
  const { canvas, ctx } = makeCanvas(W, H)
  ctx.fillStyle = '#F6F4EE'
  ctx.fillRect(0, 0, W, H)
  grain(ctx, W, H, 0.05, rng)
  ctx.fillStyle = '#2B2B2B'
  ctx.font = `700 18px "Space Grotesk Variable", sans-serif`
  ctx.textBaseline = 'top'
  ctx.fillText(`STICKER SHEET · ${profile.artistName.toUpperCase()} · ${theme.name.toUpperCase()}`, 36, 28)
  ctx.font = `400 14px "Space Mono", monospace`
  ctx.fillStyle = '#6a6a6a'
  ctx.fillText('PEEL AND STICK ANYWHERE ON THE ALBUM', 36, 54)
  const badges = profile.badges.slice(0, 8)
  const cols = 4
  const cell = 230
  const x0 = 60
  const y0 = 110
  const slots: StickerSlot[] = []
  const stickers: StickerSheetResult['stickers'] = []
  badges.forEach((b, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = x0 + col * cell + cell / 2
    const cy = y0 + row * (cell + 60) + cell / 2
    // Die-cut outline left on the sheet
    ctx.save()
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.setLineDash([6, 6])
    ctx.lineWidth = 2
    shapePath(ctx, theme, cx, cy, cell * 0.78)
    ctx.stroke()
    ctx.restore()
    ctx.fillStyle = '#8a8a8a'
    ctx.font = `400 12px "Space Mono", monospace`
    ctx.textAlign = 'center'
    const lines = wrap(ctx, b.blurb, cell - 20).slice(0, 3)
    lines.forEach((l, li) => ctx.fillText(l, cx, cy + cell * 0.46 + li * 15, cell - 16))
    ctx.textAlign = 'left'
    slots.push({ id: b.id, u: cx / W, v: cy / H, size: (cell * 0.84) / W })
    stickers.push({ id: b.id, canvas: paintSticker(theme, b), label: b.label })
  })
  return { sheet: canvas, stickers, slots }
}

/** Library-card style stats insert. */
export function paintListenerCard(input: InsertInput): HTMLCanvasElement {
  const { theme, profile, rng } = input
  const W = 1024
  const H = 640
  const { canvas, ctx } = makeCanvas(W, H)
  const c = theme.colors
  roundRect(ctx, 0, 0, W, H, 40)
  ctx.clip()
  ctx.fillStyle = c.paper
  ctx.fillRect(0, 0, W, H)
  grain(ctx, W, H, 0.1, rng)
  const ink = inkFor(theme)
  ctx.fillStyle = c.accent
  ctx.fillRect(0, 0, W, 86)
  ctx.fillStyle = readableOn(c.accent)
  ctx.font = `700 24px "Space Grotesk Variable", sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillText('LISTENER CARD', 48, 43)
  ctx.font = `400 18px "Space Mono", monospace`
  ctx.textAlign = 'right'
  ctx.fillText(`NO. ${profile.catalog}`, W - 48, 43)
  ctx.textAlign = 'left'
  ctx.fillStyle = ink
  ctx.textBaseline = 'top'
  const name = fitText(ctx, profile.artistName, { maxWidth: 540, maxSize: 64, minSize: 32, weight: theme.fonts.displayWeight, family: theme.fonts.display, maxLines: 1 })
  ctx.font = `${theme.fonts.displayWeight} ${name.size}px ${theme.fonts.display}`
  ctx.fillText(name.lines[0], 48, 112)
  ctx.font = `italic 400 24px ${theme.fonts.body}`
  ctx.fillStyle = withAlpha(ink, 0.85)
  ctx.fillText(`${profile.persona.title} · member since ${profile.stats.medianReleaseYear}`, 48, 120 + name.size)

  const s = profile.stats
  const est = s.minutesSource === 'estimate'
  const hasPace = s.minutesPerDay > 0
  const stats: Array<[string, string, string?]> = [
    ['Listening pace', hasPace ? `${formatNumber(s.minutesPerDay)} min / day` : '—', hasPace ? (est ? 'from recent plays' : 'from your data export') : 'no recent plays found'],
    ['Year at this pace', hasPace ? `${formatNumber(s.yearMinutes)} min` : '—', est ? 'estimate' : `${formatNumber(s.history?.totalMinutes ?? 0)} min on record`],
    ['Peak hour', formatHour(s.peakHour), `${Math.round(s.nightShare * 100)}% after midnight`],
    ['Top genre', profile.families[0]?.label ?? '—', `${profile.stats.distinctGenres} genres total`],
    ['Artists in rotation', `${s.distinctArtists}`, s.followedArtists ? `${s.followedArtists} followed` : undefined],
    ['Average track', formatDuration(s.avgTrackSec * 1000), `${Math.round(s.explicitShare * 100)}% explicit`],
  ]
  const colW = 300
  stats.forEach(([k, v, sub], i) => {
    const x = 48 + (i % 3) * colW
    const y = 240 + Math.floor(i / 3) * 130
    ctx.fillStyle = withAlpha(ink, 0.65)
    ctx.font = `400 14px "Space Mono", monospace`
    ctx.fillText(k.toUpperCase(), x, y)
    ctx.fillStyle = ink
    ctx.font = `700 34px "Space Grotesk Variable", sans-serif`
    ctx.fillText(v, x, y + 22, colW - 30)
    if (sub) {
      ctx.fillStyle = withAlpha(ink, 0.7)
      ctx.font = `400 15px ${theme.fonts.body}`
      ctx.fillText(sub, x, y + 66, colW - 30)
    }
  })
  // Meters: mainstream & eclecticism
  const meter = (label: string, value: number, y: number) => {
    ctx.fillStyle = withAlpha(ink, 0.65)
    ctx.font = `400 14px "Space Mono", monospace`
    ctx.fillText(`${label.toUpperCase()} · ${value}/100`, 48, y)
    ctx.fillStyle = withAlpha(ink, 0.15)
    roundRect(ctx, 48, y + 24, W - 96, 14, 7)
    ctx.fill()
    ctx.fillStyle = c.accent
    roundRect(ctx, 48, y + 24, (W - 96) * (value / 100), 14, 7)
    ctx.fill()
  }
  meter('Mainstream meter', s.mainstream, 500)
  meter('Eclecticism', s.eclecticism, 560)
  return canvas
}

/** Photobook pages. */
export function paintBookPages(input: InsertInput): HTMLCanvasElement[] {
  const { theme, profile, rng, images, albumArt } = input
  const S = 1024
  const c = theme.colors
  const ink = inkFor(theme)
  const pages: HTMLCanvasElement[] = []

  const start = () => {
    const { canvas, ctx } = makeCanvas(S, S)
    ctx.fillStyle = c.paper
    ctx.fillRect(0, 0, S, S)
    grain(ctx, S, S, 0.1, rng)
    ctx.fillStyle = ink
    return { canvas, ctx }
  }
  const heading = (ctx: Ctx, kicker: string, title: string) => {
    ctx.fillStyle = c.accent
    ctx.fillRect(72, 72, 60, 5)
    ctx.fillStyle = withAlpha(ink, 0.7)
    ctx.font = `700 16px "Space Grotesk Variable", sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillText(kicker.toUpperCase(), 72, 92)
    ctx.fillStyle = ink
    const t = fitText(ctx, title, { maxWidth: 880, maxSize: 72, minSize: 36, weight: theme.fonts.displayWeight, family: theme.fonts.display, maxLines: 1 })
    ctx.font = `${theme.fonts.displayWeight} ${t.size}px ${theme.fonts.display}`
    ctx.fillText(t.lines[0], 72, 118)
    return 118 + t.size + 36
  }

  // Page 1: concept photos (top 5 artists)
  {
    const { canvas, ctx } = start()
    const y0 = heading(ctx, 'Concept photos', 'Your top five')
    const layout = [
      [72, y0, 420, 420],
      [516, y0, 436, 200],
      [516, y0 + 220, 212, 200],
      [740, y0 + 220, 212, 200],
      [72, y0 + 444, 880, 220],
    ]
    profile.artists.slice(0, 5).forEach((a, i) => {
      const [x, y, w, h] = layout[i]
      ctx.save()
      roundRect(ctx, x, y, w, h, 12)
      ctx.clip()
      drawCover(ctx, images[i] ?? images[0], x, y, w, h)
      const g = ctx.createLinearGradient(0, y + h * 0.5, 0, y + h)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,0,0.7)')
      ctx.fillStyle = g
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#fff'
      ctx.font = `700 ${i === 0 ? 34 : 22}px "Space Grotesk Variable", sans-serif`
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`${i + 1}  ${a.name}`, x + 20, y + h - 20, w - 40)
      ctx.restore()
    })
    pages.push(canvas)
  }

  // Page 2: top tracks
  {
    const { canvas, ctx } = start()
    let y = heading(ctx, 'Tracklist', 'On repeat')
    profile.tracks.slice(0, 10).forEach((t, i) => {
      const art = albumArt[i]
      if (art) {
        ctx.save()
        roundRect(ctx, 72, y, 56, 56, 6)
        ctx.clip()
        drawCover(ctx, art, 72, y, 56, 56)
        ctx.restore()
      }
      ctx.fillStyle = withAlpha(ink, 0.6)
      ctx.font = `400 14px "Space Mono", monospace`
      ctx.textBaseline = 'top'
      ctx.fillText((i + 1).toString().padStart(2, '0'), 148, y + 4)
      ctx.fillStyle = ink
      ctx.font = `500 26px ${theme.fonts.body}`
      ctx.fillText(t.name, 190, y, 600)
      ctx.fillStyle = withAlpha(ink, 0.7)
      ctx.font = `400 16px ${theme.fonts.accent}`
      ctx.fillText(`${t.artist} · ${t.releaseYear ?? ''}`, 190, y + 32, 600)
      ctx.textAlign = 'right'
      ctx.fillText(formatDuration(t.durationMs), S - 72, y + 8)
      ctx.textAlign = 'left'
      y += 76
    })
    pages.push(canvas)
  }

  // Page 3: when you listen + decades
  {
    const { canvas, ctx } = start()
    const y0 = heading(ctx, 'Archive', 'When you listen')
    const s = profile.stats
    const max = Math.max(1, ...s.byHour)
    const chartX = 72
    const chartW = 880
    const chartH = 220
    const barW = chartW / 24
    s.byHour.forEach((v, h) => {
      const bh = (v / max) * chartH
      ctx.fillStyle = h < 5 ? c.accent2 : c.accent
      roundRect(ctx, chartX + h * barW + 3, y0 + chartH - bh, barW - 6, Math.max(4, bh), 4)
      ctx.fill()
    })
    ctx.fillStyle = withAlpha(ink, 0.7)
    ctx.font = `400 13px "Space Mono", monospace`
    ctx.textBaseline = 'top'
    for (const h of [0, 6, 12, 18, 23]) ctx.fillText(formatHour(h), chartX + h * barW, y0 + chartH + 8)
    ctx.fillStyle = ink
    ctx.font = `400 22px ${theme.fonts.body}`
    ctx.fillText(`Peak hour ${formatHour(s.peakHour)}. ${Math.round(s.nightShare * 100)}% of recent plays landed after midnight.`, 72, y0 + chartH + 44, 880)

    const y1 = y0 + chartH + 110
    ctx.fillStyle = withAlpha(ink, 0.7)
    ctx.font = `700 16px "Space Grotesk Variable", sans-serif`
    ctx.fillText('RELEASE DECADES OF YOUR TOP TRACKS', 72, y1)
    let x = 72
    const dec = profile.stats.decades
    dec.forEach((d, i) => {
      const w = Math.max(60, 880 * d.share)
      ctx.fillStyle = i % 2 ? c.accent : c.accent2
      roundRect(ctx, x, y1 + 30, w - 6, 48, 6)
      ctx.fill()
      ctx.fillStyle = readableOn(i % 2 ? c.accent : c.accent2)
      ctx.font = `700 15px "Space Grotesk Variable", sans-serif`
      ctx.fillText(`${d.decade}s`, x + 10, y1 + 46, w - 16)
      x += w
    })
    ctx.fillStyle = ink
    ctx.font = `400 22px ${theme.fonts.body}`
    ctx.fillText(`Median release year ${s.medianReleaseYear}. Mainstream ${s.mainstream}/100, eclecticism ${s.eclecticism}/100.`, 72, y1 + 100, 880)
    pages.push(canvas)
  }

  // Page 4: genre map (bento)
  {
    const { canvas, ctx } = start()
    const y0 = heading(ctx, 'Genre map', 'Where you live')
    const fams = profile.families.slice(0, 6)
    const cells = [
      [72, y0, 540, 320],
      [636, y0, 316, 150],
      [636, y0 + 170, 316, 150],
      [72, y0 + 344, 260, 200],
      [356, y0 + 344, 256, 200],
      [636, y0 + 344, 316, 200],
    ]
    fams.forEach((f, i) => {
      const [x, y, w, h] = cells[i]
      ctx.fillStyle = i === 0 ? c.accent : i % 2 ? withAlpha(c.accent2, 0.9) : withAlpha(ink, 0.08)
      roundRect(ctx, x, y, w, h, 16)
      ctx.fill()
      const fg = i === 0 ? readableOn(c.accent) : i % 2 ? readableOn(c.accent2) : ink
      ctx.fillStyle = fg
      ctx.font = `700 ${i === 0 ? 64 : 34}px "Space Grotesk Variable", sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillText(`${Math.round(f.weight * 100)}%`, x + 24, y + 20)
      ctx.font = `500 ${i === 0 ? 30 : 20}px ${theme.fonts.body}`
      ctx.fillText(f.label, x + 24, y + h - (i === 0 ? 60 : 44), w - 48)
    })
    ctx.fillStyle = withAlpha(ink, 0.8)
    ctx.font = `400 16px "Space Mono", monospace`
    ctx.textBaseline = 'top'
    const genres = profile.genres.slice(0, 12).map((g) => g.name).join(' · ')
    wrap(ctx, genres, 880).slice(0, 3).forEach((l, i) => ctx.fillText(l, 72, y0 + 570 + i * 22))
    pages.push(canvas)
  }

  // Page 5: thank you
  {
    const { canvas, ctx } = start()
    const y0 = heading(ctx, 'Liner notes', 'Thank you')
    ctx.fillStyle = ink
    ctx.font = `400 26px ${theme.fonts.body}`
    ctx.textBaseline = 'top'
    const lines = wrap(ctx, profile.linerNotes, 880)
    lines.forEach((l, i) => ctx.fillText(l, 72, y0 + i * 38))
    let y = y0 + lines.length * 38 + 40
    ctx.font = `400 22px ${theme.fonts.accent}`
    ctx.fillStyle = withAlpha(ink, 0.85)
    const names = profile.artists.slice(0, 24).map((a) => a.name).join('  ·  ')
    wrap(ctx, names, 880).forEach((l, i) => ctx.fillText(l, 72, y + i * 32))
    y += 12
    ctx.font = `400 56px "Caveat Variable", cursive`
    ctx.fillStyle = c.accent2
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`— ${profile.artistName}`, 72, S - 100)
    pages.push(canvas)
  }

  // Page 6: inside back — badges legend
  {
    const { canvas, ctx } = start()
    let y = heading(ctx, 'Sticker legend', 'What you earned')
    profile.badges.forEach((b) => {
      ctx.save()
      ctx.drawImage(paintSticker(theme, b, 128), 72, y - 8, 96, 96)
      ctx.restore()
      ctx.fillStyle = ink
      ctx.font = `700 24px "Space Grotesk Variable", sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillText(b.label, 190, y + 8)
      ctx.fillStyle = withAlpha(ink, 0.8)
      ctx.font = `400 19px ${theme.fonts.body}`
      wrap(ctx, b.blurb, 740).slice(0, 2).forEach((l, i) => ctx.fillText(l, 190, y + 40 + i * 24))
      y += 104
    })
    pages.push(canvas)
  }
  return pages
}

import type { ListeningProfile } from '../analysis/types'
import type { Theme } from '../themes/types'
import { withAlpha, mix } from '../lib/colors'
import type { Rng } from '../lib/rng'
import {
  barcode,
  blotches,
  coffeeRing,
  drawCover,
  fitText,
  grain,
  halftone,
  heartPath,
  holoGradient,
  makeCanvas,
  metallicGradient,
  roundRect,
  sparklePath,
  stamp,
  starPath,
  tape,
  type Ctx,
} from './paint'

export interface CoverInput {
  theme: Theme
  profile: ListeningProfile
  images: CanvasImageSource[]
  rng: Rng
  size?: number
}

const SIZE = 1024

export function paintCover(input: CoverInput): HTMLCanvasElement {
  const size = input.size ?? SIZE
  const { canvas, ctx } = makeCanvas(size, size)
  const scale = size / SIZE
  ctx.scale(scale, scale)
  switch (input.theme.id) {
    case 'scrapbook':
      scrapbook(ctx, input)
      break
    case 'acid':
      acid(ctx, input)
      break
    case 'newsprint':
      newsprint(ctx, input)
      break
    case 'coquette':
      coquette(ctx, input)
      break
    case 'concrete':
      concrete(ctx, input)
      break
    case 'velvet':
      velvet(ctx, input)
      break
  }
  return canvas
}

/** Greyscale + contrast copy of an image (no ctx.filter, for Safari). */
export function toMono(img: CanvasImageSource, w: number, h: number, contrast = 1.25): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(w, h)
  drawCover(ctx, img, 0, 0, w, h)
  try {
    const data = ctx.getImageData(0, 0, w, h)
    const d = data.data
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      const v = Math.max(0, Math.min(255, (l - 128) * contrast + 128))
      d[i] = d[i + 1] = d[i + 2] = v
    }
    ctx.putImageData(data, 0, 0)
  } catch {
    // Tainted image: keep the colour copy.
  }
  return canvas
}

function polaroid(ctx: Ctx, img: CanvasImageSource, x: number, y: number, w: number, angle: number, caption: string, font: string, ink: string): void {
  const h = w * 1.18
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.rotate(angle)
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 8
  ctx.fillStyle = '#FBF8F1'
  ctx.fillRect(-w / 2, -h / 2, w, h)
  ctx.shadowColor = 'transparent'
  const pad = w * 0.06
  drawCover(ctx, img, -w / 2 + pad, -h / 2 + pad, w - pad * 2, w - pad * 2)
  ctx.fillStyle = ink
  ctx.font = `700 ${w * 0.11}px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(caption, 0, h / 2 - (h - w) / 2 + pad * 0.3, w - pad * 2)
  ctx.restore()
}

function scrapbook(ctx: Ctx, { theme, profile, images, rng }: CoverInput): void {
  const c = theme.colors
  ctx.fillStyle = c.paper
  ctx.fillRect(0, 0, SIZE, SIZE)
  blotches(ctx, SIZE, SIZE, '#8A6A3A', 60, rng, 160, 0.09)
  grain(ctx, SIZE, SIZE, 0.14, rng)

  // Faint map grid + dotted passport border
  ctx.save()
  ctx.strokeStyle = withAlpha(c.ink, 0.08)
  ctx.lineWidth = 1
  for (let i = 0; i <= SIZE; i += 64) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, SIZE)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(SIZE, i)
    ctx.stroke()
  }
  ctx.setLineDash([6, 8])
  ctx.strokeStyle = withAlpha(c.ink, 0.5)
  ctx.lineWidth = 3
  ctx.strokeRect(28, 28, SIZE - 56, SIZE - 56)
  ctx.restore()

  // Dashed travel route behind the polaroids
  ctx.save()
  ctx.setLineDash([10, 12])
  ctx.strokeStyle = c.accent
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(140, 760)
  ctx.bezierCurveTo(300, 500, 600, 900, 880, 520)
  ctx.stroke()
  ctx.restore()

  const names = profile.artists.slice(0, 3).map((a) => a.name)
  polaroid(ctx, images[1] ?? images[0], 560, 420, 300, 0.12, names[1] ?? '', theme.fonts.display, c.ink)
  polaroid(ctx, images[2] ?? images[0], 120, 560, 280, -0.1, names[2] ?? '', theme.fonts.display, c.ink)
  polaroid(ctx, images[0], 330, 300, 360, 0.04, names[0] ?? '', theme.fonts.display, c.ink)
  tape(ctx, 400, 300, 130, 36, -0.35, c.accent2)
  tape(ctx, 690, 320, 130, 36, 0.4, c.accent)
  tape(ctx, 170, 575, 110, 32, 0.3, c.accent)

  // Typewriter labels
  ctx.save()
  ctx.font = `400 26px ${theme.fonts.accent}`
  ctx.fillStyle = '#FBF8F1'
  ctx.fillRect(70, 70, 330, 44)
  ctx.fillStyle = c.ink
  ctx.textBaseline = 'middle'
  ctx.fillText(`${profile.artistName.toUpperCase()} · THE 1ST EP`, 86, 92, 300)
  ctx.restore()

  // Hand-lettered title with marker outline
  const title = fitText(ctx, profile.albumTitle, { maxWidth: 620, maxSize: 150, minSize: 60, weight: 700, family: theme.fonts.display, maxLines: 2 })
  ctx.save()
  ctx.font = `700 ${title.size}px ${theme.fonts.display}`
  ctx.textBaseline = 'alphabetic'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 16
  ctx.strokeStyle = '#FBF8F1'
  title.lines.forEach((l, i) => ctx.strokeText(l, 70, 130 + title.size * (i + 1) * 0.95))
  ctx.fillStyle = c.ink
  title.lines.forEach((l, i) => ctx.fillText(l, 70, 130 + title.size * (i + 1) * 0.95))
  ctx.restore()

  // Postmark with persona
  stamp(ctx, 840, 170, 96, c.accent, `WRAPPED ${new Date().getFullYear()} · `, profile.persona.short.toUpperCase(), theme.fonts.accent, rng)

  // Genre "visa" stamps
  profile.families.slice(0, 3).forEach((f, i) => {
    ctx.save()
    ctx.translate(120 + i * 290, 930)
    ctx.rotate((rng() - 0.5) * 0.12)
    ctx.strokeStyle = withAlpha(i % 2 ? c.accent2 : c.accent, 0.85)
    ctx.lineWidth = 3
    ctx.setLineDash([8, 6])
    ctx.strokeRect(-110, -26, 220, 52)
    ctx.setLineDash([])
    ctx.fillStyle = withAlpha(i % 2 ? c.accent2 : c.accent, 0.9)
    ctx.font = `400 20px ${theme.fonts.accent}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${f.label.toUpperCase()} · ${Math.round(f.weight * 100)}%`, 0, 0, 200)
    ctx.restore()
  })

  // Doodles
  for (let i = 0; i < 9; i++) {
    const x = rng() * SIZE
    const y = rng() * SIZE
    ctx.save()
    ctx.fillStyle = i % 3 ? c.accent : c.accent2
    ctx.globalAlpha = 0.8
    if (i % 2) starPath(ctx, x, y, 14 + rng() * 10, 6, 5)
    else heartPath(ctx, x, y, 18 + rng() * 10)
    ctx.fill()
    ctx.restore()
  }
}

function acid(ctx: Ctx, { theme, profile, images, rng }: CoverInput): void {
  const c = theme.colors
  ctx.fillStyle = c.paper
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Technical grid + halftone wash
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 1
  for (let i = 0; i <= SIZE; i += 48) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, SIZE)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(SIZE, i)
    ctx.stroke()
  }
  ctx.restore()
  halftone(ctx, 0, 560, SIZE, 464, withAlpha(c.accent, 0.85), 14, rng, 5)

  // Oversized outlined name running diagonally
  ctx.save()
  ctx.translate(SIZE / 2, SIZE / 2)
  ctx.rotate(-0.35)
  ctx.font = `900 190px ${theme.fonts.display}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 2
  ctx.strokeText(profile.artistName.toUpperCase(), 0, -120)
  ctx.strokeText(profile.artistName.toUpperCase(), 0, 120)
  ctx.restore()

  // Lime blob
  ctx.save()
  ctx.fillStyle = c.accent
  ctx.beginPath()
  ctx.moveTo(120, 640)
  ctx.bezierCurveTo(60, 420, 420, 380, 520, 520)
  ctx.bezierCurveTo(620, 660, 420, 920, 260, 880)
  ctx.bezierCurveTo(120, 840, 160, 760, 120, 640)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // Cut-out stickers of top artists with thick white borders
  const cut = (img: CanvasImageSource, x: number, y: number, w: number, h: number, angle: number, label: string) => {
    ctx.save()
    ctx.translate(x + w / 2, y + h / 2)
    ctx.rotate(angle)
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetY = 10
    ctx.fillStyle = '#fff'
    roundRect(ctx, -w / 2 - 14, -h / 2 - 14, w + 28, h + 28, 26)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.save()
    roundRect(ctx, -w / 2, -h / 2, w, h, 16)
    ctx.clip()
    drawCover(ctx, img, -w / 2, -h / 2, w, h)
    ctx.restore()
    // price-tag label
    ctx.fillStyle = c.accent2
    roundRect(ctx, -w / 2 - 10, h / 2 - 30, Math.min(w + 20, 260), 48, 8)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = `700 22px ${theme.fonts.body}`
    ctx.textBaseline = 'middle'
    ctx.fillText(label.toUpperCase(), -w / 2 + 4, h / 2 - 6, Math.min(w, 240))
    ctx.restore()
  }
  const names = profile.artists.slice(0, 3).map((a) => a.name)
  cut(images[2] ?? images[0], 640, 560, 250, 300, 0.18, names[2] ?? '')
  cut(images[1] ?? images[0], 120, 120, 280, 330, -0.14, names[1] ?? '')
  cut(images[0], 420, 250, 340, 400, 0.06, names[0] ?? '')

  // Warped title: each glyph bounces and stretches
  const title = profile.albumTitle.toUpperCase()
  ctx.save()
  const base = fitText(ctx, title, { maxWidth: 900, maxSize: 170, minSize: 70, weight: 900, family: theme.fonts.display, maxLines: 1 })
  ctx.font = `900 ${base.size}px ${theme.fonts.display}`
  ctx.textBaseline = 'alphabetic'
  let x = 60
  const yBase = 960
  for (let i = 0; i < title.length; i++) {
    const ch = title[i]
    const w = ctx.measureText(ch).width
    const stretch = 1 + Math.sin(i * 1.3) * 0.25
    ctx.save()
    ctx.translate(x + w / 2, yBase + Math.sin(i * 0.9) * 18)
    ctx.transform(1, 0, -0.12, stretch, 0, 0)
    ctx.lineJoin = 'round'
    ctx.lineWidth = 14
    ctx.strokeStyle = '#fff'
    ctx.strokeText(ch, -w / 2, 0)
    ctx.fillStyle = c.accent2
    ctx.fillText(ch, -w / 2 + 8, 8)
    ctx.fillStyle = c.accent
    ctx.fillText(ch, -w / 2, 0)
    ctx.restore()
    x += w * 0.98
  }
  ctx.restore()

  // Starburst "NEW!" + bolt + chrome disc + barcode
  ctx.save()
  ctx.translate(880, 150)
  ctx.rotate(0.2)
  ctx.fillStyle = c.accent2
  starPath(ctx, 0, 0, 96, 70, 14)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = `900 30px ${theme.fonts.display}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`VER.${(profile.catalog.slice(-2) as string) || '01'}`, 0, 0)
  ctx.restore()

  ctx.save()
  ctx.fillStyle = metallicGradient(ctx, 820, 760, 980, 900, c.foil)
  ctx.beginPath()
  ctx.arc(900, 830, 80, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = c.paper
  ctx.beginPath()
  ctx.arc(900, 830, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  barcode(ctx, String(profile.stats.yearMinutes || 123456).padStart(12, '0'), 60, 60, 220, 48, '#fff')
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.font = `700 20px ${theme.fonts.body}`
  ctx.fillText(`${profile.catalog}  ·  ${profile.persona.short.toUpperCase()} VER.`, 60, 132)
  ctx.restore()
}

function newsprint(ctx: Ctx, { theme, profile, images, rng }: CoverInput): void {
  const c = theme.colors
  ctx.fillStyle = c.paper
  ctx.fillRect(0, 0, SIZE, SIZE)
  grain(ctx, SIZE, SIZE, 0.16, rng)

  // Body copy columns (liner notes repeated)
  ctx.save()
  ctx.fillStyle = withAlpha(c.ink, 0.55)
  ctx.font = `400 13px ${theme.fonts.accent}`
  const words = `${profile.linerNotes} ${profile.persona.tagline} `.split(' ')
  const cols = [
    { x: 60, y: 560, w: 260, h: 400 },
    { x: 350, y: 560, w: 260, h: 400 },
  ]
  for (const col of cols) {
    let y = col.y
    let line = ''
    let wi = Math.floor(rng() * words.length)
    while (y < col.y + col.h) {
      const w = words[wi++ % words.length]
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > col.w) {
        ctx.fillText(line, col.x, y)
        y += 17
        line = w
      } else line = test
    }
  }
  ctx.restore()

  // Masthead
  ctx.save()
  ctx.fillStyle = c.ink
  ctx.fillRect(60, 56, SIZE - 120, 6)
  const head = fitText(ctx, profile.albumTitle.toUpperCase(), { maxWidth: SIZE - 120, maxSize: 210, minSize: 80, weight: 400, family: theme.fonts.display, maxLines: 1 })
  ctx.font = `400 ${head.size}px ${theme.fonts.display}`
  ctx.textBaseline = 'top'
  ctx.fillText(head.lines[0], 60, 70)
  ctx.fillRect(60, 80 + head.size * 1.05, SIZE - 120, 3)
  ctx.font = `400 22px ${theme.fonts.accent}`
  ctx.fillText(
    `VOL. ${new Date().getFullYear()}   ·   NO. ${profile.catalog.slice(-4)}   ·   ${profile.artistName.toUpperCase()}'S EDITION   ·   ${theme.versionSuffix.toUpperCase()}`,
    60,
    92 + head.size * 1.05,
    SIZE - 120,
  )
  ctx.restore()

  // Halftone portraits with captions
  const photo = (img: CanvasImageSource, x: number, y: number, w: number, h: number, caption: string) => {
    const mono = toMono(img, w, h, 1.35)
    ctx.save()
    ctx.drawImage(mono, x, y)
    ctx.globalCompositeOperation = 'multiply'
    halftone(ctx, x, y, w, h, withAlpha(c.ink, 0.5), 7, rng, 2.6)
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = c.ink
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, w, h)
    ctx.fillStyle = c.ink
    ctx.font = `400 18px ${theme.fonts.accent}`
    ctx.textBaseline = 'top'
    ctx.fillText(caption.toUpperCase(), x, y + h + 8, w)
    ctx.restore()
  }
  const names = profile.artists.slice(0, 3).map((a) => a.name)
  photo(images[0], 60, 200 + 10, 420, 320, `${names[0] ?? ''} — ${profile.artists[0]?.genres[0] ?? 'on the record'}`)
  photo(images[1] ?? images[0], 660, 560, 300, 260, names[1] ?? '')
  photo(images[2] ?? images[0], 520, 200 + 10, 440, 240, names[2] ?? '')

  // Crossword of genres
  ctx.save()
  const gx = 660
  const gy = 860
  const cell = 24
  const grid = 12
  ctx.strokeStyle = c.ink
  ctx.lineWidth = 1.5
  const fam = profile.families.slice(0, 3).map((f) => f.label.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12))
  for (let r = 0; r < 4; r++) {
    for (let col = 0; col < grid; col++) {
      const x = gx + col * cell
      const y = gy + r * cell
      const word = fam[r] ?? ''
      const letter = word[col]
      ctx.fillStyle = letter ? '#fff' : c.ink
      ctx.fillRect(x, y, cell, cell)
      ctx.strokeRect(x, y, cell, cell)
      if (letter) {
        ctx.fillStyle = c.ink
        ctx.font = `400 15px ${theme.fonts.accent}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(letter, x + cell / 2, y + cell / 2 + 1)
      }
    }
  }
  ctx.restore()

  coffeeRing(ctx, 820, 380, 90, rng)
  coffeeRing(ctx, 240, 900, 70, rng)

  // Red stamp
  ctx.save()
  ctx.translate(300, 470)
  ctx.rotate(-0.12)
  ctx.strokeStyle = c.accent
  ctx.fillStyle = c.accent
  ctx.globalAlpha = 0.88
  ctx.lineWidth = 5
  ctx.strokeRect(-150, -34, 300, 68)
  ctx.font = `400 40px ${theme.fonts.display}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(profile.persona.title.toUpperCase(), 0, 2, 280)
  ctx.restore()

  barcode(ctx, String(profile.stats.yearMinutes || 240000).padStart(12, '0'), 60, 975, 200, 32, c.ink)
}

function coquette(ctx: Ctx, { theme, profile, images, rng }: CoverInput): void {
  const c = theme.colors
  const g = ctx.createLinearGradient(0, 0, 0, SIZE)
  g.addColorStop(0, '#F4F0FB')
  g.addColorStop(0.5, c.paper)
  g.addColorStop(1, '#D9CEF2')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, SIZE, SIZE)
  const glow = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 50, SIZE / 2, SIZE / 2, 560)
  glow.addColorStop(0, withAlpha(c.accent, 0.45))
  glow.addColorStop(1, withAlpha(c.accent, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Frosted specks
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + rng() * 0.6})`
    ctx.beginPath()
    ctx.arc(rng() * SIZE, rng() * SIZE, 1 + rng() * 3, 0, Math.PI * 2)
    ctx.fill()
  }

  // Scalloped lace border
  ctx.save()
  ctx.strokeStyle = withAlpha(c.foil, 0.9)
  ctx.lineWidth = 2
  for (let i = 0; i < SIZE; i += 32) {
    for (const [x, y] of [
      [i + 16, 24],
      [i + 16, SIZE - 24],
      [24, i + 16],
      [SIZE - 24, i + 16],
    ]) {
      ctx.beginPath()
      ctx.arc(x, y, 10, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.restore()

  // Side arches
  const arch = (img: CanvasImageSource, x: number, y: number, w: number, h: number) => {
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x, y + h)
    ctx.lineTo(x, y + w / 2)
    ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0)
    ctx.lineTo(x + w, y + h)
    ctx.closePath()
    ctx.lineWidth = 10
    ctx.strokeStyle = metallicGradient(ctx, x, y, x + w, y + h, c.foil)
    ctx.stroke()
    ctx.clip()
    drawCover(ctx, img, x, y, w, h)
    ctx.restore()
  }
  arch(images[1] ?? images[0], 90, 300, 200, 300)
  arch(images[2] ?? images[0], 734, 300, 200, 300)

  // Chrome heart with portrait inside
  ctx.save()
  ctx.shadowColor = withAlpha(c.accent, 0.6)
  ctx.shadowBlur = 50
  heartPath(ctx, SIZE / 2, 470, 500)
  ctx.lineWidth = 34
  ctx.strokeStyle = metallicGradient(ctx, 260, 220, 760, 700, c.foil)
  ctx.stroke()
  ctx.shadowColor = 'transparent'
  ctx.save()
  heartPath(ctx, SIZE / 2, 470, 500)
  ctx.clip()
  drawCover(ctx, images[0], 240, 220, 544, 500)
  const sheen = ctx.createLinearGradient(240, 220, 780, 720)
  sheen.addColorStop(0, 'rgba(255,255,255,0.45)')
  sheen.addColorStop(0.45, 'rgba(255,255,255,0.05)')
  sheen.addColorStop(1, withAlpha(c.accent, 0.35))
  ctx.fillStyle = sheen
  ctx.fillRect(200, 180, 640, 600)
  ctx.restore()
  // Pink gem
  ctx.translate(690, 310)
  ctx.rotate(0.3)
  ctx.fillStyle = metallicGradient(ctx, -40, -40, 40, 40, c.accent)
  ctx.beginPath()
  ctx.moveTo(-44, -14)
  ctx.lineTo(-22, -44)
  ctx.lineTo(22, -44)
  ctx.lineTo(44, -14)
  ctx.lineTo(0, 44)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  // Script title
  ctx.save()
  ctx.font = `400 34px ${theme.fonts.accent}`
  ctx.fillStyle = c.ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(`${profile.artistName}  ·  ${theme.versionSuffix}`, SIZE / 2, 150)
  const t = fitText(ctx, profile.albumTitle, { maxWidth: 860, maxSize: 190, minSize: 80, weight: 400, family: theme.fonts.display, maxLines: 1 })
  ctx.font = `400 ${t.size}px ${theme.fonts.display}`
  ctx.lineJoin = 'round'
  ctx.shadowColor = withAlpha(c.ink, 0.35)
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 6
  ctx.lineWidth = 10
  ctx.strokeStyle = c.ink
  ctx.strokeText(t.lines[0], SIZE / 2, 880)
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = 4
  ctx.strokeStyle = '#fff'
  ctx.strokeText(t.lines[0], SIZE / 2, 880)
  ctx.fillStyle = metallicGradient(ctx, 200, 800, 820, 900, mix(c.foil, c.ink, 0.25))
  ctx.fillText(t.lines[0], SIZE / 2, 880)
  ctx.fillStyle = c.ink
  ctx.font = `400 26px ${theme.fonts.accent}`
  ctx.fillText(profile.persona.title, SIZE / 2, 940)
  ctx.restore()

  // Sparkles + pearls
  for (let i = 0; i < 14; i++) {
    const x = rng() * SIZE
    const y = rng() * SIZE
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.shadowColor = '#fff'
    ctx.shadowBlur = 12
    sparklePath(ctx, x, y, 10 + rng() * 22)
    ctx.fill()
    ctx.restore()
  }
}

function concrete(ctx: Ctx, { theme, profile, images, rng }: CoverInput): void {
  const c = theme.colors
  ctx.fillStyle = c.paper
  ctx.fillRect(0, 0, SIZE, SIZE)
  blotches(ctx, SIZE, SIZE, '#5A5853', 140, rng, 200, 0.12)
  blotches(ctx, SIZE, SIZE, '#F2F0EB', 80, rng, 160, 0.14)
  grain(ctx, SIZE, SIZE, 0.22, rng, 1)
  // Scratches
  ctx.save()
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'
  for (let i = 0; i < 40; i++) {
    ctx.lineWidth = 0.5 + rng()
    ctx.beginPath()
    const x = rng() * SIZE
    const y = rng() * SIZE
    ctx.moveTo(x, y)
    ctx.lineTo(x + (rng() - 0.5) * 240, y + (rng() - 0.5) * 60)
    ctx.stroke()
  }
  ctx.restore()

  // Grid + registration marks
  ctx.save()
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 1
  for (let i = 0; i <= SIZE; i += 128) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, SIZE)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(SIZE, i)
    ctx.stroke()
  }
  ctx.strokeStyle = c.ink
  ctx.lineWidth = 2
  for (const [x, y] of [
    [40, 40],
    [SIZE - 40, 40],
    [40, SIZE - 40],
    [SIZE - 40, SIZE - 40],
  ]) {
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 20, y)
    ctx.lineTo(x + 20, y)
    ctx.moveTo(x, y - 20)
    ctx.lineTo(x, y + 20)
    ctx.stroke()
  }
  ctx.restore()

  // Duotone portrait block
  const duo = (img: CanvasImageSource, x: number, y: number, w: number, h: number) => {
    const mono = toMono(img, w, h, 1.6)
    ctx.save()
    ctx.drawImage(mono, x, y)
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = c.accent
    ctx.fillRect(x, y, w, h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.restore()
  }
  duo(images[0], 512, 128, 512, 512)
  duo(images[1] ?? images[0], 0, 640, 256, 256)

  // Orange signal band with artist name
  ctx.save()
  ctx.fillStyle = c.accent
  ctx.fillRect(0, 640, SIZE, 96)
  ctx.fillStyle = c.ink
  ctx.font = `900 64px ${theme.fonts.display}`
  ctx.textBaseline = 'middle'
  ctx.fillText(`${profile.artistName.toUpperCase()} / ${profile.persona.short.toUpperCase()}`, 272, 690, 720)
  ctx.restore()

  // Oversized title, deliberately cropped by the edges
  ctx.save()
  ctx.fillStyle = c.ink
  ctx.font = `900 250px ${theme.fonts.display}`
  ctx.textBaseline = 'alphabetic'
  const title = profile.albumTitle.toUpperCase()
  const parts = title.includes('/') ? title.split('/') : title.split(' ')
  parts.slice(0, 2).forEach((p, i) => ctx.fillText(p, -12, 320 + i * 240 + (i ? 480 : 0)))
  if (parts.length === 1) ctx.fillText(title, -12, 960)
  ctx.restore()

  // Mono annotations
  ctx.save()
  ctx.fillStyle = c.ink
  ctx.font = `500 18px ${theme.fonts.accent}`
  ctx.textBaseline = 'top'
  ctx.fillText(profile.catalog, 70, 60)
  ctx.fillText(`${profile.stats.mainstream}/100 POP · ${profile.stats.eclecticism}/100 ECL`, 70, 86)
  ctx.fillText(`${theme.versionSuffix.toUpperCase()} · ${new Date().getFullYear()}`, 70, 112)
  ctx.textAlign = 'right'
  ctx.fillText(`${profile.families[0]?.label.toUpperCase() ?? ''} ${Math.round((profile.families[0]?.weight ?? 0) * 100)}%`, SIZE - 70, 60)
  ctx.restore()
  barcode(ctx, String(profile.stats.yearMinutes || 240000).padStart(12, '0'), 760, 760, 220, 60, c.ink)
}

function velvet(ctx: Ctx, { theme, profile, images, rng }: CoverInput): void {
  const c = theme.colors
  const g = ctx.createRadialGradient(SIZE / 2, SIZE * 0.45, 40, SIZE / 2, SIZE / 2, 760)
  g.addColorStop(0, mix(c.paper, '#ffffff', 0.18))
  g.addColorStop(0.6, c.paper)
  g.addColorStop(1, '#180409')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, SIZE, SIZE)
  blotches(ctx, SIZE, SIZE, '#000000', 80, rng, 220, 0.12)
  grain(ctx, SIZE, SIZE, 0.2, rng, 1)

  // Sunburst
  ctx.save()
  ctx.strokeStyle = withAlpha(c.foil, 0.35)
  ctx.lineWidth = 1.5
  for (let i = 0; i < 48; i++) {
    const a = Math.PI + (i / 47) * Math.PI
    ctx.beginPath()
    ctx.moveTo(SIZE / 2, 700)
    ctx.lineTo(SIZE / 2 + Math.cos(a) * 900, 700 + Math.sin(a) * 900)
    ctx.stroke()
  }
  ctx.restore()

  // Deco double frame with corner squares
  ctx.save()
  ctx.strokeStyle = c.foil
  ctx.lineWidth = 3
  ctx.strokeRect(44, 44, SIZE - 88, SIZE - 88)
  ctx.lineWidth = 1
  ctx.strokeRect(58, 58, SIZE - 116, SIZE - 116)
  ctx.fillStyle = c.foil
  for (const [x, y] of [
    [44, 44],
    [SIZE - 44, 44],
    [44, SIZE - 44],
    [SIZE - 44, SIZE - 44],
  ])
    ctx.fillRect(x - 10, y - 10, 20, 20)
  ctx.restore()

  // Circular vignettes
  const vignette = (img: CanvasImageSource, cx: number, cy: number, r: number) => {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 40
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    drawCover(ctx, img, cx - r, cy - r, r * 2, r * 2)
    const v = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(20,0,6,0.75)')
    ctx.fillStyle = v
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    ctx.restore()
    ctx.lineWidth = 6
    ctx.strokeStyle = metallicGradient(ctx, cx - r, cy - r, cx + r, cy + r, c.foil)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
  vignette(images[1] ?? images[0], 230, 560, 110)
  vignette(images[2] ?? images[0], 794, 560, 110)
  vignette(images[0], SIZE / 2, 470, 230)

  // Gold foil title
  ctx.save()
  ctx.textAlign = 'center'
  ctx.font = `500 26px ${theme.fonts.accent}`
  ctx.fillStyle = c.foil
  ctx.letterSpacing = '8px'
  ctx.fillText(`${profile.artistName.toUpperCase()}  ·  ${theme.versionSuffix.toUpperCase()}`, SIZE / 2, 130)
  ctx.letterSpacing = '0px'
  const t = fitText(ctx, profile.albumTitle, { maxWidth: 860, maxSize: 150, minSize: 70, weight: 900, family: theme.fonts.display, maxLines: 1 })
  ctx.font = `italic 900 ${t.size}px ${theme.fonts.display}`
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillText(t.lines[0], SIZE / 2 + 5, 845)
  ctx.fillStyle = metallicGradient(ctx, 100, 780, 920, 870, c.foil)
  ctx.fillText(t.lines[0], SIZE / 2, 840)
  ctx.font = `500 22px ${theme.fonts.accent}`
  ctx.fillStyle = c.ink
  ctx.letterSpacing = '6px'
  ctx.fillText(profile.persona.title.toUpperCase(), SIZE / 2, 905)
  ctx.restore()

  // Monogram
  ctx.save()
  ctx.strokeStyle = c.foil
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(SIZE / 2, 190, 32, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = c.foil
  ctx.font = `italic 900 30px ${theme.fonts.display}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(profile.artistName.slice(0, 1).toUpperCase(), SIZE / 2, 192)
  ctx.restore()

  // Foil sheen
  ctx.save()
  ctx.globalAlpha = 0.08
  ctx.fillStyle = holoGradient(ctx, 0, 0, SIZE, SIZE)
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.restore()
}

/** Shared 2D painting helpers for every album texture. */
import { hexToRgb, withAlpha } from '../lib/colors'
import type { Rng } from '../lib/rng'

export type Ctx = CanvasRenderingContext2D

export function makeCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is unavailable in this browser.')
  return { canvas, ctx }
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export function heartPath(ctx: Ctx, cx: number, cy: number, size: number): void {
  const s = size / 2
  ctx.beginPath()
  ctx.moveTo(cx, cy + s * 0.9)
  ctx.bezierCurveTo(cx - s * 1.6, cy - s * 0.2, cx - s * 0.9, cy - s * 1.3, cx, cy - s * 0.55)
  ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.3, cx + s * 1.6, cy - s * 0.2, cx, cy + s * 0.9)
  ctx.closePath()
}

export function starPath(ctx: Ctx, cx: number, cy: number, outer: number, inner: number, points = 5, rotation = -Math.PI / 2): void {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = rotation + (i * Math.PI) / points
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

/** Four-point sparkle. */
export function sparklePath(ctx: Ctx, cx: number, cy: number, size: number): void {
  ctx.beginPath()
  ctx.moveTo(cx, cy - size)
  ctx.quadraticCurveTo(cx, cy, cx + size, cy)
  ctx.quadraticCurveTo(cx, cy, cx, cy + size)
  ctx.quadraticCurveTo(cx, cy, cx - size, cy)
  ctx.quadraticCurveTo(cx, cy, cx, cy - size)
  ctx.closePath()
}

/** Film grain / paper noise overlay. */
export function grain(ctx: Ctx, width: number, height: number, alpha = 0.08, rng: Rng = Math.random, scale = 2): void {
  const w = Math.ceil(width / scale)
  const h = Math.ceil(height / scale)
  const { canvas: nc, ctx: nctx } = makeCanvas(w, h)
  const img = nctx.createImageData(w, h)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rng() * 255)
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  nctx.putImageData(img, 0, 0)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'overlay'
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(nc, 0, 0, width, height)
  ctx.restore()
}

/** Soft blotchy texture (concrete, velvet, kraft fibers). */
export function blotches(ctx: Ctx, width: number, height: number, color: string, count: number, rng: Rng, maxR = 120, alpha = 0.08): void {
  ctx.save()
  for (let i = 0; i < count; i++) {
    const x = rng() * width
    const y = rng() * height
    const r = 20 + rng() * maxR
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, withAlpha(color, alpha * (0.5 + rng())))
    g.addColorStop(1, withAlpha(color, 0))
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  ctx.restore()
}

export interface FitOptions {
  maxWidth: number
  maxSize: number
  minSize?: number
  weight?: number | string
  family: string
  lineHeight?: number
  maxLines?: number
}

/** Finds the largest font size at which text fits, wrapping into lines. */
export function fitText(ctx: Ctx, text: string, opts: FitOptions): { size: number; lines: string[] } {
  const { maxWidth, maxSize, minSize = 12, weight = 400, family, maxLines = 3 } = opts
  for (let size = maxSize; size >= minSize; size -= Math.max(1, Math.round(size * 0.06))) {
    ctx.font = `${weight} ${size}px ${family}`
    const lines = wrap(ctx, text, maxWidth)
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxWidth)) return { size, lines }
  }
  ctx.font = `${weight} ${minSize}px ${family}`
  return { size: minSize, lines: wrap(ctx, text, maxWidth).slice(0, maxLines) }
}

export function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

export function drawLines(ctx: Ctx, lines: string[], x: number, y: number, lineHeight: number): number {
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight))
  return y + lines.length * lineHeight
}

/** Draws an image covering a box (object-fit: cover). */
export function drawCover(ctx: Ctx, img: CanvasImageSource, x: number, y: number, w: number, h: number): void {
  const iw = 'videoWidth' in img ? (img as HTMLVideoElement).videoWidth : (img as HTMLImageElement | HTMLCanvasElement).width
  const ih = 'videoHeight' in img ? (img as HTMLVideoElement).videoHeight : (img as HTMLImageElement | HTMLCanvasElement).height
  const scale = Math.max(w / Number(iw), h / Number(ih))
  const sw = w / scale
  const sh = h / scale
  const sx = (Number(iw) - sw) / 2
  const sy = (Number(ih) - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

export function clipRoundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  roundRect(ctx, x, y, w, h, r)
  ctx.clip()
}

/** Simple EAN-ish barcode built from a numeric string. */
export function barcode(ctx: Ctx, digits: string, x: number, y: number, w: number, h: number, color = '#000'): void {
  const bits: number[] = []
  for (const ch of digits) {
    const n = Number(ch) || 0
    bits.push(1, (n >> 2) & 1, (n >> 1) & 1, n & 1, 1, n % 3 === 0 ? 1 : 0, 0)
  }
  const unit = w / bits.length
  ctx.save()
  ctx.fillStyle = color
  bits.forEach((b, i) => {
    if (b) ctx.fillRect(x + i * unit, y, Math.max(1, unit * 0.9), h)
  })
  ctx.restore()
}

export function halftone(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, spacing = 10, rng: Rng = Math.random, maxR = 3.2): void {
  ctx.save()
  ctx.fillStyle = color
  for (let yy = y; yy < y + h; yy += spacing) {
    for (let xx = x; xx < x + w; xx += spacing) {
      const t = (yy - y) / h
      const r = maxR * (0.25 + t * 0.75) * (0.7 + rng() * 0.3)
      ctx.beginPath()
      ctx.arc(xx + (rng() - 0.5) * 2, yy + (rng() - 0.5) * 2, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/** A strip of translucent washi tape. */
export function tape(ctx: Ctx, cx: number, cy: number, w: number, h: number, angle: number, color: string): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.globalAlpha = 0.72
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(-w / 2, -h / 2)
  ctx.lineTo(w / 2 - 6, -h / 2 + 2)
  ctx.lineTo(w / 2, h / 2)
  ctx.lineTo(-w / 2 + 5, h / 2 - 3)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 0.25
  ctx.fillStyle = '#fff'
  for (let i = -w / 2 + 6; i < w / 2; i += 14) ctx.fillRect(i, -h / 2 + 3, 2, h - 6)
  ctx.restore()
}

/** Circular rubber stamp. */
export function stamp(ctx: Ctx, cx: number, cy: number, r: number, color: string, topText: string, centerText: string, family: string, rng: Rng = Math.random): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((rng() - 0.5) * 0.5)
  ctx.globalAlpha = 0.82
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = r * 0.08
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = r * 0.03
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2)
  ctx.stroke()
  ctx.font = `700 ${r * 0.18}px ${family}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const chars = topText.toUpperCase().split('')
  const arc = Math.PI * 1.2
  chars.forEach((ch, i) => {
    const a = -Math.PI / 2 - arc / 2 + (arc * (i + 0.5)) / chars.length
    ctx.save()
    ctx.rotate(a)
    ctx.translate(0, -r * 0.88)
    ctx.rotate(Math.PI / 2 * 0)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  })
  ctx.font = `700 ${r * 0.26}px ${family}`
  const lines = centerText.split('\n')
  lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * r * 0.3))
  ctx.restore()
}

/** Coffee ring. */
export function coffeeRing(ctx: Ctx, cx: number, cy: number, r: number, rng: Rng = Math.random): void {
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.strokeStyle = '#6B4A2B'
  for (let i = 0; i < 3; i++) {
    ctx.lineWidth = 3 + rng() * 6
    ctx.globalAlpha = 0.12 + rng() * 0.2
    ctx.beginPath()
    ctx.arc(cx + (rng() - 0.5) * 6, cy + (rng() - 0.5) * 6, r * (0.9 + rng() * 0.12), rng() * 0.6, Math.PI * 2 - rng() * 0.6)
    ctx.stroke()
  }
  ctx.restore()
}

export function metallicGradient(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, base: string): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  const { r, gb, b } = (() => {
    const c = hexToRgb(base)
    return { r: c.r, gb: c.g, b: c.b }
  })()
  const light = `rgb(${Math.min(255, r + 70)}, ${Math.min(255, gb + 70)}, ${Math.min(255, b + 70)})`
  const dark = `rgb(${Math.max(0, r - 70)}, ${Math.max(0, gb - 70)}, ${Math.max(0, b - 70)})`
  g.addColorStop(0, light)
  g.addColorStop(0.3, base)
  g.addColorStop(0.5, '#ffffff')
  g.addColorStop(0.62, base)
  g.addColorStop(0.85, dark)
  g.addColorStop(1, light)
  return g
}

export function holoGradient(ctx: Ctx, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  const stops = ['#ffb3ec', '#fff2a8', '#b8ffd9', '#a8d8ff', '#d7b3ff', '#ffb3ec']
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c))
  return g
}

/** Simple vector glyphs for badges so stickers never rely on emoji. */
export function glyph(ctx: Ctx, kind: string, cx: number, cy: number, size: number, color: string): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(2, size * 0.1)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const s = size / 2
  switch (kind) {
    case 'moon':
      ctx.beginPath()
      ctx.arc(0, 0, s, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(s * 0.45, -s * 0.35, s * 0.85, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'sun':
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2)
      ctx.fill()
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * s * 0.7, Math.sin(a) * s * 0.7)
        ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s)
        ctx.stroke()
      }
      break
    case 'heart':
      heartPath(ctx, 0, 0, size * 0.9)
      ctx.fill()
      break
    case 'compass':
      ctx.beginPath()
      ctx.arc(0, 0, s, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.7)
      ctx.lineTo(s * 0.25, 0)
      ctx.lineTo(0, s * 0.7)
      ctx.lineTo(-s * 0.25, 0)
      ctx.closePath()
      ctx.fill()
      break
    case 'gem':
      ctx.beginPath()
      ctx.moveTo(-s, -s * 0.3)
      ctx.lineTo(-s * 0.5, -s)
      ctx.lineTo(s * 0.5, -s)
      ctx.lineTo(s, -s * 0.3)
      ctx.lineTo(0, s)
      ctx.closePath()
      ctx.fill()
      break
    case 'chart':
      ctx.beginPath()
      ctx.moveTo(-s, s * 0.6)
      ctx.lineTo(-s * 0.3, -s * 0.1)
      ctx.lineTo(s * 0.2, s * 0.3)
      ctx.lineTo(s, -s * 0.8)
      ctx.stroke()
      break
    case 'clock':
      ctx.beginPath()
      ctx.arc(0, 0, s, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.6)
      ctx.lineTo(0, 0)
      ctx.lineTo(s * 0.5, s * 0.3)
      ctx.stroke()
      break
    case 'globe':
      ctx.beginPath()
      ctx.arc(0, 0, s, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(0, 0, s * 0.45, s, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-s, 0)
      ctx.lineTo(s, 0)
      ctx.stroke()
      break
    case 'flame':
      ctx.beginPath()
      ctx.moveTo(0, -s)
      ctx.bezierCurveTo(s * 0.9, -s * 0.2, s * 0.9, s * 0.6, 0, s)
      ctx.bezierCurveTo(-s * 0.9, s * 0.6, -s * 0.6, 0, -s * 0.2, -s * 0.3)
      ctx.bezierCurveTo(-s * 0.1, -s * 0.6, 0, -s * 0.7, 0, -s)
      ctx.closePath()
      ctx.fill()
      break
    case 'star':
      starPath(ctx, 0, 0, s, s * 0.45)
      ctx.fill()
      break
    case 'disc':
      ctx.beginPath()
      ctx.arc(0, 0, s, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'advisory':
      ctx.beginPath()
      ctx.rect(-s, -s * 0.7, size, size * 0.7)
      ctx.fill()
      break
    default:
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2)
      ctx.fill()
  }
  ctx.restore()
}

import { hslToHex } from '../lib/colors'
import { hashString, mulberry32 } from '../lib/rng'
import { makeCanvas } from './paint'

/**
 * Loads an image for canvas use. Falls back to a procedural "portrait" when the
 * URL is missing, blocked, or cross-origin tainted (the demo mode has no URLs at all).
 */
export async function loadImageOrFallback(url: string | undefined, seed: string, label: string, size = 512): Promise<CanvasImageSource> {
  if (url) {
    const img = await loadImage(url, 7000)
    if (img) return img
  }
  return proceduralPortrait(seed, label, size)
}

function loadImage(url: string, timeoutMs: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = window.setTimeout(() => resolve(null), timeoutMs)
    img.onload = () => {
      window.clearTimeout(timer)
      // Verify the canvas can read it (otherwise the whole texture would be tainted).
      try {
        const { ctx } = makeCanvas(2, 2)
        ctx.drawImage(img, 0, 0, 2, 2)
        ctx.getImageData(0, 0, 1, 1)
        resolve(img)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      resolve(null)
    }
    img.src = url
  })
}

/** Abstract gradient portrait with initials — used whenever no artwork is available. */
export function proceduralPortrait(seed: string, label: string, size = 512): HTMLCanvasElement {
  const rng = mulberry32(hashString(seed))
  const { canvas, ctx } = makeCanvas(size, size)
  const hue = Math.floor(rng() * 360)
  const base = hslToHex(hue, 0.55, 0.42)
  const alt = hslToHex((hue + 40 + rng() * 60) % 360, 0.7, 0.6)
  const deep = hslToHex((hue + 200) % 360, 0.5, 0.25)
  const g = ctx.createLinearGradient(0, 0, size, size)
  g.addColorStop(0, base)
  g.addColorStop(1, deep)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 4; i++) {
    const x = rng() * size
    const y = rng() * size
    const r = size * (0.2 + rng() * 0.35)
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, i % 2 ? alt : base)
    rg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.75
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, size, size)
  }
  ctx.globalAlpha = 1
  // A soft "figure" silhouette so collages read as portraits.
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.beginPath()
  ctx.ellipse(size * 0.5, size * 0.42, size * 0.17, size * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(size * 0.5, size * 0.95, size * 0.36, size * 0.34, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  const initials = label
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = `700 ${size * 0.16}px "Space Grotesk Variable", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, size * 0.5, size * 0.44)
  return canvas
}

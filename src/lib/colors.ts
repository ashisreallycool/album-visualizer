export interface RGB {
  r: number
  g: number
  b: number
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  return rgbToHex({ r: ca.r + (cb.r - ca.r) * t, g: ca.g + (cb.g - ca.g) * t, b: ca.b + (cb.b - ca.b) * t })
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Picks whichever of the candidates reads best on the given background (WCAG contrast). */
export function readableOn(background: string, candidates: string[] = ['#111111', '#ffffff']): string {
  return candidates.reduce((best, c) => (contrastRatio(c, background) > contrastRatio(best, background) ? c : best))
}

export function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbToHex({ r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 })
}

/**
 * Extracts a few dominant colors from an image by bucketing a downscaled copy.
 * Returns [] when the image is cross-origin tainted or unreadable.
 */
export function extractPalette(source: CanvasImageSource, count = 4): string[] {
  try {
    const size = 24
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return []
    ctx.drawImage(source, 0, 0, size, size)
    const data = ctx.getImageData(0, 0, size, size).data
    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>()
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      // Skip near-greys so the palette carries the art's actual hue.
      if (max - min < 28) continue
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`
      const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 }
      bucket.r += r
      bucket.g += g
      bucket.b += b
      bucket.n += 1
      buckets.set(key, bucket)
    }
    return [...buckets.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, count)
      .map((b) => rgbToHex({ r: b.r / b.n, g: b.g / b.n, b: b.b / b.n }))
  } catch {
    return []
  }
}

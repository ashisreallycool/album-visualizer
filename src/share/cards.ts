import type { AlbumAssets } from '../textures/assets'
import { readableOn, withAlpha } from '../lib/colors'
import { formatHour, formatNumber } from '../lib/format'
import { drawCover, fitText, grain, makeCanvas, roundRect, wrap, type Ctx } from '../textures/paint'
import { seededRng } from '../lib/rng'

export type ShareLayout = 'story' | 'post' | 'portrait'

export const SHARE_SIZES: Record<ShareLayout, { w: number; h: number; label: string; hint: string }> = {
  story: { w: 1080, h: 1920, label: 'Story', hint: '9:16 · Instagram / TikTok story' },
  post: { w: 1080, h: 1080, label: 'Post', hint: '1:1 · feed post' },
  portrait: { w: 1080, h: 1350, label: 'Portrait', hint: '4:5 · feed post' },
}

function background(ctx: Ctx, assets: AlbumAssets, w: number, h: number): void {
  const c = assets.theme.colors
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, c.stage)
  g.addColorStop(1, c.floor)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  grain(ctx, w, h, 0.08, seededRng(assets.profile.user.id))
}

function stat(ctx: Ctx, x: number, y: number, label: string, value: string, ink: string, width: number): void {
  ctx.fillStyle = withAlpha(ink, 0.7)
  ctx.font = '500 22px "Space Mono", monospace'
  ctx.textBaseline = 'top'
  ctx.fillText(label.toUpperCase(), x, y)
  ctx.fillStyle = ink
  ctx.font = '700 44px "Space Grotesk Variable", sans-serif'
  ctx.fillText(value, x, y + 30, width)
}

export function renderShareCard(assets: AlbumAssets, layout: ShareLayout): HTMLCanvasElement {
  const { w, h } = SHARE_SIZES[layout]
  const { canvas, ctx } = makeCanvas(w, h)
  const p = assets.profile
  const c = assets.theme.colors
  background(ctx, assets, w, h)
  const ink = readableOn(c.stage, ['#111111', '#F7F4EE'])

  // Header
  ctx.fillStyle = ink
  ctx.font = '700 26px "Space Grotesk Variable", sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillText('WRAPPED ALBUM', 72, 64)
  ctx.font = '400 22px "Space Mono", monospace'
  ctx.fillStyle = withAlpha(ink, 0.75)
  ctx.textAlign = 'right'
  ctx.fillText(`${p.persona.short.toUpperCase()} · ${assets.theme.versionSuffix.toUpperCase()}`, w - 72, 68)
  ctx.textAlign = 'left'

  const coverSize = layout === 'story' ? 760 : layout === 'post' ? 520 : 640
  const coverX = layout === 'post' ? 72 : (w - coverSize) / 2
  const coverY = layout === 'story' ? 160 : 130
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 60
  ctx.shadowOffsetY = 30
  ctx.fillStyle = '#000'
  ctx.fillRect(coverX, coverY, coverSize, coverSize)
  ctx.restore()
  drawCover(ctx, assets.coverCanvas, coverX, coverY, coverSize, coverSize)

  // Photocard #1 peeking out
  const card = assets.cardCanvases[0]
  if (card) {
    const cw = coverSize * 0.3
    const ch = cw * 1.5
    ctx.save()
    ctx.translate(coverX + coverSize - cw * 0.35, coverY + coverSize - ch * 0.55)
    ctx.rotate(0.14)
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 30
    ctx.shadowOffsetY = 12
    ctx.fillStyle = '#fff'
    roundRect(ctx, -6, -6, cw + 12, ch + 12, 22)
    ctx.fill()
    ctx.shadowColor = 'transparent'
    roundRect(ctx, 0, 0, cw, ch, 18)
    ctx.clip()
    ctx.drawImage(card, 0, 0, cw, ch)
    ctx.restore()
  }

  // Text block
  let textX = 72
  let textY = coverY + coverSize + 60
  let textW = w - 144
  if (layout === 'post') {
    textX = coverX + coverSize + 56
    textY = coverY
    textW = w - textX - 72
  }
  ctx.fillStyle = ink
  const title = fitText(ctx, p.albumTitle, { maxWidth: textW, maxSize: layout === 'post' ? 64 : 92, minSize: 36, weight: assets.theme.fonts.displayWeight, family: assets.theme.fonts.display, maxLines: 2 })
  ctx.font = `${assets.theme.fonts.displayWeight} ${title.size}px ${assets.theme.fonts.display}`
  ctx.textBaseline = 'top'
  title.lines.forEach((l, i) => ctx.fillText(l, textX, textY + i * title.size * 1.05))
  textY += title.lines.length * title.size * 1.05 + 12
  ctx.font = '500 28px "Space Grotesk Variable", sans-serif'
  ctx.fillStyle = withAlpha(ink, 0.85)
  ctx.fillText(`${p.artistName} · ${p.persona.title}`, textX, textY, textW)
  textY += 56

  const topArtists = p.artists.slice(0, 5).map((a, i) => `${i + 1}. ${a.name}`)
  const cols = layout === 'post' ? 1 : 2
  const colW = textW / cols
  stat(ctx, textX, textY, 'Top artists', '', ink, colW)
  ctx.font = '500 30px "Space Grotesk Variable", sans-serif'
  ctx.fillStyle = ink
  topArtists.forEach((t, i) => ctx.fillText(t, textX, textY + 34 + i * 40, colW - 24))
  if (cols === 2) {
    const sx = textX + colW
    stat(ctx, sx, textY, 'Top genre', p.families[0]?.label ?? '—', ink, colW - 24)
    stat(ctx, sx, textY + 100, 'Listening pace', `${formatNumber(p.stats.minutesPerDay)} min/day`, ink, colW - 24)
    stat(ctx, sx, textY + 200, 'Peak hour', formatHour(p.stats.peakHour), ink, colW - 24)
  } else {
    textY += 34 + topArtists.length * 40 + 20
    stat(ctx, textX, textY, 'Top genre', p.families[0]?.label ?? '—', ink, textW)
    stat(ctx, textX, textY + 100, 'Listening pace', `${formatNumber(p.stats.minutesPerDay)} min/day`, ink, textW)
  }

  // Badges row
  const badgeY = h - 150
  let bx = 72
  for (const b of p.badges.slice(0, 5)) {
    ctx.font = '700 20px "Space Grotesk Variable", sans-serif'
    const bw = ctx.measureText(b.label).width + 40
    if (bx + bw > w - 72) break
    ctx.fillStyle = c.accent
    roundRect(ctx, bx, badgeY, bw, 48, 24)
    ctx.fill()
    ctx.fillStyle = readableOn(c.accent)
    ctx.textBaseline = 'middle'
    ctx.fillText(b.label, bx + 20, badgeY + 24)
    bx += bw + 12
  }
  ctx.textBaseline = 'top'
  ctx.fillStyle = withAlpha(ink, 0.7)
  ctx.font = '400 20px "Space Mono", monospace'
  const foot = `${p.catalog} · pressed ${new Date().toLocaleDateString()} · ${p.stats.minutesSource === 'estimate' ? 'pace estimated from recent plays' : 'minutes from your data export'}`
  wrap(ctx, foot, w - 144)
    .slice(0, 2)
    .forEach((l, i) => ctx.fillText(l, 72, h - 80 + i * 26))
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image.'))), 'image/png'))
}

export async function downloadCanvas(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const blob = await canvasToBlob(canvas)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function shareCanvas(canvas: HTMLCanvasElement, name: string, text: string): Promise<boolean> {
  if (!('share' in navigator)) return false
  const blob = await canvasToBlob(canvas)
  const file = new File([blob], name, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (nav.canShare && !nav.canShare({ files: [file] })) return false
  try {
    await navigator.share({ files: [file], text })
    return true
  } catch {
    return false
  }
}

export function summaryText(assets: AlbumAssets): string {
  const p = assets.profile
  return [
    `${p.albumTitle} — ${p.artistName} (${p.persona.title})`,
    `Top artists: ${p.artists.slice(0, 5).map((a) => a.name).join(', ')}`,
    `Top genre: ${p.families[0]?.label ?? '—'} · Peak hour ${formatHour(p.stats.peakHour)} · ${formatNumber(p.stats.minutesPerDay)} min/day`,
    `Badges: ${p.badges.map((b) => b.label).join(', ')}`,
  ].join('\n')
}

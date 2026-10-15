import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import type { AlbumAssets } from '../textures/assets'
import { useApp } from '../store'
import { paintPolaroid } from '../textures/parts'
import { downloadCanvas } from '../share/cards'

interface Print {
  id: number
  url: string
  canvas: HTMLCanvasElement
  caption: string
}

/** Instant prints from the digicam add-in. */
export function Polaroids({ assets }: { assets: AlbumAssets }) {
  const photosTaken = useApp((s) => s.unbox.photosTaken)
  const [prints, setPrints] = useState<Print[]>([])

  useEffect(() => {
    if (photosTaken === 0) {
      setPrints([])
      return
    }
    const i = (photosTaken - 1) % 5
    const artist = assets.profile.artists[i]
    const night = assets.profile.stats.nightShare >= 0.3
    const d = new Date()
    if (night) d.setHours(Math.floor(Math.random() * 4), Math.floor(Math.random() * 60))
    const time = d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    const canvas = paintPolaroid(assets.theme, assets.profile, assets.images[i] ?? assets.images[0], artist?.name ?? assets.profile.artistName, time)
    const print: Print = { id: photosTaken, url: canvas.toDataURL('image/jpeg', 0.85), canvas, caption: artist?.name ?? '' }
    setPrints((prev) => [...prev.slice(-2), print])
  }, [photosTaken, assets])

  if (!prints.length) return null
  return (
    <div className="prints" aria-live="polite">
      {prints.map((p, i) => (
        <figure key={p.id} className="print card" style={{ ['--i' as string]: i }}>
          <img src={p.url} alt={`Instant photo of ${p.caption}`} />
          <figcaption className="print-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void downloadCanvas(p.canvas, `wrapped-print-${p.id}.png`)}>
              <Download aria-hidden="true" /> Save
            </button>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setPrints((prev) => prev.filter((x) => x.id !== p.id))} aria-label="Discard print">
              <X aria-hidden="true" />
            </button>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

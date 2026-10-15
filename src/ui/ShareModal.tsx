import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Download, Share2, X } from 'lucide-react'
import type { AlbumAssets } from '../textures/assets'
import { downloadCanvas, renderShareCard, SHARE_SIZES, shareCanvas, summaryText, type ShareLayout } from '../share/cards'
import { markShared } from '../app/actions'
import { useApp } from '../store'

export function ShareModal({ assets, onClose }: { assets: AlbumAssets; onClose: () => void }) {
  const [layout, setLayout] = useState<ShareLayout>('story')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const toast = useApp((s) => s.toast)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  const canvas = useMemo(() => renderShareCard(assets, layout), [assets, layout])
  const preview = useMemo(() => canvas.toDataURL('image/jpeg', 0.82), [canvas])
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator
  const fileName = `wrapped-album-${layout}-${assets.profile.catalog}.png`

  const download = async () => {
    setBusy(true)
    try {
      await downloadCanvas(canvas, fileName)
      markShared()
      toast('Saved. Post it, print it, frame it.', 'success')
    } finally {
      setBusy(false)
    }
  }
  const share = async () => {
    setBusy(true)
    try {
      const ok = await shareCanvas(canvas, fileName, summaryText(assets))
      if (ok) markShared()
      else await downloadCanvas(canvas, fileName)
      markShared()
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText(assets))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Could not copy — your browser blocked clipboard access.', 'error')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card modal-share" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div className="modal-head">
          <h2 id="share-title">Share your album</h2>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close share">
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="share-grid">
          <div className="share-preview" style={{ aspectRatio: `${SHARE_SIZES[layout].w} / ${SHARE_SIZES[layout].h}` }}>
            <img src={preview} alt={`${SHARE_SIZES[layout].label} share card for ${assets.profile.albumTitle}`} />
          </div>
          <div className="share-controls">
            <fieldset className="layouts">
              <legend className="mono muted">Layout</legend>
              {(Object.keys(SHARE_SIZES) as ShareLayout[]).map((key) => (
                <label key={key} className={`layout-option ${layout === key ? 'selected' : ''}`}>
                  <input type="radio" name="layout" value={key} checked={layout === key} onChange={() => setLayout(key)} />
                  <span className="layout-name">{SHARE_SIZES[key].label}</span>
                  <span className="muted small">{SHARE_SIZES[key].hint}</span>
                </label>
              ))}
            </fieldset>
            <div className="share-actions">
              <button type="button" className="btn btn-primary" onClick={() => void download()} disabled={busy}>
                <Download aria-hidden="true" /> Download PNG
              </button>
              {canShare && (
                <button type="button" className="btn" onClick={() => void share()} disabled={busy}>
                  <Share2 aria-hidden="true" /> Share…
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => void copy()}>
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {copied ? 'Copied' : 'Copy text summary'}
              </button>
            </div>
            <p className="muted small">The card is drawn in your browser from your album textures. No upload happens.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

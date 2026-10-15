import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, BookOpen, Camera, ChevronLeft, ChevronRight, CreditCard, Disc3, Eye, IdCard, KeyRound, LogOut, MoreHorizontal, Package, RotateCcw, Scissors, Share2, Shuffle, SkipForward, Sticker, Tag, X } from 'lucide-react'
import { useApp, type Focus, type InspectId } from '../store'
import type { AlbumAssets } from '../textures/assets'
import { DEMO_PERSONAS, disconnect, restartUnboxing, startDemo } from '../app/boot'
import { focusOn, nextPage, prevPage, stickDefault } from '../app/actions'
import type { Step } from './guide'

interface InventoryItem {
  id: string
  label: string
  Icon: typeof Package
  status: string
  done: boolean
  focus: Focus
  inspect?: InspectId
}

export function Hud({ steps, assets }: { steps: Step[]; assets: AlbumAssets }) {
  const profile = assets.profile
  const unbox = useApp((s) => s.unbox)
  const focus = useApp((s) => s.focus)
  const setStatsOpen = useApp((s) => s.setStatsOpen)
  const setShareOpen = useApp((s) => s.setShareOpen)
  const setInspect = useApp((s) => s.setInspect)
  const demoPersonaId = useApp((s) => s.demoPersonaId)
  const [skipped, setSkipped] = useState<string[]>([])
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const moreRef = useRef<HTMLDetailsElement>(null)

  // Close the overflow menu on outside click or Escape.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const d = moreRef.current
      if (d?.open && !d.contains(e.target as Node)) d.open = false
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && moreRef.current?.open) moreRef.current.open = false
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const current = steps.find((s) => !s.done(unbox) && !skipped.includes(s.id))
  const doneCount = steps.filter((s) => s.done(unbox)).length
  const addInIcon = profile.addIn === 'digicam' ? Camera : profile.addIn === 'keychain' ? KeyRound : Disc3
  const addInLabel = profile.addIn === 'digicam' ? 'Digicam' : profile.addIn === 'keychain' ? 'Passport keychain' : 'CD player'

  const inventory: InventoryItem[] = useMemo(
    () => [
      { id: 'hype', label: 'Hype sticker', Icon: Tag, status: unbox.stickerPeeled ? 'peeled' : 'on the wrap', done: unbox.stickerPeeled, focus: 'lid', inspect: 'hype' },
      { id: 'wrap', label: 'Shrink wrap', Icon: Scissors, status: unbox.wrapTorn ? 'torn' : 'sealed', done: unbox.wrapTorn, focus: 'lid' },
      { id: 'cover', label: 'Cover + lid', Icon: Package, status: unbox.lidOpen ? 'open' : 'closed', done: unbox.lidOpen, focus: 'lid', inspect: 'cover' },
      { id: 'book', label: 'Photobook', Icon: BookOpen, status: unbox.bookOut ? `page ${unbox.page + 1}` : 'in the box', done: unbox.bookOut, focus: 'book', inspect: 'book' },
      { id: 'cards', label: 'Photocards', Icon: IdCard, status: `${unbox.cardsPulled} / 5 pulled`, done: unbox.cardsPulled >= 5, focus: 'cards', inspect: 'cards' },
      { id: 'disc', label: 'Disc', Icon: Disc3, status: unbox.discInPlayer ? (unbox.playing ? 'playing' : 'paused') : unbox.discOut ? 'out' : 'sleeved', done: unbox.discOut, focus: 'disc', inspect: 'disc' },
      { id: 'addin', label: addInLabel, Icon: addInIcon, status: unbox.addInUsed ? 'used' : 'waiting', done: unbox.addInUsed, focus: 'addin', inspect: 'addin' },
      { id: 'stickers', label: 'Sticker sheet', Icon: Sticker, status: `${unbox.stickersPlaced.length} placed`, done: unbox.stickersPlaced.length > 0, focus: 'stickers', inspect: 'stickers' },
      { id: 'card', label: 'Listener card', Icon: CreditCard, status: 'stats insert', done: focus === 'card', focus: 'card', inspect: 'card' },
    ],
    [unbox, focus, addInIcon, addInLabel],
  )

  const trayStickers = unbox.tray.filter((id) => !unbox.stickersPlaced.some((p) => p.stickerId === id))

  return (
    <>
      <header className="hud-top">
        <div className="hud-brand card">
          <span className="brand">Wrapped Album</span>
          <span className="chip chip-accent">{assets.theme.name}</span>
          <span className="chip">{profile.persona.short} · {assets.theme.versionSuffix}</span>
        </div>
        <nav className="hud-nav card" aria-label="Album tools">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatsOpen(true)}>
            <BarChart3 aria-hidden="true" /> Stats
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShareOpen(true)}>
            <Share2 aria-hidden="true" /> Share
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setInventoryOpen((v) => !v)} aria-expanded={inventoryOpen} aria-controls="inventory">
            <Package aria-hidden="true" /> Inclusions
          </button>
          <details ref={moreRef} className="more">
            <summary className="btn btn-ghost btn-sm" aria-label="More actions">
              <MoreHorizontal aria-hidden="true" /> More
            </summary>
            <div className="more-menu card">
              {profile.source === 'demo' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const i = DEMO_PERSONAS.findIndex((p) => p.id === demoPersonaId)
                    void startDemo(DEMO_PERSONAS[(i + 1) % DEMO_PERSONAS.length].id)
                  }}
                >
                  <Shuffle aria-hidden="true" /> Next demo taste
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={restartUnboxing}>
                <RotateCcw aria-hidden="true" /> Re-wrap and unbox again
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={disconnect}>
                <LogOut aria-hidden="true" /> {profile.source === 'demo' ? 'Exit demo' : 'Disconnect Spotify'}
              </button>
            </div>
          </details>
        </nav>
      </header>

      <aside id="inventory" className={`inventory card ${inventoryOpen ? 'open' : ''}`} aria-label="Inclusions">
        <div className="inventory-head">
          <span className="mono">Inclusions · {doneCount}/{steps.length} steps</span>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setInventoryOpen(false)} aria-label="Hide inclusions">
            <X aria-hidden="true" />
          </button>
        </div>
        <ul>
          {inventory.map((item) => (
            <li key={item.id} className={item.done ? 'done' : ''}>
              <button type="button" className="inventory-item" onClick={() => focusOn(item.focus)} aria-current={focus === item.focus ? 'true' : undefined}>
                <item.Icon aria-hidden="true" />
                <span className="inventory-label">{item.label}</span>
                <span className="inventory-status muted">{item.status}</span>
              </button>
              {item.inspect && (
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setInspect(item.inspect!)} aria-label={`Read the ${item.label}`}>
                  <Eye aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {trayStickers.length > 0 && (
          <div className="tray">
            <span className="mono">Sticker tray</span>
            {trayStickers.map((id) => {
              const st = assets.stickers.find((s) => s.id === id)
              return (
                <button key={id} type="button" className="btn btn-sm" onClick={() => stickDefault(id)}>
                  <Sticker aria-hidden="true" /> Stick “{st?.label ?? id}” on the cover
                </button>
              )
            })}
          </div>
        )}
      </aside>

      <div className="hud-bottom">
        {focus === 'book' && unbox.bookOut && (
          <div className="pager card" role="group" aria-label="Photobook pages">
            <button type="button" className="btn btn-ghost btn-sm" onClick={prevPage} disabled={unbox.page === 0}>
              <ChevronLeft aria-hidden="true" /> Previous page
            </button>
            <span className="mono">page {unbox.page + 1} / 5</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={nextPage} disabled={unbox.page >= 4}>
              Next page <ChevronRight aria-hidden="true" />
            </button>
          </div>
        )}
        {current ? (
          <section className="guide card" aria-live="polite" aria-labelledby="guide-title">
            <div className="guide-text">
              <span className="mono muted">
                Step {steps.indexOf(current) + 1} of {steps.length}
                {current.progress?.(unbox) ? ` · ${current.progress(unbox)}` : ''}
              </span>
              <h2 id="guide-title">{current.title}</h2>
              <p className="muted">{current.hint}</p>
            </div>
            <div className="guide-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (focus !== current.focus) focusOn(current.focus)
                  current.run()
                }}
              >
                {current.action}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSkipped((s) => [...s, current.id])}>
                <SkipForward aria-hidden="true" /> Skip
              </button>
            </div>
          </section>
        ) : (
          <section className="guide card" aria-live="polite">
            <div className="guide-text">
              <span className="mono muted">Unboxed</span>
              <h2>Fully unboxed</h2>
              <p className="muted">Drag to orbit, tap anything to inspect it, or re-wrap and go again.</p>
            </div>
            <div className="guide-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShareOpen(true)}>
                <Share2 aria-hidden="true" /> Share
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => focusOn('overview')}>
                Overview
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  )
}

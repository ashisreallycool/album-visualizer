import { useEffect, useState } from 'react'
import { ArrowRight, Camera, Disc3, KeyRound, Lock, Shuffle, Sticker } from 'lucide-react'
import { useApp } from '../store'
import { connectSpotify, startDemo, DEMO_PERSONAS } from '../app/boot'
import { getClientId } from '../spotify/auth'
import { THEME_LIST } from '../themes'
import { analyze } from '../analysis/analyze'
import { buildDemoData } from '../data/demo'
import { buildAlbumAssets, disposeAssets, type AlbumAssets } from '../textures/assets'
import { SetupPanel } from './SetupPanel'
import { Scene } from '../three/Scene'

const FEATURES = [
  { icon: Disc3, title: 'Cover ↔ your genres', text: 'The dominant genre family picks one of six album versions — scrapbook, acid Y2K, newsprint, coquette, concrete or velvet.' },
  { icon: Sticker, title: 'Stickers ↔ your habits', text: 'Night owl, deep cut, loyalist, explorer… peel the badges you earned and stick them anywhere.' },
  { icon: Camera, title: 'Add-in ↔ your behaviour', text: 'Late-night listeners get a digicam, explorers a passport keychain, everyone else a CD player that spins your top track.' },
  { icon: KeyRound, title: 'Photocards ↔ top artists', text: 'Five pulls from a frosted sleeve. Your number one comes in holo.' },
]

export function Landing() {
  const setupOpen = useApp((s) => s.setupOpen)
  const setSetupOpen = useApp((s) => s.setSetupOpen)
  const reduced = useApp((s) => s.reducedMotion)
  const [teaser, setTeaser] = useState<AlbumAssets | null>(null)
  const hasClient = Boolean(getClientId())

  // Build a demo album in the background to float behind the hero.
  useEffect(() => {
    let cancelled = false
    let built: AlbumAssets | null = null
    const persona = DEMO_PERSONAS[Math.floor(Math.random() * DEMO_PERSONAS.length)]
    const timer = window.setTimeout(() => {
      buildAlbumAssets(analyze(buildDemoData(persona)))
        .then((a) => {
          if (cancelled) disposeAssets(a)
          else {
            built = a
            setTeaser(a)
          }
        })
        .catch(() => {})
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      disposeAssets(built)
    }
  }, [])

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true">
        {teaser && <Scene assets={teaser} teaser />}
      </div>
      <div className="landing-content">
        <header className="landing-header">
          <span className="brand">Wrapped Album</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSetupOpen(true)}>
            <Lock aria-hidden="true" /> Setup
          </button>
        </header>

        <section className={`hero card ${reduced ? '' : 'fade-up'}`} aria-labelledby="hero-title">
          <p className="mono muted">Your listening year, pressed</p>
          <h1 id="hero-title">
            Your year,
            <br />
            pressed.
          </h1>
          <p className="lede">
            Connect Spotify and we press your listening habits into an album you can actually unbox: tear the shrink wrap, peel the hype sticker, pull
            photocards, spin the disc, stick the badges you earned.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => void connectSpotify()}>
              Connect Spotify <ArrowRight aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-lg" onClick={() => void startDemo()}>
              <Shuffle aria-hidden="true" /> Try the demo
            </button>
          </div>
          <p className="hero-note muted">
            {hasClient ? 'Spotify app configured. ' : 'Needs a free Spotify developer app — one-time setup, 2 minutes. '}
            Everything runs in your browser; nothing is uploaded anywhere.
          </p>
        </section>

        <section className="features" aria-label="What is inside">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature card">
              <f.icon aria-hidden="true" />
              <h2>{f.title}</h2>
              <p>{f.text}</p>
            </article>
          ))}
        </section>

        <section className="versions card" aria-labelledby="versions-title">
          <h2 id="versions-title">Six album versions</h2>
          <p className="muted">Like K-pop album versions, the packaging changes with your taste. Try each in the demo.</p>
          <ul className="version-list">
            {THEME_LIST.map((t, i) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="version"
                  style={{ ['--swatch' as string]: t.colors.paper, ['--swatch-2' as string]: t.colors.accent }}
                  onClick={() => void startDemo(DEMO_PERSONAS[i]?.id)}
                >
                  <span className="swatch" aria-hidden="true" />
                  <span className="version-name">{t.name}</span>
                  <span className="version-sub muted">{t.versionSuffix}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <footer className="landing-footer muted">
          <p>
            Built on the Spotify Web API (top artists, top tracks, recently played). Minutes are estimated from your recent pace unless you import your
            Spotify data export. Not affiliated with Spotify.
          </p>
        </footer>
      </div>
      {setupOpen && <SetupPanel onClose={() => setSetupOpen(false)} />}
    </div>
  )
}

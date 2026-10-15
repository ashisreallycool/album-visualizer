import { useEffect, useRef } from 'react'
import { ExternalLink, X } from 'lucide-react'
import type { InspectId } from '../store'
import type { AlbumAssets } from '../textures/assets'
import { formatCompact, formatDuration, formatHour, formatNumber } from '../lib/format'

const TITLES: Record<InspectId, string> = {
  cover: 'Cover and liner notes',
  book: 'Photobook',
  cards: 'Photocards',
  disc: 'Disc',
  addin: 'Add-in',
  stickers: 'Sticker sheet',
  card: 'Listener card',
  hype: 'Hype sticker',
}

/** Plain-text twin of everything printed on the album, for readers and screen readers. */
export function InspectPanel({ id, assets, onClose }: { id: InspectId; assets: AlbumAssets; onClose: () => void }) {
  const p = assets.profile
  const s = p.stats
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
  }, [id])

  const link = (url?: string) =>
    url ? (
      <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">
        Open in Spotify <ExternalLink aria-hidden="true" />
      </a>
    ) : null

  return (
    <aside className="panel card" role="dialog" aria-modal="false" aria-labelledby="inspect-title">
      <div className="panel-head">
        <h2 id="inspect-title">{TITLES[id]}</h2>
        <button ref={closeRef} type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close panel">
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="panel-body">
        {id === 'cover' && (
          <>
            <img className="inspect-image" src={assets.coverCanvas.toDataURL('image/jpeg', 0.85)} alt={`Album cover in the ${assets.theme.name} style: ${p.albumTitle} by ${p.artistName}`} />
            <h3>{p.albumTitle}</h3>
            <p className="muted">
              {p.artistName} · {p.persona.title} · {assets.theme.versionSuffix}
            </p>
            <p>{assets.theme.mood}</p>
            <h4>Why this version</h4>
            <p>
              Your top genre families are {p.families.slice(0, 3).map((f) => `${f.label} (${Math.round(f.weight * 100)}%)`).join(', ')}. They vote for the{' '}
              {assets.theme.name} packaging.
            </p>
            <h4>Liner notes</h4>
            <p>{p.linerNotes}</p>
            <h4>Thanks to</h4>
            <p>{p.artists.slice(0, 12).map((a) => a.name).join(' · ')}</p>
          </>
        )}
        {id === 'hype' && (
          <>
            <p className="kicker mono">Featuring the hit single</p>
            <h3>“{p.tracks[0]?.name}”</h3>
            <p className="muted">
              {p.tracks[0]?.artist} · {p.tracks.length} tracks · top artist {p.artists[0]?.name}
            </p>
            {link(p.tracks[0]?.url)}
          </>
        )}
        {id === 'book' && (
          <>
            <h3>Page 1 · Your top five</h3>
            <ol>
              {p.artists.slice(0, 5).map((a) => (
                <li key={a.id}>{a.name}</li>
              ))}
            </ol>
            <h3>Page 2 · On repeat</h3>
            <ol>
              {p.tracks.slice(0, 10).map((t) => (
                <li key={t.id}>
                  {t.name} <span className="muted">— {t.artist} · {formatDuration(t.durationMs)}</span>
                </li>
              ))}
            </ol>
            <h3>Page 3 · When you listen</h3>
            <p>
              Peak hour {formatHour(s.peakHour)}. {Math.round(s.nightShare * 100)}% of recent plays after midnight. Median release year {s.medianReleaseYear}.
            </p>
            <h3>Page 4 · Genre map</h3>
            <ul>
              {p.families.slice(0, 6).map((f) => (
                <li key={f.family}>
                  {f.label} — {Math.round(f.weight * 100)}%
                </li>
              ))}
            </ul>
            <h3>Page 5 · Liner notes</h3>
            <p>{p.linerNotes}</p>
            <h3>Back cover · Tracklist</h3>
            <ol>
              {p.tracks.slice(0, 6).map((t) => (
                <li key={t.id}>{t.name}</li>
              ))}
            </ol>
          </>
        )}
        {id === 'cards' && (
          <ol className="card-list">
            {p.artists.slice(0, 5).map((a, i) => (
              <li key={a.id}>
                <img src={assets.cardCanvases[i]?.toDataURL('image/jpeg', 0.8)} alt="" width={64} height={96} />
                <div>
                  <h3>
                    #{i + 1} {a.name} {i === 0 && <span className="chip chip-accent">holo</span>}
                  </h3>
                  <p className="muted">
                    {a.genres.slice(0, 3).join(', ') || 'uncharted'} · {formatCompact(a.followers)} followers · popularity {a.popularity}/100
                  </p>
                  <p>
                    Your rank — 4 weeks: {a.ranks.short_term ? `#${a.ranks.short_term}` : '—'} · 6 months: {a.ranks.medium_term ? `#${a.ranks.medium_term}` : '—'} · all time:{' '}
                    {a.ranks.long_term ? `#${a.ranks.long_term}` : '—'}
                  </p>
                  {link(a.url)}
                </div>
              </li>
            ))}
          </ol>
        )}
        {id === 'disc' && (
          <>
            <img className="inspect-image round" src={assets.discCanvas.toDataURL('image/jpeg', 0.85)} alt={`Disc label: ${p.albumTitle}`} />
            <h3>{p.albumTitle}</h3>
            <p className="muted">
              {p.tracks.length} tracks · {p.catalog} · top artist {p.artists[0]?.name}
            </p>
            <p>
              The disc colour comes from the {assets.theme.name} version. At your recent pace you would press {formatNumber(s.yearMinutes)} minutes in a year
              {s.minutesSource === 'estimate' ? ' (estimated from recently played)' : ' (from your data export)'}.
            </p>
          </>
        )}
        {id === 'addin' && (
          <>
            {p.addIn === 'cd-player' && (
              <>
                <h3>CD player</h3>
                <p>
                  You got the player because you listen in a steady, loyal way{s.loyalArtist ? ` — ${s.loyalArtist} never left your top 10` : ''}. Drop the disc in and it
                  spins your number one: “{p.tracks[0]?.name}”.
                </p>
                {link(p.tracks[0]?.url)}
              </>
            )}
            {p.addIn === 'digicam' && (
              <>
                <h3>Digicam</h3>
                <p>
                  {Math.round(s.nightShare * 100)}% of your recent plays landed between midnight and 5am, so you got the night-shot camera. Every tap prints a concept
                  photo with a timestamp.
                </p>
              </>
            )}
            {p.addIn === 'keychain' && (
              <>
                <h3>Passport keychain</h3>
                <p>
                  {Math.round(s.discoveryRate * 100)}% of this month's top artists are new to your all-time list and your eclecticism is {s.eclecticism}/100, so you got the
                  luggage tag. Visas stamped:
                </p>
                <ul>
                  {p.families.slice(0, 5).map((f) => (
                    <li key={f.family}>
                      {f.label} — {Math.round(f.weight * 100)}%
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
        {id === 'stickers' && (
          <ul className="badge-list">
            {p.badges.map((b) => (
              <li key={b.id}>
                <img src={assets.stickers.find((st) => st.id === b.id)?.canvas.toDataURL()} alt="" width={56} height={56} />
                <div>
                  <h3>{b.label}</h3>
                  <p className="muted">{b.blurb}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {id === 'card' && (
          <dl className="stat-grid">
            <div>
              <dt>Listening pace</dt>
              <dd>{formatNumber(s.minutesPerDay)} min / day</dd>
              <dd className="muted">{s.minutesSource === 'estimate' ? 'estimated from recent plays' : 'from your data export'}</dd>
            </div>
            <div>
              <dt>Year at this pace</dt>
              <dd>{formatNumber(s.yearMinutes)} min</dd>
            </div>
            <div>
              <dt>Peak hour</dt>
              <dd>{formatHour(s.peakHour)}</dd>
            </div>
            <div>
              <dt>Top genre</dt>
              <dd>{p.families[0]?.label}</dd>
            </div>
            <div>
              <dt>Artists in rotation</dt>
              <dd>{s.distinctArtists}</dd>
            </div>
            <div>
              <dt>Average track</dt>
              <dd>{formatDuration(s.avgTrackSec * 1000)}</dd>
            </div>
            <div>
              <dt>Mainstream meter</dt>
              <dd>{s.mainstream} / 100</dd>
            </div>
            <div>
              <dt>Eclecticism</dt>
              <dd>{s.eclecticism} / 100</dd>
            </div>
          </dl>
        )}
      </div>
    </aside>
  )
}

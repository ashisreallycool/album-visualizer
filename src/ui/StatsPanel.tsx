import { useEffect, useRef } from 'react'
import { ExternalLink, Upload, X } from 'lucide-react'
import type { AlbumAssets } from '../textures/assets'
import { formatCompact, formatDuration, formatHour, formatNumber } from '../lib/format'
import { importHistory } from '../app/boot'
import { THEME_LIST } from '../themes'

export function StatsPanel({ assets, onClose }: { assets: AlbumAssets; onClose: () => void }) {
  const p = assets.profile
  const s = p.stats
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
  }, [])
  const maxHour = Math.max(1, ...s.byHour)

  return (
    <aside className="panel card panel-wide" role="dialog" aria-modal="false" aria-labelledby="stats-title">
      <div className="panel-head">
        <h2 id="stats-title">Your listening archive</h2>
        <button ref={closeRef} type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close stats">
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="panel-body">
        <section>
          <p className="kicker mono">Personality</p>
          <h3>{p.persona.title}</h3>
          <p className="muted">{p.persona.tagline}</p>
          <p>
            Album version: <strong>{assets.theme.name}</strong> ({assets.theme.versionSuffix}). {assets.theme.inspiration}.
          </p>
          <ul className="theme-scores" aria-label="Version scores">
            {THEME_LIST.map((t) => {
              const score = p.themeScores[t.id]
              const max = Math.max(...Object.values(p.themeScores), 0.001)
              return (
                <li key={t.id}>
                  <span className="theme-score-label">{t.name}</span>
                  <span className="bar" aria-hidden="true">
                    <span style={{ width: `${(score / max) * 100}%`, background: t.id === p.theme ? 'var(--accent)' : 'var(--fg-muted)' }} />
                  </span>
                  <span className="mono muted">{Math.round(score * 100)}</span>
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <p className="kicker mono">Top artists</p>
          <ol className="rank-list">
            {p.artists.slice(0, 5).map((a, i) => (
              <li key={a.id}>
                <span className="rank">{i + 1}</span>
                <span className="rank-main">
                  <strong>{a.name}</strong>
                  <span className="muted"> · {a.genres.slice(0, 2).join(', ') || 'uncharted'}</span>
                </span>
                {a.url && (
                  <a href={a.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-icon btn-sm" aria-label={`Open ${a.name} in Spotify`}>
                    <ExternalLink aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <p className="kicker mono">Top tracks</p>
          <ol className="rank-list">
            {p.tracks.slice(0, 10).map((t, i) => (
              <li key={t.id}>
                <span className="rank">{i + 1}</span>
                <span className="rank-main">
                  <strong>{t.name}</strong>
                  <span className="muted">
                    {' '}
                    · {t.artist} · {formatDuration(t.durationMs)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <p className="kicker mono">Genre families</p>
          <ul className="bars" aria-label="Share of listening by genre family">
            {p.families.slice(0, 8).map((f) => (
              <li key={f.family}>
                <span className="bar-label">{f.label}</span>
                <span className="bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(2, f.weight * 100)}%` }} />
                </span>
                <span className="mono">{Math.round(f.weight * 100)}%</span>
              </li>
            ))}
          </ul>
          <p className="muted small">{p.genres.slice(0, 12).map((g) => g.name).join(' · ')}</p>
        </section>

        <section>
          <p className="kicker mono">When you listen</p>
          <div className="hours" role="img" aria-label={`Plays by hour of day. Peak at ${formatHour(s.peakHour)}; ${Math.round(s.nightShare * 100)} percent after midnight.`}>
            {s.byHour.map((v, h) => (
              <span key={h} className={`hour ${h < 5 ? 'night' : ''}`} style={{ height: `${Math.max(4, (v / maxHour) * 100)}%` }} title={`${formatHour(h)}: ${v}`} />
            ))}
          </div>
          <div className="hours-axis mono muted" aria-hidden="true">
            <span>12am</span>
            <span>6am</span>
            <span>12pm</span>
            <span>6pm</span>
            <span>11pm</span>
          </div>
          <p>
            Peak hour {formatHour(s.peakHour)}. {Math.round(s.nightShare * 100)}% of recent plays were between midnight and 5am.
          </p>
        </section>

        <section>
          <p className="kicker mono">Archive</p>
          <dl className="stat-grid">
            <div>
              <dt>Listening pace</dt>
              <dd>{formatNumber(s.minutesPerDay)} min / day</dd>
              <dd className="muted">{s.minutesSource === 'estimate' ? 'estimated from your last 50 plays' : 'from your data export'}</dd>
            </div>
            <div>
              <dt>Year at this pace</dt>
              <dd>{formatNumber(s.yearMinutes)} min</dd>
              <dd className="muted">≈ {formatNumber(s.yearMinutes / 60)} hours</dd>
            </div>
            {s.history && (
              <div>
                <dt>On record</dt>
                <dd>{formatNumber(s.history.totalMinutes)} min</dd>
                <dd className="muted">{formatCompact(s.history.plays)} plays imported</dd>
              </div>
            )}
            <div>
              <dt>Mainstream meter</dt>
              <dd>{s.mainstream} / 100</dd>
            </div>
            <div>
              <dt>Eclecticism</dt>
              <dd>{s.eclecticism} / 100</dd>
            </div>
            <div>
              <dt>Discovery rate</dt>
              <dd>{Math.round(s.discoveryRate * 100)}%</dd>
              <dd className="muted">new artists in your 4-week top 50</dd>
            </div>
            <div>
              <dt>Repeat rate</dt>
              <dd>{Math.round(s.repeatRate * 100)}%</dd>
            </div>
            <div>
              <dt>Median release year</dt>
              <dd>{s.medianReleaseYear}</dd>
            </div>
            <div>
              <dt>Average track</dt>
              <dd>{formatDuration(s.avgTrackSec * 1000)}</dd>
            </div>
            <div>
              <dt>Explicit share</dt>
              <dd>{Math.round(s.explicitShare * 100)}%</dd>
            </div>
            {s.savedTracks !== undefined && (
              <div>
                <dt>Liked songs</dt>
                <dd>{formatNumber(s.savedTracks)}</dd>
              </div>
            )}
            {s.followedArtists !== undefined && (
              <div>
                <dt>Following</dt>
                <dd>{formatNumber(s.followedArtists)} artists</dd>
              </div>
            )}
          </dl>
        </section>

        <section>
          <p className="kicker mono">Badges</p>
          <ul className="badge-list">
            {p.badges.map((b) => (
              <li key={b.id}>
                <img src={assets.stickers.find((st) => st.id === b.id)?.canvas.toDataURL()} alt="" width={48} height={48} />
                <div>
                  <strong>{b.label}</strong>
                  <p className="muted">{b.blurb}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="kicker mono">Exact minutes</p>
          <p className="muted small">
            The Web API has no play counts, so minutes are a pace estimate. Import the JSON files from Spotify’s “Download your data” export (Privacy settings) for
            exact totals. Files never leave your browser.
          </p>
          <label className="btn">
            <Upload aria-hidden="true" /> Import streaming history
            <input
              type="file"
              accept=".json,application/json"
              multiple
              className="visually-hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length) void importHistory(files)
                e.target.value = ''
              }}
            />
          </label>
        </section>
      </div>
    </aside>
  )
}

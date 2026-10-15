import type { HistorySummary } from './types'

/**
 * Parses the JSON files from a Spotify "Download your data" export. Supports both
 * the account-data shape (StreamingHistory_music_N.json) and the extended
 * streaming history shape (Streaming_History_Audio_*.json).
 */
interface BasicEntry {
  endTime: string
  artistName: string
  trackName: string
  msPlayed: number
}

interface ExtendedEntry {
  ts: string
  ms_played: number
  master_metadata_track_name: string | null
  master_metadata_album_artist_name: string | null
}

type Entry = { at: Date; artist: string; track: string; ms: number }

function normalise(json: unknown): Entry[] {
  if (!Array.isArray(json)) return []
  const out: Entry[] = []
  for (const raw of json) {
    if (!raw || typeof raw !== 'object') continue
    if ('msPlayed' in raw && 'endTime' in raw) {
      const e = raw as BasicEntry
      out.push({ at: new Date(e.endTime.replace(' ', 'T')), artist: e.artistName ?? '', track: e.trackName ?? '', ms: Number(e.msPlayed) || 0 })
    } else if ('ms_played' in raw && 'ts' in raw) {
      const e = raw as ExtendedEntry
      if (!e.master_metadata_track_name) continue
      out.push({
        at: new Date(e.ts),
        artist: e.master_metadata_album_artist_name ?? '',
        track: e.master_metadata_track_name,
        ms: Number(e.ms_played) || 0,
      })
    }
  }
  return out
}

export async function parseHistoryFiles(files: File[]): Promise<HistorySummary> {
  const entries: Entry[] = []
  for (const file of files) {
    try {
      const text = await file.text()
      entries.push(...normalise(JSON.parse(text)))
    } catch {
      // Skip files that are not streaming history.
    }
  }
  if (!entries.length) throw new Error('No streaming history found in those files. Look for StreamingHistory_music_*.json or Streaming_History_Audio_*.json.')

  const byHour = new Array<number>(24).fill(0)
  const artistMs = new Map<string, number>()
  const trackMs = new Map<string, { name: string; artist: string; ms: number }>()
  let totalMs = 0
  let plays = 0
  let from = entries[0].at
  let to = entries[0].at

  for (const e of entries) {
    if (e.ms < 30_000) continue // Spotify counts a play at 30s
    totalMs += e.ms
    plays++
    if (!Number.isNaN(e.at.getTime())) {
      byHour[e.at.getHours()] += e.ms
      if (e.at < from) from = e.at
      if (e.at > to) to = e.at
    }
    artistMs.set(e.artist, (artistMs.get(e.artist) ?? 0) + e.ms)
    const key = `${e.artist}::${e.track}`
    const t = trackMs.get(key) ?? { name: e.track, artist: e.artist, ms: 0 }
    t.ms += e.ms
    trackMs.set(key, t)
  }

  return {
    totalMinutes: Math.round(totalMs / 60000),
    plays,
    from: from.toISOString(),
    to: to.toISOString(),
    byHour: byHour.map((ms) => Math.round(ms / 60000)),
    topArtists: [...artistMs.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, ms]) => ({ name, minutes: Math.round(ms / 60000) })),
    topTracks: [...trackMs.values()]
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 10)
      .map((t) => ({ name: t.name, artist: t.artist, minutes: Math.round(t.ms / 60000) })),
    distinctTracks: trackMs.size,
  }
}

import type { Family } from './genres'
import type { ThemeId } from '../themes/types'
import type { RawListeningData, TimeRange } from '../spotify/types'

export interface ArtistSummary {
  id: string
  name: string
  imageUrl?: string
  genres: string[]
  families: Family[]
  popularity: number
  followers: number
  url?: string
  /** Rank per time range (1-based) when present. */
  ranks: Partial<Record<TimeRange, number>>
  /** 0..1 blended affinity used for ordering. */
  score: number
}

export interface TrackSummary {
  id: string
  name: string
  artist: string
  artistId?: string
  album: string
  albumImageUrl?: string
  durationMs: number
  explicit: boolean
  popularity: number
  releaseYear?: number
  url?: string
  ranks: Partial<Record<TimeRange, number>>
  score: number
}

export interface GenreWeight {
  name: string
  weight: number
}

export interface FamilyWeight {
  family: Family
  label: string
  weight: number
}

export type PersonaId =
  | 'nocturne'
  | 'devotee'
  | 'explorer'
  | 'digger'
  | 'chartbreaker'
  | 'timetraveler'
  | 'nomad'
  | 'marathoner'
  | 'curator'

export interface Persona {
  id: PersonaId
  title: string
  short: string
  tagline: string
}

export interface Badge {
  id: string
  label: string
  blurb: string
  glyph: 'moon' | 'sun' | 'heart' | 'compass' | 'gem' | 'chart' | 'clock' | 'globe' | 'flame' | 'star' | 'advisory' | 'disc'
}

export type AddIn = 'cd-player' | 'digicam' | 'keychain'

export interface ListeningStats {
  /** Minutes per day at the recent pace, plus the year-equivalent. */
  minutesPerDay: number
  yearMinutes: number
  minutesSource: 'estimate' | 'history'
  /** 0..100 — average popularity of what you play. */
  mainstream: number
  /** 0..100 — how many genre families share your attention. */
  eclecticism: number
  /** 0..1 share of recent plays between midnight and 5am. */
  nightShare: number
  peakHour: number
  byHour: number[]
  medianReleaseYear: number
  decades: Array<{ decade: number; share: number }>
  avgTrackSec: number
  explicitShare: number
  /** 0..1 share of current top artists that are absent from your all-time list. */
  discoveryRate: number
  /** 0..1 share of recent plays that were repeats. */
  repeatRate: number
  loyalArtist?: string
  distinctArtists: number
  distinctGenres: number
  savedTracks?: number
  followedArtists?: number
  recentFrom?: string
  recentTo?: string
  /** Set when a Spotify data export was imported. */
  history?: HistorySummary
}

export interface HistorySummary {
  totalMinutes: number
  plays: number
  from: string
  to: string
  byHour: number[]
  topArtists: Array<{ name: string; minutes: number }>
  topTracks: Array<{ name: string; artist: string; minutes: number }>
  distinctTracks: number
}

export interface ListeningProfile {
  source: RawListeningData['source']
  generatedAt: string
  user: { id: string; name: string; imageUrl?: string; country?: string; product?: string; url?: string }
  artists: ArtistSummary[]
  tracks: TrackSummary[]
  /** Top of the latest four weeks, used for Side B. */
  recentTracks: TrackSummary[]
  genres: GenreWeight[]
  families: FamilyWeight[]
  theme: ThemeId
  themeScores: Record<ThemeId, number>
  persona: Persona
  albumTitle: string
  artistName: string
  catalog: string
  linerNotes: string
  stats: ListeningStats
  badges: Badge[]
  addIn: AddIn
}

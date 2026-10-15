export interface SpotifyImage {
  url: string
  width: number | null
  height: number | null
}

export interface SpotifyArtist {
  id: string
  name: string
  genres: string[]
  popularity: number
  followers: { total: number }
  images: SpotifyImage[]
  external_urls: { spotify: string }
}

export interface SpotifyAlbum {
  id: string
  name: string
  release_date: string
  release_date_precision: 'year' | 'month' | 'day'
  images: SpotifyImage[]
  album_type?: string
}

export interface SpotifyTrack {
  id: string
  name: string
  duration_ms: number
  explicit: boolean
  popularity: number
  artists: { id: string; name: string }[]
  album: SpotifyAlbum
  external_urls: { spotify: string }
}

export interface SpotifyPlayHistory {
  track: SpotifyTrack
  played_at: string
}

export interface SpotifyUser {
  id: string
  display_name: string | null
  country?: string
  product?: string
  images?: SpotifyImage[]
  external_urls: { spotify: string }
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term'

export interface RawListeningData {
  source: 'spotify' | 'demo'
  fetchedAt: string
  user: SpotifyUser
  topArtists: Record<TimeRange, SpotifyArtist[]>
  topTracks: Record<TimeRange, SpotifyTrack[]>
  recent: SpotifyPlayHistory[]
  savedTracks?: number
  followedArtists?: number
}

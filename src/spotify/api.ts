import type { RawListeningData, SpotifyArtist, SpotifyPlayHistory, SpotifyTrack, SpotifyUser, TimeRange } from './types'

const API = 'https://api.spotify.com/v1'

export class SpotifyApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly path: string) {
    super(message)
    this.name = 'SpotifyApiError'
  }
}

async function get<T>(path: string, token: string, attempt = 0): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 429 && attempt < 2) {
    const wait = Number(res.headers.get('Retry-After') ?? '2')
    await new Promise((r) => setTimeout(r, Math.min(wait, 10) * 1000))
    return get<T>(path, token, attempt + 1)
  }
  if (!res.ok) {
    const message =
      res.status === 401
        ? 'Your Spotify session expired. Connect again.'
        : res.status === 403
          ? 'Spotify refused this request. If your app is in development mode, make sure this Spotify account is added under "User Management" in the developer dashboard.'
          : `Spotify returned ${res.status} for ${path}.`
    throw new SpotifyApiError(message, res.status, path)
  }
  return (await res.json()) as T
}

interface Paging<T> {
  items: T[]
  total: number
}

const RANGES: TimeRange[] = ['short_term', 'medium_term', 'long_term']

export type ProgressReporter = (label: string) => void

/** Pulls everything the album needs in parallel. Optional endpoints fail soft. */
export async function fetchListeningData(token: string, report: ProgressReporter = () => {}): Promise<RawListeningData> {
  report('Reading your profile')
  const user = await get<SpotifyUser>('/me', token)

  report('Collecting your top artists')
  const artistsPromise = Promise.all(
    RANGES.map((range) => get<Paging<SpotifyArtist>>(`/me/top/artists?time_range=${range}&limit=50`, token).then((p) => p.items)),
  )
  report('Collecting your top tracks')
  const tracksPromise = Promise.all(
    RANGES.map((range) => get<Paging<SpotifyTrack>>(`/me/top/tracks?time_range=${range}&limit=50`, token).then((p) => p.items)),
  )
  report('Checking what you played lately')
  const recentPromise = get<{ items: SpotifyPlayHistory[] }>('/me/player/recently-played?limit=50', token)
    .then((r) => r.items)
    .catch(() => [] as SpotifyPlayHistory[])
  const savedPromise = get<Paging<unknown>>('/me/tracks?limit=1', token)
    .then((p) => p.total)
    .catch(() => undefined)
  const followedPromise = get<{ artists: { total: number } }>('/me/following?type=artist&limit=1', token)
    .then((r) => r.artists.total)
    .catch(() => undefined)

  const [artists, tracks, recent, savedTracks, followedArtists] = await Promise.all([
    artistsPromise,
    tracksPromise,
    recentPromise,
    savedPromise,
    followedPromise,
  ])

  return {
    source: 'spotify',
    fetchedAt: new Date().toISOString(),
    user,
    topArtists: { short_term: artists[0], medium_term: artists[1], long_term: artists[2] },
    topTracks: { short_term: tracks[0], medium_term: tracks[1], long_term: tracks[2] },
    recent,
    savedTracks,
    followedArtists,
  }
}

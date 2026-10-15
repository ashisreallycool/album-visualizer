import type { RawListeningData, SpotifyArtist, SpotifyTrack, TimeRange } from '../spotify/types'
import { THEMES, type ThemeId } from '../themes'
import { FAMILY_LABEL, FAMILY_THEME_VOTES, familyOf, type Family } from './genres'
import { PERSONAS } from './persona'
import type { AddIn, ArtistSummary, Badge, FamilyWeight, GenreWeight, HistorySummary, ListeningProfile, ListeningStats, PersonaId, TrackSummary } from './types'
import { hashString, pick, seededRng } from '../lib/rng'
import { formatHour, monthName } from '../lib/format'

const RANGES: TimeRange[] = ['short_term', 'medium_term', 'long_term']
const RANGE_WEIGHT: Record<TimeRange, number> = { short_term: 1.0, medium_term: 1.25, long_term: 0.85 }

function rankWeight(index: number, length: number): number {
  return (length - index) / length
}

function pickImage(images: { url: string; width: number | null }[] | undefined): string | undefined {
  if (!images?.length) return undefined
  // Prefer a mid-size image: big enough for a 1024 texture, small enough to load fast.
  const sorted = images.slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
  return (sorted.find((i) => (i.width ?? 0) <= 640) ?? sorted[0]).url
}

function mergeArtists(data: RawListeningData): ArtistSummary[] {
  const map = new Map<string, ArtistSummary>()
  for (const range of RANGES) {
    const list = data.topArtists[range] ?? []
    list.forEach((a: SpotifyArtist, i) => {
      const existing = map.get(a.id)
      const score = rankWeight(i, Math.max(list.length, 20)) * RANGE_WEIGHT[range]
      if (existing) {
        existing.ranks[range] = i + 1
        existing.score += score
      } else {
        map.set(a.id, {
          id: a.id,
          name: a.name,
          imageUrl: pickImage(a.images),
          genres: a.genres ?? [],
          families: [...new Set((a.genres ?? []).map(familyOf))],
          popularity: a.popularity ?? 0,
          followers: a.followers?.total ?? 0,
          url: a.external_urls?.spotify,
          ranks: { [range]: i + 1 },
          score,
        })
      }
    })
  }
  return [...map.values()].sort((a, b) => b.score - a.score)
}

function summariseTrack(t: SpotifyTrack, range: TimeRange, i: number, length: number): TrackSummary {
  const year = Number((t.album?.release_date ?? '').slice(0, 4))
  return {
    id: t.id,
    name: t.name,
    artist: t.artists?.map((a) => a.name).join(', ') ?? '',
    artistId: t.artists?.[0]?.id,
    album: t.album?.name ?? '',
    albumImageUrl: pickImage(t.album?.images),
    durationMs: t.duration_ms,
    explicit: Boolean(t.explicit),
    popularity: t.popularity ?? 0,
    releaseYear: Number.isFinite(year) && year > 1900 ? year : undefined,
    url: t.external_urls?.spotify,
    ranks: { [range]: i + 1 },
    score: rankWeight(i, Math.max(length, 20)) * RANGE_WEIGHT[range],
  }
}

function mergeTracks(data: RawListeningData): TrackSummary[] {
  const map = new Map<string, TrackSummary>()
  for (const range of RANGES) {
    const list = data.topTracks[range] ?? []
    list.forEach((t, i) => {
      const existing = map.get(t.id)
      if (existing) {
        existing.ranks[range] = i + 1
        existing.score += rankWeight(i, Math.max(list.length, 20)) * RANGE_WEIGHT[range]
      } else map.set(t.id, summariseTrack(t, range, i, list.length))
    })
  }
  return [...map.values()].sort((a, b) => b.score - a.score)
}

function tallyGenres(data: RawListeningData): { genres: GenreWeight[]; families: FamilyWeight[] } {
  const genreMap = new Map<string, number>()
  const familyMap = new Map<Family, number>()
  for (const range of RANGES) {
    const list = data.topArtists[range] ?? []
    list.forEach((a, i) => {
      const w = rankWeight(i, Math.max(list.length, 20)) * RANGE_WEIGHT[range]
      const genres = a.genres?.length ? a.genres : ['uncharted']
      for (const g of genres) {
        genreMap.set(g, (genreMap.get(g) ?? 0) + w / Math.sqrt(genres.length))
        const f = g === 'uncharted' ? 'other' : familyOf(g)
        familyMap.set(f, (familyMap.get(f) ?? 0) + w / genres.length)
      }
    })
  }
  const totalG = [...genreMap.values()].reduce((a, b) => a + b, 0) || 1
  const totalF = [...familyMap.values()].reduce((a, b) => a + b, 0) || 1
  return {
    genres: [...genreMap.entries()]
      .map(([name, w]) => ({ name, weight: w / totalG }))
      .sort((a, b) => b.weight - a.weight),
    families: [...familyMap.entries()]
      .map(([family, w]) => ({ family, label: FAMILY_LABEL[family], weight: w / totalF }))
      .sort((a, b) => b.weight - a.weight),
  }
}

function median(values: number[]): number {
  if (!values.length) return 0
  const s = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function computeStats(data: RawListeningData, artists: ArtistSummary[], tracks: TrackSummary[], families: FamilyWeight[], genres: GenreWeight[]): ListeningStats {
  const medium = tracks.filter((t) => t.ranks.medium_term)
  const basis = medium.length ? medium : tracks
  const mainstream = basis.length ? basis.reduce((a, t) => a + t.popularity, 0) / basis.length : 50

  const significant = families.filter((f) => f.weight >= 0.08).length
  const entropy = families.reduce((a, f) => (f.weight > 0 ? a - f.weight * Math.log(f.weight) : a), 0)
  const eclecticism = Math.min(100, Math.round((entropy / Math.log(8)) * 70 + significant * 6))

  const byHour = new Array<number>(24).fill(0)
  let night = 0
  const recentTimes: number[] = []
  const recentIds: string[] = []
  for (const play of data.recent ?? []) {
    const d = new Date(play.played_at)
    if (Number.isNaN(d.getTime())) continue
    recentTimes.push(d.getTime())
    const h = d.getHours()
    byHour[h] += 1
    if (h < 5) night += 1
    recentIds.push(play.track.id)
  }
  const recentCount = recentTimes.length
  const nightShare = recentCount ? night / recentCount : 0
  const peakHour = recentCount ? byHour.indexOf(Math.max(...byHour)) : 20
  const repeatRate = recentCount ? 1 - new Set(recentIds).size / recentCount : 0

  const years = tracks.map((t) => t.releaseYear).filter((y): y is number => Boolean(y))
  const medianReleaseYear = Math.round(median(years)) || new Date().getFullYear()
  const decadeMap = new Map<number, number>()
  for (const y of years) decadeMap.set(Math.floor(y / 10) * 10, (decadeMap.get(Math.floor(y / 10) * 10) ?? 0) + 1)
  const decades = [...decadeMap.entries()]
    .map(([decade, n]) => ({ decade, share: n / years.length }))
    .sort((a, b) => a.decade - b.decade)

  const avgTrackSec = tracks.length ? tracks.reduce((a, t) => a + t.durationMs, 0) / tracks.length / 1000 : 210
  const explicitShare = tracks.length ? tracks.filter((t) => t.explicit).length / tracks.length : 0

  const shortIds = new Set((data.topArtists.short_term ?? []).map((a) => a.id))
  const longIds = new Set((data.topArtists.long_term ?? []).map((a) => a.id))
  const discovered = [...shortIds].filter((id) => !longIds.has(id)).length
  const discoveryRate = shortIds.size ? discovered / shortIds.size : 0

  const loyal = artists.find((a) => RANGES.every((r) => (a.ranks[r] ?? 99) <= 10))

  // Recent pace: plays per day over the recently-played window, times average length.
  let minutesPerDay = 0
  let recentFrom: string | undefined
  let recentTo: string | undefined
  if (recentCount >= 2) {
    const span = Math.max(0.5, (Math.max(...recentTimes) - Math.min(...recentTimes)) / 86_400_000)
    const playsPerDay = Math.min(220, recentCount / span)
    const avgRecentMin = (data.recent.reduce((a, p) => a + p.track.duration_ms, 0) / recentCount) / 60000
    minutesPerDay = Math.round(playsPerDay * avgRecentMin)
    recentFrom = new Date(Math.min(...recentTimes)).toISOString()
    recentTo = new Date(Math.max(...recentTimes)).toISOString()
  }

  return {
    minutesPerDay,
    yearMinutes: minutesPerDay * 365,
    minutesSource: 'estimate',
    mainstream: Math.round(mainstream),
    eclecticism,
    nightShare,
    peakHour,
    byHour,
    medianReleaseYear,
    decades,
    avgTrackSec: Math.round(avgTrackSec),
    explicitShare,
    discoveryRate,
    repeatRate,
    loyalArtist: loyal?.name,
    distinctArtists: artists.length,
    distinctGenres: genres.length,
    savedTracks: data.savedTracks,
    followedArtists: data.followedArtists,
    recentFrom,
    recentTo,
  }
}

function choosePersona(stats: ListeningStats): PersonaId {
  const year = new Date().getFullYear()
  // Each score crosses 1.0 at a "clearly this" threshold; the curator is the quiet default.
  const scores: Record<PersonaId, number> = {
    nocturne: stats.nightShare / 0.3,
    devotee: (stats.loyalArtist ? 0.45 : 0) + stats.repeatRate / 0.7,
    explorer: stats.discoveryRate / 0.55,
    digger: (55 - stats.mainstream) / 20,
    chartbreaker: (stats.mainstream - 62) / 12,
    timetraveler: (year - 12 - stats.medianReleaseYear) / 10,
    nomad: (stats.eclecticism - 55) / 20,
    marathoner: (stats.avgTrackSec - 280) / 90,
    curator: 0.75,
  }
  return (Object.entries(scores) as Array<[PersonaId, number]>).sort((a, b) => b[1] - a[1])[0][0]
}

function chooseTheme(families: FamilyWeight[], stats: ListeningStats): { theme: ThemeId; scores: Record<ThemeId, number> } {
  const scores: Record<ThemeId, number> = { scrapbook: 0, acid: 0, newsprint: 0, coquette: 0, concrete: 0, velvet: 0 }
  for (const f of families) {
    const votes = FAMILY_THEME_VOTES[f.family]
    for (const [theme, v] of Object.entries(votes) as Array<[ThemeId, number]>) scores[theme] += f.weight * v
  }
  // Tie-breakers from behaviour rather than genre.
  scores.velvet += stats.nightShare * 0.15
  scores.coquette += Math.max(0, (stats.mainstream - 65) / 100) * 0.3
  scores.newsprint += Math.max(0, (45 - stats.mainstream) / 100) * 0.2
  scores.acid += Math.max(0, (stats.eclecticism - 60) / 100) * 0.2
  const theme = (Object.entries(scores) as Array<[ThemeId, number]>).sort((a, b) => b[1] - a[1])[0][0]
  return { theme, scores }
}

function buildBadges(stats: ListeningStats, artists: ArtistSummary[]): Badge[] {
  const year = new Date().getFullYear()
  const badges: Badge[] = []
  if (stats.nightShare >= 0.25) badges.push({ id: 'nightowl', label: 'NIGHT OWL', blurb: `${Math.round(stats.nightShare * 100)}% of recent plays were between midnight and 5am.`, glyph: 'moon' })
  else if (stats.peakHour >= 5 && stats.peakHour <= 9) badges.push({ id: 'earlybird', label: 'EARLY BIRD', blurb: `Your plays peak around ${formatHour(stats.peakHour)}.`, glyph: 'sun' })
  if (stats.loyalArtist) badges.push({ id: 'loyal', label: 'LOYALIST', blurb: `${stats.loyalArtist} stayed in your top 10 across every time range.`, glyph: 'heart' })
  if (stats.discoveryRate >= 0.4) badges.push({ id: 'explorer', label: 'EXPLORER', blurb: `${Math.round(stats.discoveryRate * 100)}% of this month's top artists are new to your all-time list.`, glyph: 'compass' })
  if (stats.mainstream <= 50) badges.push({ id: 'deepcut', label: 'DEEP CUT', blurb: `Average popularity of your top tracks is only ${stats.mainstream}/100.`, glyph: 'gem' })
  if (stats.mainstream >= 70) badges.push({ id: 'chart', label: 'CHART RUNNER', blurb: `Your top tracks average ${stats.mainstream}/100 popularity.`, glyph: 'chart' })
  if (stats.medianReleaseYear <= year - 12) badges.push({ id: 'timetravel', label: 'TIME TRAVELER', blurb: `Half of your top tracks were released before ${stats.medianReleaseYear}.`, glyph: 'clock' })
  if (stats.medianReleaseYear >= year - 1) badges.push({ id: 'fresh', label: 'FRESH DROP', blurb: `Most of your top tracks came out in ${stats.medianReleaseYear} or later.`, glyph: 'flame' })
  if (stats.eclecticism >= 60) badges.push({ id: 'nomad', label: 'GENRE NOMAD', blurb: `Eclecticism score ${stats.eclecticism}/100 across ${stats.distinctGenres} genres.`, glyph: 'globe' })
  if (stats.avgTrackSec >= 300) badges.push({ id: 'longplay', label: 'LONG PLAY', blurb: `Your average top track runs ${Math.round(stats.avgTrackSec / 60)} minutes.`, glyph: 'disc' })
  if (stats.explicitShare >= 0.4) badges.push({ id: 'advisory', label: 'PARENTAL ADVISORY', blurb: `${Math.round(stats.explicitShare * 100)}% of your top tracks are explicit.`, glyph: 'advisory' })
  if (stats.repeatRate >= 0.3) badges.push({ id: 'repeat', label: 'ON REPEAT', blurb: `${Math.round(stats.repeatRate * 100)}% of your recent plays were replays.`, glyph: 'star' })
  const top = artists[0]
  if (top && top.followers > 0 && top.followers < 250_000) badges.push({ id: 'early', label: 'EARLY CROWD', blurb: `${top.name} has under ${Math.round(top.followers / 1000)}k followers — you are in early.`, glyph: 'star' })
  if (badges.length < 4) badges.push({ id: 'curator', label: 'CURATED', blurb: `${stats.distinctArtists} artists made the cut this year.`, glyph: 'star' })
  return badges.slice(0, 8)
}

function chooseAddIn(stats: ListeningStats): AddIn {
  if (stats.nightShare >= 0.3) return 'digicam'
  if (stats.discoveryRate >= 0.5 || stats.eclecticism >= 70) return 'keychain'
  return 'cd-player'
}

function linerNotes(name: string, artists: ArtistSummary[], families: FamilyWeight[], stats: ListeningStats, albumTitle: string, version: string): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const names = artists.slice(0, 3).map((a) => a.name)
  const featuring = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? 'nobody in particular'
  const when = stats.nightShare >= 0.25 ? 'mostly after midnight' : stats.peakHour <= 11 ? 'mostly in the mornings' : stats.peakHour <= 17 ? 'mostly in the afternoons' : 'mostly in the evenings'
  const fams = families.slice(0, 2).map((f) => f.label)
  const sound = fams.length > 1 ? `${fams[0]} with a ${fams[1]} streak` : fams[0] ?? 'a sound of its own'
  return `Recorded between ${monthName(start)} and ${monthName(now)}, ${when}. Featuring ${featuring}. The sound of this record is ${sound}. Pressed as "${albumTitle}" (${version}) for ${name}. Thank you to the ${stats.distinctArtists} artists who made this year sound like you.`
}

export function analyze(data: RawListeningData): ListeningProfile {
  const artists = mergeArtists(data)
  const tracks = mergeTracks(data)
  const { genres, families } = tallyGenres(data)
  const stats = computeStats(data, artists, tracks, families, genres)
  const personaId = choosePersona(stats)
  const persona = PERSONAS[personaId]
  const { theme, scores } = chooseTheme(families, stats)
  const themeDef = THEMES[theme]

  const seedBase = `${data.user.id}:${theme}`
  const rng = seededRng(seedBase)
  const albumTitle = pick(rng, themeDef.titleBank)
  const name = data.user.display_name?.trim() || 'You'
  const catalog = `WA-${new Date().getFullYear()}-${(hashString(seedBase) % 9000 + 1000).toString()}`
  const version = `${persona.short} · ${themeDef.versionSuffix}`

  const recentTracks = tracks
    .filter((t) => t.ranks.short_term)
    .sort((a, b) => (a.ranks.short_term ?? 99) - (b.ranks.short_term ?? 99))
    .slice(0, 8)

  return {
    source: data.source,
    generatedAt: new Date().toISOString(),
    user: {
      id: data.user.id,
      name,
      imageUrl: pickImage(data.user.images),
      country: data.user.country,
      product: data.user.product,
      url: data.user.external_urls?.spotify,
    },
    artists,
    tracks,
    recentTracks,
    genres,
    families,
    theme,
    themeScores: scores,
    persona,
    albumTitle,
    artistName: name,
    catalog,
    linerNotes: linerNotes(name, artists, families, stats, albumTitle, version),
    stats,
    badges: buildBadges(stats, artists),
    addIn: chooseAddIn(stats),
  }
}

/** Folds an imported data export into the profile: exact minutes replace the estimate. */
export function applyHistory(profile: ListeningProfile, history: HistorySummary): ListeningProfile {
  const days = Math.max(1, (new Date(history.to).getTime() - new Date(history.from).getTime()) / 86_400_000)
  const stats: ListeningStats = {
    ...profile.stats,
    history,
    minutesSource: 'history',
    minutesPerDay: Math.round(history.totalMinutes / days),
    yearMinutes: Math.round((history.totalMinutes / days) * 365),
    byHour: history.byHour,
    peakHour: history.byHour.indexOf(Math.max(...history.byHour)),
  }
  return { ...profile, stats }
}

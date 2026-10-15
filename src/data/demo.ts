import type { RawListeningData, SpotifyArtist, SpotifyPlayHistory, SpotifyTrack, TimeRange } from '../spotify/types'
import type { ThemeId } from '../themes/types'
import { int, pick, range, seededRng, shuffle, type Rng } from '../lib/rng'

/**
 * Six fictional listeners, one per album version, so the whole experience can be
 * explored without a Spotify account. Artist names are invented.
 */
export interface DemoPersona {
  id: string
  /** The album version this listener's taste resolves to. */
  theme: ThemeId
  label: string
  userName: string
  blurb: string
  scenes: Array<{ genres: string[]; artists: string[]; weight: number }>
  popularity: [number, number]
  explicit: number
  nightBias: number
  years: [number, number]
  durationSec: [number, number]
  discovery: number
  repeat: number
  words: [string[], string[]]
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'raver',
    theme: 'acid',
    label: 'Hyperpop raver',
    userName: 'Yuna',
    blurb: 'Hyperpop, K-pop and club edits at 2am.',
    scenes: [
      { genres: ['hyperpop', 'glitchcore', 'digicore'], artists: ['glitchbunny', 'SOFT CRASH', 'Sugar Static', 'MILK TEETH', 'Pixel Saint'], weight: 0.45 },
      { genres: ['k-pop', 'k-pop girl group'], artists: ['LUMIN8', 'PLANET J', 'CHERRY DROP', 'Nova Seven'], weight: 0.3 },
      { genres: ['jersey club', 'uk garage', 'edm'], artists: ['Dial Tone', 'Hologram Club', 'Velocity Girl', 'Y2Kiko'], weight: 0.25 },
    ],
    popularity: [38, 78],
    explicit: 0.45,
    nightBias: 0.55,
    years: [2021, 2026],
    durationSec: [118, 200],
    discovery: 0.55,
    repeat: 0.35,
    words: [['Glitter', 'Neon', 'Sugar', 'Plastic', 'Hyper', 'Chrome', 'Bubblegum', 'Turbo'], ['Heartbreak', 'Lemonade', 'Overdrive', 'Static', 'Rush', 'Signal', 'Crash', 'Crush']],
  },
  {
    id: 'diarist',
    theme: 'scrapbook',
    label: 'Indie folk diarist',
    userName: 'Ash',
    blurb: 'Acoustic indie and folk, mornings with coffee.',
    scenes: [
      { genres: ['indie folk', 'singer-songwriter', 'acoustic'], artists: ['Juniper Lake', 'Willa Moss', 'Paper Lanterns', 'Hollow Pines', 'Ada Birch'], weight: 0.5 },
      { genres: ['bedroom pop', 'indie pop'], artists: ['Fern & Fable', 'The Slow Mornings', 'Milo Avery', 'Quiet Harbor'], weight: 0.3 },
      { genres: ['americana', 'alt-country'], artists: ['Dust Road Choir', 'Sadie Vale', 'Clementine & Co'], weight: 0.2 },
    ],
    popularity: [30, 66],
    explicit: 0.08,
    nightBias: 0.08,
    years: [2009, 2026],
    durationSec: [180, 320],
    discovery: 0.5,
    repeat: 0.15,
    words: [['Paper', 'Morning', 'Harbor', 'Linen', 'Amber', 'Porch', 'Winter', 'Field'], ['Letters', 'Notes', 'Light', 'Maps', 'Weather', 'Rooms', 'Kites', 'Recordings']],
  },
  {
    id: 'head',
    theme: 'newsprint',
    label: 'Hip-hop head',
    userName: 'Marcus',
    blurb: 'Boom bap, drill and alternative R&B.',
    scenes: [
      { genres: ['hip hop', 'boom bap', 'underground hip hop'], artists: ['Kid Vantage', 'Marlowe Dash', 'Yung Ledger', 'Oracle Tone', 'Sable Knight'], weight: 0.5 },
      { genres: ['drill', 'trap'], artists: ['Nico Ferrara', 'DJ Static Cling', '9th Avenue'], weight: 0.25 },
      { genres: ['alternative r&b', 'neo soul'], artists: ['Velour', 'Amara Jones', 'Low Tide'], weight: 0.25 },
    ],
    popularity: [40, 82],
    explicit: 0.7,
    nightBias: 0.28,
    years: [2014, 2026],
    durationSec: [150, 260],
    discovery: 0.35,
    repeat: 0.4,
    words: [['Late', 'Black', 'Concrete', 'Paper', 'Night', 'Cold', 'Gold', 'City'], ['Coffee', 'Edition', 'Receipts', 'Lights', 'Shift', 'Chain', 'Story', 'Avenue']],
  },
  {
    id: 'girlie',
    theme: 'coquette',
    label: 'Pop girlie',
    userName: 'Lila',
    blurb: 'Chart pop, K-pop girl groups and dream pop.',
    scenes: [
      { genres: ['pop', 'dance pop'], artists: ['Ruby Lane', 'Mae Sinclair', 'Priya Noor', 'Coco Vale', 'Juno Wilde'], weight: 0.5 },
      { genres: ['k-pop girl group', 'k-pop'], artists: ['Starlit Cell', 'Mirae', 'CHERRY DROP'], weight: 0.3 },
      { genres: ['dream pop', 'bedroom pop'], artists: ['Heartstring', 'Bellamy', 'Pearl Divers'], weight: 0.2 },
    ],
    popularity: [60, 94],
    explicit: 0.25,
    nightBias: 0.12,
    years: [2016, 2026],
    durationSec: [150, 230],
    discovery: 0.3,
    repeat: 0.45,
    words: [['Glass', 'Pink', 'Crush', 'Sweet', 'Lovesick', 'Soft', 'Cherry', 'Pretty'], ['Heart', 'Season', 'Nothing', 'Launch', 'Hours', 'Dream', 'Letters', 'Lipgloss']],
  },
  {
    id: 'wall',
    theme: 'concrete',
    label: 'Wall of sound',
    userName: 'Riley',
    blurb: 'Metal, post-punk and techno.',
    scenes: [
      { genres: ['metalcore', 'post-hardcore'], artists: ['Concrete Saints', 'Blackout Weather', 'Iron Lanterns', 'Deadlight'], weight: 0.4 },
      { genres: ['post-punk', 'noise rock', 'shoegaze'], artists: ['Ghost Signal', 'Static Youth', 'Riot Garden', 'Grey Cathedral'], weight: 0.35 },
      { genres: ['techno', 'industrial'], artists: ['Hollow Machine', 'Kessler', 'VOID/CTRL'], weight: 0.25 },
    ],
    popularity: [22, 58],
    explicit: 0.4,
    nightBias: 0.22,
    years: [2004, 2026],
    durationSec: [200, 420],
    discovery: 0.25,
    repeat: 0.12,
    words: [['Signal', 'Static', 'Hard', 'Black', 'Loud', 'Dead', 'Iron', 'No'], ['Noise', 'Room', 'Copy', 'Sleep', 'Weather', 'Machine', 'Youth', 'Light']],
  },
  {
    id: 'nocturne',
    theme: 'velvet',
    label: 'Late-night jazz',
    userName: 'Esme',
    blurb: 'Jazz, soul and film scores after dark.',
    scenes: [
      { genres: ['jazz', 'contemporary jazz', 'jazz trio'], artists: ['The Marlowe Trio', 'Blue Hour Quartet', 'Theo Sainte', 'Nina Okafor'], weight: 0.45 },
      { genres: ['soul', 'neo soul'], artists: ['Velvet Hour', 'Esme Laurent', 'Orchestra of Small Rooms'], weight: 0.3 },
      { genres: ['soundtrack', 'neoclassical', 'piano'], artists: ['Lior Hahn', 'Small Hours Ensemble', 'Cass Winter'], weight: 0.25 },
    ],
    popularity: [18, 55],
    explicit: 0.03,
    nightBias: 0.5,
    years: [1962, 2026],
    durationSec: [240, 560],
    discovery: 0.2,
    repeat: 0.3,
    words: [['Blue', 'Velvet', 'Last', 'Slow', 'Low', 'After', 'Quiet', 'Amber'], ['Note', 'Hour', 'Call', 'Burn', 'Light', 'Hours', 'Room', 'Smoke']],
  },
]

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function makeArtist(rng: Rng, name: string, genres: string[], persona: DemoPersona): SpotifyArtist {
  const popularity = int(rng, persona.popularity[0], persona.popularity[1])
  const followers = Math.round(Math.pow(10, 2.6 + popularity / 18) * range(rng, 0.6, 1.6))
  return {
    id: `demo-${slug(name)}`,
    name,
    genres: shuffle(rng, genres).slice(0, int(rng, 1, Math.min(3, genres.length))),
    popularity,
    followers: { total: followers },
    images: [],
    external_urls: { spotify: '' },
  }
}

function makeTrack(rng: Rng, artist: SpotifyArtist, persona: DemoPersona, index: number): SpotifyTrack {
  const [a, b] = persona.words
  const name = rng() < 0.2 ? pick(rng, b) : `${pick(rng, a)} ${pick(rng, b)}`
  const year = int(rng, persona.years[0], persona.years[1])
  const month = int(rng, 1, 12).toString().padStart(2, '0')
  const day = int(rng, 1, 28).toString().padStart(2, '0')
  const albumName = rng() < 0.35 ? `${name} - Single` : `${pick(rng, a)} ${pick(rng, b)}`
  return {
    id: `demo-track-${index}-${slug(name)}`,
    name,
    duration_ms: int(rng, persona.durationSec[0], persona.durationSec[1]) * 1000,
    explicit: rng() < persona.explicit,
    popularity: Math.max(5, Math.min(100, artist.popularity + int(rng, -12, 12))),
    artists: [{ id: artist.id, name: artist.name }],
    album: { id: `demo-album-${index}`, name: albumName, release_date: `${year}-${month}-${day}`, release_date_precision: 'day', images: [] },
    external_urls: { spotify: '' },
  }
}

export function buildDemoData(persona: DemoPersona): RawListeningData {
  const rng = seededRng(`demo:${persona.id}`)
  const artists: SpotifyArtist[] = []
  for (const scene of persona.scenes) for (const name of scene.artists) artists.push(makeArtist(rng, name, scene.genres, persona))

  // Weighted order: earlier scenes carry more weight, then shuffled a little.
  const weighted = artists
    .map((a, i) => {
      const scene = persona.scenes.find((s) => s.artists.includes(a.name))!
      return { a, w: scene.weight * 2 + rng() - i * 0.01 }
    })
    .sort((x, y) => y.w - x.w)
    .map((x) => x.a)

  const tracks: SpotifyTrack[] = []
  let idx = 0
  for (const artist of weighted) {
    const count = idx < 15 ? 4 : 2
    for (let i = 0; i < count; i++) tracks.push(makeTrack(rng, artist, persona, idx++))
  }

  const longTerm = weighted.slice()
  const mediumTerm = shuffle(seededRng(`${persona.id}:medium`), weighted.slice(0, 6)).concat(weighted.slice(6))
  // Short-term list: a share of brand-new artists to drive the discovery stat.
  const freshCount = Math.round(persona.discovery * 10)
  const fresh = Array.from({ length: freshCount }, (_, i) => {
    const scene = pick(rng, persona.scenes)
    return makeArtist(rng, `${pick(rng, persona.words[0])} ${pick(rng, ['Club', 'Sisters', 'Collective', 'Twins', 'Radio', 'Orchestra', 'Youth'])} ${i + 1}`, scene.genres, persona)
  })
  const shortTerm = shuffle(seededRng(`${persona.id}:short`), [...fresh, ...weighted.slice(0, 10 - freshCount)]).concat(weighted.slice(10))

  const tracksByRange: Record<TimeRange, SpotifyTrack[]> = {
    long_term: tracks.slice(0, 50),
    medium_term: shuffle(seededRng(`${persona.id}:mt`), tracks.slice(0, 12)).concat(tracks.slice(12, 50)),
    short_term: shuffle(seededRng(`${persona.id}:st`), tracks.slice(0, 20)).slice(0, 50),
  }

  // Recently played: 50 plays across ~3 days with the persona's night bias. Fresh plays walk
  // a shuffled list without replacement so the repeat rate is exactly the persona's.
  const recent: SpotifyPlayHistory[] = []
  const now = Date.now()
  let cursor = now
  const order = shuffle(rng, tracks)
  let next = 0
  let last: SpotifyTrack | null = null
  for (let i = 0; i < 50; i++) {
    const night = rng() < persona.nightBias
    const hour = night ? int(rng, 0, 4) : int(rng, 8, 23)
    const d = new Date(cursor)
    d.setHours(hour, int(rng, 0, 59), 0, 0)
    const track: SpotifyTrack = last && rng() < persona.repeat ? last : order[next++ % order.length]
    last = track
    recent.push({ track, played_at: d.toISOString() })
    cursor -= int(rng, 20, 110) * 60_000
  }

  return {
    source: 'demo',
    fetchedAt: new Date().toISOString(),
    user: { id: `demo-${persona.id}`, display_name: persona.userName, country: 'US', product: 'premium', images: [], external_urls: { spotify: '' } },
    topArtists: { short_term: shortTerm.slice(0, 50), medium_term: mediumTerm.slice(0, 50), long_term: longTerm.slice(0, 50) },
    topTracks: tracksByRange,
    recent,
    savedTracks: int(rng, 180, 2400),
    followedArtists: int(rng, 20, 320),
  }
}

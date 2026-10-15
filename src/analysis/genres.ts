import type { ThemeId } from '../themes/types'

export type Family =
  | 'pop'
  | 'kpop'
  | 'hiphop'
  | 'rnb'
  | 'electronic'
  | 'rock'
  | 'metal'
  | 'punk'
  | 'indie'
  | 'folk'
  | 'country'
  | 'jazz'
  | 'classical'
  | 'soul'
  | 'latin'
  | 'afro'
  | 'world'
  | 'ambient'
  | 'lofi'
  | 'other'

/** Order matters: the first matching rule wins. */
const RULES: Array<[RegExp, Family]> = [
  [/k-?pop|korean|k-rap|k-indie|k-r&b/, 'kpop'],
  [/j-?pop|j-?rock|anime|city pop|japanese|c-pop|mandopop|cantopop|bollywood|desi|punjabi|filipino|\bopm\b|thai|vietnamese|indonesian|turkish|arabic/, 'world'],
  [/reggaeton|latin|salsa|bachata|cumbia|corrido|regional mexican|urbano|dembow|flamenco|bossa|samba|\bmpb\b|tango|tropical/, 'latin'],
  [/afro|amapiano|highlife|dancehall|reggae|soca|naija|ghana|south african/, 'afro'],
  [/lo-?fi|chillhop|study beats/, 'lofi'],
  [/ambient|drone|new age|sleep|meditation|soundscape/, 'ambient'],
  [/classical|orchestra|baroque|opera|piano|symphony|chamber music|neoclassical|soundtrack|score|film music|choral|romantic era/, 'classical'],
  [/jazz|bebop|swing|big band/, 'jazz'],
  [/\bsoul\b|funk|motown|gospel|disco|blues/, 'soul'],
  [/r&b|rnb|neo soul|quiet storm/, 'rnb'],
  [/hip hop|hip-hop|\brap\b|trap|drill|grime|boom bap|phonk|crunk|hyphy|plugg/, 'hiphop'],
  [/metal|metalcore|deathcore|doom|sludge|thrash|djent/, 'metal'],
  [/punk|hardcore|\bemo\b|screamo|\bska\b|riot grrrl/, 'punk'],
  [/bedroom pop|dream pop|shoegaze|indie|jangle|slacker|twee|art pop|chamber pop|post-punk|new wave|britpop|garage rock|psychedelic|surf|alt-?z|lo-fi indie/, 'indie'],
  [/folk|singer-songwriter|acoustic|freak folk|stomp and holler/, 'folk'],
  [/country|americana|bluegrass|honky tonk|western|outlaw/, 'country'],
  [/dance pop|electropop|synth-?pop|teen pop|bubblegum|power pop|pop rock|pop punk/, 'pop'],
  [/hyperpop|glitch|\bedm\b|house|techno|trance|dubstep|drum and bass|\bdnb\b|jungle|garage|electro|electronic|synthwave|vaporwave|future bass|breakbeat|bass music|eurodance|dance|\bidm\b|rave|hardstyle|chiptune|nightcore|jersey club|footwork|dark clubbing|\bwave\b/, 'electronic'],
  [/rock|grunge|alternative|prog|stoner|arena|glam/, 'rock'],
  [/pop/, 'pop'],
]

export function familyOf(genre: string): Family {
  const g = genre.toLowerCase()
  for (const [re, family] of RULES) if (re.test(g)) return family
  return 'other'
}

export const FAMILY_LABEL: Record<Family, string> = {
  pop: 'pop',
  kpop: 'K-pop',
  hiphop: 'hip-hop',
  rnb: 'R&B',
  electronic: 'electronic',
  rock: 'rock',
  metal: 'metal',
  punk: 'punk',
  indie: 'indie',
  folk: 'folk',
  country: 'country',
  jazz: 'jazz',
  classical: 'classical',
  soul: 'soul & funk',
  latin: 'latin',
  afro: 'afrobeats',
  world: 'global pop',
  ambient: 'ambient',
  lofi: 'lo-fi',
  other: 'uncharted',
}

/** How strongly each family pulls toward each album version. */
export const FAMILY_THEME_VOTES: Record<Family, Partial<Record<ThemeId, number>>> = {
  pop: { coquette: 1, acid: 0.4 },
  kpop: { acid: 0.85, coquette: 0.85 },
  hiphop: { newsprint: 1, concrete: 0.3 },
  rnb: { newsprint: 0.6, velvet: 0.5, coquette: 0.3 },
  electronic: { acid: 1, concrete: 0.3 },
  rock: { concrete: 0.8, scrapbook: 0.3 },
  metal: { concrete: 1 },
  punk: { concrete: 0.9, newsprint: 0.3 },
  indie: { scrapbook: 0.9, coquette: 0.3 },
  folk: { scrapbook: 1 },
  country: { scrapbook: 1 },
  jazz: { velvet: 1 },
  classical: { velvet: 1 },
  soul: { velvet: 0.8, newsprint: 0.3 },
  latin: { velvet: 0.5, acid: 0.4 },
  afro: { acid: 0.5, newsprint: 0.4 },
  world: { acid: 0.6, coquette: 0.5 },
  ambient: { velvet: 0.6, scrapbook: 0.4 },
  lofi: { scrapbook: 0.6, newsprint: 0.4 },
  other: {},
}

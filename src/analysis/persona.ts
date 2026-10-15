import type { Persona, PersonaId } from './types'

export const PERSONAS: Record<PersonaId, Persona> = {
  nocturne: {
    id: 'nocturne',
    title: 'The Night Archivist',
    short: 'Nocturne',
    tagline: 'Your best listening happens after midnight.',
  },
  devotee: {
    id: 'devotee',
    title: 'The Devotee',
    short: 'Devotee',
    tagline: 'When you love something, you play it until it is part of you.',
  },
  explorer: {
    id: 'explorer',
    title: 'The Explorer',
    short: 'Explorer',
    tagline: 'Half of your current favourites were strangers a few months ago.',
  },
  digger: {
    id: 'digger',
    title: 'The Deep-Cut Digger',
    short: 'Deep Cut',
    tagline: 'You find songs long before the charts do.',
  },
  chartbreaker: {
    id: 'chartbreaker',
    title: 'The Chart Oracle',
    short: 'Chart',
    tagline: 'If it is everywhere, it is because people like you got there first.',
  },
  timetraveler: {
    id: 'timetraveler',
    title: 'The Time Traveler',
    short: 'Archive',
    tagline: 'Your year sounds like a decade that ended before this one started.',
  },
  nomad: {
    id: 'nomad',
    title: 'The Genre Nomad',
    short: 'Nomad',
    tagline: 'No single scene can hold you for long.',
  },
  marathoner: {
    id: 'marathoner',
    title: 'The Marathoner',
    short: 'Long Play',
    tagline: 'Three-minute songs are a warm-up to you.',
  },
  curator: {
    id: 'curator',
    title: 'The Curator',
    short: 'Curator',
    tagline: 'Taste with a steady hand and a long memory.',
  },
}

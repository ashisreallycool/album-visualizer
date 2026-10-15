export type ThemeId = 'scrapbook' | 'acid' | 'newsprint' | 'coquette' | 'concrete' | 'velvet'

export interface ThemeFonts {
  /** Big display type for titles. */
  display: string
  /** Secondary accent face (handwriting, typewriter, script…). */
  accent: string
  /** Small readable text on textures. */
  body: string
  /** Weight used for display type. */
  displayWeight: number
}

export interface ThemeColors {
  /** Dominant paper/background of the packaging. */
  paper: string
  /** Primary ink / text color on paper. */
  ink: string
  /** Loud accent (stickers, highlights). */
  accent: string
  /** Second accent. */
  accent2: string
  /** Muted supporting color. */
  muted: string
  /** Metallic/foil color for premium details. */
  foil: string
  /** Color of the disc body. */
  disc: string
  /** Backdrop of the 3D stage. */
  stage: string
  /** Floor under the album. */
  floor: string
}

export interface Theme {
  id: ThemeId
  /** Marketing name, like a K-pop album version ("Drip Bag ver."). */
  name: string
  versionSuffix: string
  mood: string
  inspiration: string
  colors: ThemeColors
  fonts: ThemeFonts
  titleBank: string[]
  stickerShape: 'diecut' | 'circle' | 'label' | 'heart' | 'tag' | 'badge'
  frame: 'polaroid' | 'cutout' | 'halftone' | 'heart' | 'duotone' | 'vignette'
  titleStyle: 'marker' | 'warp' | 'masthead' | 'script' | 'block' | 'foil'
  decor: 'tape' | 'chaos' | 'press' | 'sparkle' | 'grid' | 'deco'
}

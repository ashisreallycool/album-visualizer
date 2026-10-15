/** Scene units are centimetres. */
export const BOX = { w: 14, d: 14, h: 2.6, wall: 0.3, lidH: 0.7 }
export const WRAP = { w: 14.35, h: 3.5, d: 14.35 }
export const BOOK = { w: 12.4, h: 12.4, t: 0.9, pages: 3 }
export const CARD = { w: 5.5, h: 8.25, t: 0.05 }
export const DISC = { r: 6, hole: 0.75, t: 0.12 }
export const SHEET = { w: 8, h: 6 }
export const LCARD = { w: 8, h: 5 }
export const HYPE = { w: 5.2, h: 2.6 }

export const INNER_FLOOR = BOX.wall
export const SLEEVE_Y = INNER_FLOOR + 0.1
export const LAYER2_Y = SLEEVE_Y + 0.08
/** The book's local z spans [-0.84, +0.11]; lying flat that is world y below the group origin. */
export const BOOK_Y = LAYER2_Y + 0.82 + 0.84

/** Where unboxed items rest on the table. */
export const TABLE_SPOTS = {
  book: [-16.5, 0.86, 2.5] as [number, number, number],
  cards: [-11, 0.06, -11] as [number, number, number],
  disc: [13, 0.1, -6] as [number, number, number],
  sleeve: [20, 0.04, -11] as [number, number, number],
}

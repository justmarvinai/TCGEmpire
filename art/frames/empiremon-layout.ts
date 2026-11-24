// Geometry of the Empiremon card frame, shared by the frame painter (art/frames/empiremon.ts) and the client, which
// writes the card text into the text slots at runtime in a real font (decision 065: sets after 0.0.1 bake no text).
// Card pixels of the 80x112 card; the client multiplies them by the display scale. Pure numbers: the client imports it.

export interface Slot {
  x: number
  y: number
  w: number
  h: number
}

/** Where a layout leaves room for runtime text. Every slot is a calm, dark plate so light text reads on it. */
export interface EmpiremonText {
  /** card name, left aligned */
  name: Slot
  /** "Strom-Empiremon" */
  type: Slot
  /** "007/020" */
  number: Slot
}

/** Common cards: name bar on top, art window, type line and number strip at the bottom. */
export const EMP_CLASSIC: EmpiremonText = {
  name: { x: 6, y: 4, w: 58, h: 9 },
  type: { x: 6, y: 89, w: 68, h: 7 },
  number: { x: 6, y: 99, w: 40, h: 7 },
}

/** Ultra and Grail cards: full art; the frame lays dark plates under the same kind of slots. */
export const EMP_FULL: EmpiremonText = {
  name: { x: 6, y: 5, w: 58, h: 9 },
  type: { x: 6, y: 92, w: 68, h: 6 },
  number: { x: 6, y: 100, w: 40, h: 6 },
}

/** Art window of a Common card (the kit fills exactly this). Ultra and Grail paint the whole card, 80x112. */
export const EMP_ART_WINDOW: Slot = { x: 4, y: 15, w: 72, h: 72 }

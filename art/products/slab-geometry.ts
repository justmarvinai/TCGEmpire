/**
 * Geometry of the reusable slab frames `slab-psa`, `slab-bgs`, `slab-cgc` and `slab-company`, in
 * slab pixels from the top left. A frame carries no card and no card-specific text: the client puts
 * the 80×112 card sprite into `card` and writes the label texts as normal HTML text into `zones`.
 * Every grader uses the same layout; only the label colours differ.
 *
 * Pure data without imports: the client imports this file as well as the art build.
 */
export type SlabGrader = 'psa' | 'bgs' | 'cgc' | 'company'

export const SLAB_GRADERS: readonly SlabGrader[] = ['psa', 'bgs', 'cgc', 'company']

export const SLAB = {
  w: 96,
  h: 152,
  /** Window for the card sprite (its rounded corners show the dark gap of the case). */
  card: { x: 8, y: 33, w: 80, h: 112 },
  /** The printed label; the zones lie inside it on flat label colour. */
  label: { x: 8, y: 7, w: 80, h: 22 },
  zones: {
    /** Card name, the largest line. */
    title: { x: 10, y: 9, w: 52, h: 7, align: 'left' },
    /** Set and number, e.g. "Basis-Set · 090". */
    subtitle: { x: 10, y: 17, w: 52, h: 5, align: 'left' },
    /** Certificate number, right of the printed barcode. */
    cert: { x: 24, y: 23, w: 38, h: 4, align: 'left' },
    /** Condition in words, e.g. "GEM MT". */
    gradeWord: { x: 65, y: 16, w: 21, h: 4, align: 'center' },
    /** The big grade, e.g. "10" or "9.5". */
    grade: { x: 65, y: 20, w: 21, h: 8, align: 'center' },
    /**
     * Brand cell. PSA, BGS and CGC have their wordmark printed here; on the company frame it is
     * empty, for the name of the player's company (in `onBand`).
     */
    brand: { x: 64, y: 8, w: 23, h: 7, align: 'center' },
  },
  /** Text colours per label: `ink` for name, set and grade, `accent` for grade word and cert. */
  colors: {
    psa: { ink: '#1e1a24', accent: '#c9202e', onBand: '#ffffff' },
    bgs: { ink: '#2b1b06', accent: '#6a4208', onBand: '#fff0a4' },
    cgc: { ink: '#13244c', accent: '#1c4fb2', onBand: '#ffffff' },
    company: { ink: '#1c2030', accent: '#4a5470', onBand: '#ffffff' },
  },
} as const

/**
 * Geometry of the sealed return packs a graded card comes back in (`gradepack-psa`, `gradepack-bgs`, `gradepack-cgc`,
 * `gradepack-company`), in pack pixels. The client tears the pack open along `tear`: the strip above flies off and the
 * slab (96×152) slides up out of the opening, so the pack must be wider and taller than a slab.
 *
 * Pure data without imports: the client imports this file as well as the art build.
 */
export const GRADEPACK = {
  w: 112,
  h: 168,
  /** First row below the tear line: rows 0 … tear-1 are the strip that is torn off. */
  tear: 24,
} as const

import { PRESTIGE_RANKS } from '../../../content/prestige.ts'

/** The rank after n exits (beyond the list the last one counts up). */
export const rankName = (n: number) =>
  n <= 0 ? null : n <= PRESTIGE_RANKS.length ? PRESTIGE_RANKS[n - 1]! : `${PRESTIGE_RANKS[PRESTIGE_RANKS.length - 1]} ${n - PRESTIGE_RANKS.length + 1}`

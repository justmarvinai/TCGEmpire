// Bares für Rares (docs/GAME_DESIGN.md §7): the dealer panel. The server only picks indices into this list
// (config `bares.dealer_count`), so the names can be changed here.
export const BARES_DEALERS: readonly string[] = ['Waltraud', 'Detlef', 'Fabio', 'Susanne', 'Ludger', 'Elke', 'Hakan', 'Gisela']

/** The one who always bids 80 €. */
export const BARES_FIXED_DEALER = 'Der Achtzig-Euro-Mann'

export const BARES_CONFIG = { 'bares.dealer_count': BARES_DEALERS.length } as const

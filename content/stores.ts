// Retail stores besides the Kiosk (docs/GAME_DESIGN.md §7.5). Shared stores restock at fixed times
// (Europe/Berlin) with stock for everyone, scaled by the number of active players; the Würfelbude gives a
// personal weekly allocation that grows with Ruf. Prices are list × markup × Preisniveau. Closed on Sundays.
export interface StoreDef {
  key: string
  name: string
  text: string
  minLevel: number
  markupBps: number
  closedSunday: boolean
  /** shared stock: restock times and stock per active player and product per restock */
  restocks?: readonly string[]
  stockPerPlayer?: number
  /** per player and restock (shared) or per week (allocation) */
  limit: number
  /** allocation stores: extra units per week for every 100 Ruf */
  limitPerRuf100?: number
  products: readonly { id: string; minLevel?: number }[]
}

export const STORES: readonly StoreDef[] = [
  {
    key: 'mueller',
    name: 'Müller',
    text: 'Zwischen Shampoo und Socken. Maximal 2 pro Kunde, steht am Regal. Liest keiner.',
    minLevel: 4,
    markupBps: 10000,
    closedSunday: true,
    restocks: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
    stockPerPlayer: 4,
    limit: 2,
    products: [{ id: 'booster-pkm-base' }, { id: 'booster-ygo-lob' }],
  },
  {
    key: 'wuerfelbude',
    name: 'Würfelbude',
    text: 'Dein Laden um die Ecke. Kennt dich mit Namen und legt dir was zurück. Je besser dein Ruf, desto mehr.',
    minLevel: 6,
    markupBps: 10000,
    closedSunday: true,
    limit: 6,
    limitPerRuf100: 1,
    products: [
      { id: 'booster-pkm-base' },
      { id: 'booster-ygo-lob' },
      { id: 'booster-op01' },
      { id: 'booster-rb-ogn' },
      { id: 'display-pkm-base', minLevel: 18 },
      { id: 'display-ygo-lob', minLevel: 18 },
      { id: 'display-op01', minLevel: 18 },
      { id: 'display-rb-ogn', minLevel: 18 },
    ],
  },
  {
    key: 'smyths',
    name: 'Smyths Toys',
    text: 'Große Lieferung, lange Schlange. Wer zuerst kommt, räumt ab. Und Scalper-Sven kommt immer zuerst.',
    minLevel: 12,
    markupBps: 9800,
    closedSunday: true,
    restocks: ['10:00', '14:00', '18:00'],
    stockPerPlayer: 12,
    limit: 12,
    products: [
      { id: 'booster-pkm-base' },
      { id: 'booster-op01' },
      { id: 'booster-rb-ogn' },
      { id: 'display-pkm-base', minLevel: 18 },
      { id: 'display-op01', minLevel: 18 },
      { id: 'display-rb-ogn', minLevel: 18 },
    ],
  },
]

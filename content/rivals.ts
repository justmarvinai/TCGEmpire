// NPC rivals on the toplists (docs/GAME_DESIGN.md §21): made-up tycoons whose numbers grow slowly from the
// day the world started, so there is always somebody just ahead. Labelled as NPC on the lists.
export interface RivalDef {
  id: string
  name: string
  /** net worth at the world's start in Basis-€ cents; cash is 30 % of it */
  startBaseCents: number
  /** growth of net worth per day, percent */
  growthPct: number
  startLevel: number
  levelPerDay: number
  /** binder completion at the start, percent; +1.5 points per day */
  startCollectionPct: number
}

const NAMES = [
  'Sparkassen-Sigrid', 'Krypto-Kai', 'Erbschafts-Erwin', 'Rentner Ralf', 'Holo-Holger', 'Booster-Bärbel', 'Sammel-Sascha',
  'Tante Trude', 'Zocker-Zoe', 'Bausparer Bodo', 'Flohmarkt-Frieda', 'Startup-Steffen', 'Vintage-Vera', 'Pfandkönig Paul',
  'Graded-Greta', 'Mint-Moritz', 'Slab-Selina', 'Investment-Ingrid', 'Dividenden-Dieter', 'Pack-Pia', 'Grail-Gregor',
  'Ankauf-Anton', 'Lucky-Luisa', 'Hype-Hannes', 'Restock-Rita', 'Display-Dirk', 'Topdeck-Tamara', 'Kiloware-Klaus',
  'Erstauflage-Edith', 'Foil-Fiete', 'Börsen-Bruno', 'Spekulantin Svea', 'Sammlerin Selma', 'Cash-Carsten', 'Tresor-Thea',
  'Goldkante-Gisela', 'Keller-Kurt', 'Glurak-Gerd', 'Pech-Piet', 'Mogul Magnus',
]

// Spread from 300 € to 2 Mio. € (log scale), growth 2–6 % a day, levels 1–56 plus 1–4 a day.
export const RIVALS: readonly RivalDef[] = NAMES.map((name, i) => ({
  id: `rival-${i + 1}`,
  name,
  startBaseCents: Math.round(300_00 * Math.pow(2_000_000_00 / 300_00, i / (NAMES.length - 1))),
  growthPct: 2 + ((i * 7) % 9) * 0.5,
  startLevel: 1 + Math.round(i * 1.4),
  levelPerDay: 1 + ((i * 3) % 4),
  startCollectionPct: 3 + ((i * 11) % 60),
}))

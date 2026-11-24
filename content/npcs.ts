// NPC traders ("KI-Spieler", docs/GAME_DESIGN.md §18). All their names live here. Coded rules, no LLM:
// each archetype has a behaviour in SQL (private.npc_act) and the parameters below. Budgets are Basis-€ per
// day; an NPC never holds more than two days of budget, so NPCs cannot become an endless money source.
export type NpcArchetype = 'collector' | 'dealer' | 'bulk' | 'scalper' | 'investor' | 'kid' | 'lowballer' | 'attic'

export interface NpcDef {
  id: string
  name: string
  archetype: NpcArchetype
  /** shown like a player's Ruf (0–1000) */
  ruf: number
  budgetBaseCents: number
  /** chance to act in a 5-minute tick, percent */
  activity: number
  params: Record<string, number>
}

export const NPCS: readonly NpcDef[] = [
  // Buys every player's card that is priced fairly (market.npc_buy_steps, 0.0.11) and keeps a few fair buy orders open.
  { id: 'sabine', name: 'Sammler-Sabine', archetype: 'collector', ruf: 900, budgetBaseCents: 3_000_00, activity: 40, params: { orders: 3, orderPct: 80 } },
  // Always has singles in stock, a bit above the Marktwert; old offers disappear.
  { id: 'kalle', name: 'Kartenhändler Kalle', archetype: 'dealer', ruf: 700, budgetBaseCents: 0, activity: 50, params: { stock: 14, markupMinPct: 110, markupMaxPct: 135, maxAgeH: 48, hitChancePct: 12 } },
  // Buys bulk by the kilo: big buy orders for commons and uncommons, a little better than the Ankauf.
  { id: 'bernd', name: 'Bulk-Bernd', archetype: 'bulk', ruf: 600, budgetBaseCents: 1_500_00, activity: 30, params: { orders: 4, orderPct: 70, qty: 20 } },
  // Buys sealed cheap (and store stock once stores restock) and sells it with a premium.
  { id: 'sven', name: 'Scalper-Sven', archetype: 'scalper', ruf: 350, budgetBaseCents: 5_000_00, activity: 40, params: { markupMinPct: 120, markupMaxPct: 145, buyBelowPct: 92 } },
  // Hoards sealed while the hype is low and sells when it is high.
  { id: 'ingo', name: 'Investor-Ingo', archetype: 'investor', ruf: 800, budgetBaseCents: 8_000_00, activity: 25, params: { buyHypeBelowPct: 97, sellHypeAbovePct: 108, buyBelowPct: 100, sellMarkupPct: 112 } },
  // Kleinanzeigen (alpha_04 part 5)
  { id: 'kevin', name: 'Kevin (12)', archetype: 'kid', ruf: 300, budgetBaseCents: 1_500_00, activity: 20, params: {} },
  { id: 'lars', name: 'Letzter-Preis-Lars', archetype: 'lowballer', ruf: 450, budgetBaseCents: 2_000_00, activity: 40, params: {} },
  { id: 'doris', name: 'Dachboden-Doris', archetype: 'attic', ruf: 550, budgetBaseCents: 0, activity: 30, params: {} },
  // Sonntags-Flohmarkt (alpha_10): stocks a few cheap ads every Sunday
  { id: 'horst', name: 'Flohmarkt-Horst', archetype: 'attic', ruf: 400, budgetBaseCents: 0, activity: 0, params: {} },
]

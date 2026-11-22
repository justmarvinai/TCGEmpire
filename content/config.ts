// Balance and server config. Source of truth: this file -> `pnpm seed` -> supabase/seed/config.sql
// -> game.config (admins can override single keys live). Money values are Basis-€ cents (`*_base_cents`),
// multiplied by the Preisniveau when charged or paid (docs/ECONOMY.md §4). Odds are parts per million.

type Json = string | number | boolean | readonly Json[] | { readonly [k: string]: Json }

export const config = {
  version: '0.0.1-alpha_02',

  // Login
  'auth.bcrypt_cost': 10,
  'auth.max_failures': 8,
  'auth.lock_seconds': 300,

  // Start
  'start.cash_base_cents': 400_00,

  // Levels: ep_to_next(n) = round((base + factor * n^exponent) * growth^n)
  'ep.base': 25,
  'ep.factor': 8.5,
  'ep.exponent': 1.3,
  'ep.growth': 1.035,
  'ep.catchup_levels': 10,
  'ep.catchup_pct': 25,
  // EP rewards in level-1 units (scaled by growth^level)
  'ep.pack': 8,
  'ep.new_card': 2,
  'ep.sale': 2,
  'ep.quest': 15,
  'ep.minigame_min': 10,
  'ep.minigame_max': 30,

  // Reference income per hour: base * growth^level (docs/ECONOMY.md §3)
  'income.ref_base_cents': 900_00,
  'income.ref_growth': 1.08,

  // Level rewards: minutes of reference income, plus a booster every n levels
  'level.reward_minutes': 15,
  'level.booster_every': 5,
  'level.reward_product': 'booster-pkm-base',

  // Preisniveau: P = min(cap, rate^max(0, median career level - free_levels)), daily, limited step
  'price.rate': 1.018,
  'price.cap': 250,
  'price.free_levels': 20,
  'price.max_daily_step_pct': 10,

  // Energy (minijobs only)
  'energy.max': 100,
  'energy.regen_seconds': 180,

  // Boosters
  'pack.hit_odds_ppm': { holo: 200_000, alternative: 41_667, ultra: 13_889, grail: 1_389 },
  'pack.god_pack_ppm': 200,
  'pack.double_hit_ppm': 25_000,
  'pack.pity_after': 12,
  'pack.pity_step_ppm': 30_000,
  'pack.max_open': 10,
  // Hidden quality values (centering, corners, edges, surface) of hits: weights for 10, 9, 8, 7, 6, 5
  'quality.weights': [59, 27, 9, 3, 1, 1],

  // Stores
  'kiosk.markup_bps': 11_000,
  'kiosk.daily_limit': 50,
  'ankauf.rate_bps': 6_000,

  // Minijob Pfandflaschen: score = collected deposit in Basis-€ cents
  'minigame.pfand': { energy: 10, duration_s: 45, cap_base_cents: 300_00, pfandbon_at_base_cents: 120_00 },

  // Mini-quests
  'quest.mini_slots': 3,
  'quest.mini_reward_minutes': 1,
  'quest.mini_pfandbons': 1,
  'quest.bonus_every': 10,

  // Rate limits per minute
  'rate.buy': 30,
  'rate.open': 30,
  'rate.sell': 30,
  'rate.minigame': 6,
} as const satisfies Record<string, Json>

export type ConfigKey = keyof typeof config

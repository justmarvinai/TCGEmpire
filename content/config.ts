// Balance and server config. Source of truth: this file -> `pnpm seed` -> supabase/seed/config.sql
// -> game.config. Money values are Basis-€ in cents (`*_base_cents`) and are multiplied by the
// Preisniveau at the moment they are charged or paid (docs/ECONOMY.md §4).

export const config = {
  version: '0.0.1-alpha_01',

  // Login: bcrypt cost, lock after too many wrong passwords
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

  // Preisniveau: P = min(cap, rate^max(0, median career level - free_levels)), daily, limited step
  'price.rate': 1.018,
  'price.cap': 250,
  'price.free_levels': 20,
  'price.max_daily_step_pct': 10,

  // Energy
  'energy.max': 100,
  'energy.regen_seconds': 180,
} as const satisfies Record<string, string | number | boolean>

export type ConfigKey = keyof typeof config

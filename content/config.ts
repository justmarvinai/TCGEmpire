// Balance and server config. Source of truth: this file -> `pnpm seed` -> supabase/seed/config.sql
// -> game.config (admins can override single keys live). Money values are Basis-€ cents (`*_base_cents`),
// multiplied by the Preisniveau when charged or paid (docs/ECONOMY.md §4). Odds are parts per million.

type Json = string | number | boolean | readonly Json[] | { readonly [k: string]: Json }

export const config = {
  version: '0.0.1-alpha_06',

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
  'ep.pack': 15,
  'ep.new_card': 3,
  'ep.sale': 5,
  'ep.minigame_min': 40,
  'ep.minigame_max': 120,

  // Reference income per hour: base * growth^level (docs/ECONOMY.md §3)
  'income.ref_base_cents': 900_00,
  'income.ref_growth': 1.08,

  // Level rewards: minutes of reference income, plus a booster every n levels
  'level.reward_minutes': 8,
  'level.booster_every': 5,
  // Reward boosters (levels, quests, stamps, chests, tutorial) come from the player's favourite game; the alias
  // is resolved on the server, the default covers players who have not picked yet
  'level.reward_product': 'reward-booster',
  'reward.default_product': 'booster-pkm-base',

  // Preisniveau: P = min(cap, rate^max(0, median career level - free_levels)), daily, limited step
  'price.rate': 1.018,
  'price.cap': 250,
  'price.free_levels': 20,
  'price.max_daily_step_pct': 10,

  // Market (docs/ECONOMY.md §5.2): value = base × P × set factor × game hype × own hype × pressure.
  // Random walks per 5-minute tick: x += revert × (1 − x) + sigma × N(0, 1), clamped to the band.
  'market.print_start': 1,
  'market.print_floor': 0.6,
  'market.print_packs': 5000,
  'market.oop_a': 4,
  'market.oop_b': 1.5,
  'market.oop_week': 0.04,
  'market.oop_cap': 12,
  'market.oop_sealed_mult': 1.5,
  'market.sealed_floor': 0.92,
  'market.sealed_print_max': 1.6,
  'market.hype_min': 0.55,
  'market.hype_max': 2.2,
  'market.hype_revert': 0.001,
  'market.hype_sigma': 0.004,
  'market.card_hype_min': 0.7,
  'market.card_hype_max': 1.6,
  'market.card_hype_revert': 0.004,
  'market.card_hype_sigma': 0.004,
  'market.pressure_min': 0.85,
  'market.pressure_max': 1.2,
  'market.pressure_half_life_h': 4,
  'market.pressure_step': 0.004,
  'market.push_band_pct': 25,
  'market.day_up_pct': 18,
  'market.day_down_pct': 22,
  'market.history_fine_h': 48,
  'market.history_hourly_d': 14,
  // Lager: sealed products you can keep (every booster or display counts 1); more from the upgrade
  'lager.base_units': 60,
  // Scalpers buy a share of every restock shortly after it lands
  'stores.scalper_share_pct': 30,
  'stores.scalper_window_minutes': 20,
  // Kleinanzeigen: NPC ads on the board, how long ads live, risks of attic and normal ads, NPC buyers
  'ads.npc_count': 10,
  'ads.npc_hours': 24,
  'ads.player_days': 3,
  'ads.player_slots': 5,
  'ads.hit_pct': 15,
  'ads.sealed_pct': 10,
  'ads.attic_fake_pct': 15,
  'ads.attic_knick_pct': 10,
  'ads.ghost_pct': 4,
  'ads.offer_chance_pct': 35,
  'ads.max_offers': 3,
  'ads.chargeback_pct': 25,
  // Direkthandel and gifts: free gift value per day and level (Basis-€), Schenkungssteuer above it; fresh and
  // reset accounts wait before trading; open offers per player, items per side, offer lifetime
  'gift.allowance_base_cents_per_level': 50_00,
  'gift.tax_bps': 2000,
  'trade.lock_minutes': 60,
  'trade.max_open': 10,
  'trade.max_items': 20,
  'trade.expiry_hours': 48,
  // Stammtisch: messages kept; KARTEN-BILD market headlines: Cardmarket deals from this value (Basis-€),
  // the day's biggest price move from this change (percent) on items worth at least this much (Basis-€)
  'chat.keep': 5000,
  'feed.big_deal_base_cents': 200_00,
  'feed.price_move_pct': 12,
  'feed.price_move_min_base_cents': 5_00,
  // Händlerlizenzen: the favourite game is free; one more licence at each of these levels, for these fees (Basis-€)
  'license.levels': [10, 20, 28],
  'license.fees_base_cents': [200_00, 600_00, 1_500_00],
  // Presence: seen within this many seconds counts as online
  'presence.online_seconds': 120,
  // Toplists: rows shown; net worth snapshots stay hourly this long, then daily
  'toplist.size': 50,
  'snapshots.hourly_days': 7,
  // Cardmarket: seller fee, shipping time, places for listings and buy orders together
  'market.fee_bps': 500,
  'market.ship_min_minutes': 5,
  'market.ship_max_minutes': 20,
  'market.slots': 10,

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
  'minigame.regale': { energy: 10, duration_s: 45, cap_base_cents: 450_00, pfandbon_at_base_cents: 200_00 },
  'minigame.sortieren': { energy: 12, duration_s: 45, cap_base_cents: 600_00, pfandbon_at_base_cents: 260_00 },
  'minigame.pakete': { energy: 15, duration_s: 40, cap_base_cents: 900_00, pfandbon_at_base_cents: 400_00 },
  // Grading minijobs: a good round (score >= buff.at_base_cents) grants a timed buff (stat, op, value, minutes)
  'minigame.fake': {
    energy: 15,
    duration_s: 45,
    cap_base_cents: 1_100_00,
    pfandbon_at_base_cents: 500_00,
    buff: { stat: 'fake_sense', op: 'flat', value: 1, minutes: 180, at_base_cents: 600_00 },
  },
  'minigame.praktikum': {
    energy: 18,
    duration_s: 45,
    cap_base_cents: 1_300_00,
    pfandbon_at_base_cents: 600_00,
    buff: { stat: 'pregrade_skill', op: 'flat', value: 1, minutes: 180, at_base_cents: 700_00 },
  },

  // Grading (docs/GAME_DESIGN.md §8, docs/ECONOMY.md §5.3). Fees per card in Basis-€ cents, waiting time in
  // minutes, both per service level. PSA and CGC: grade = worst quality value, then the grader is one off now and
  // then (down_pct, up_pct). BGS: every quality value becomes a half-point sub-grade (half_down_pct: 0.5 lower,
  // half_up_pct: 0.5 higher); overall = their average rounded to a half, at most one above the worst sub-grade;
  // four sub-grades of 10 are the Black Label. Upcharge: share of the card value above upcharge_from_base_cents.
  'grading.graders': {
    psa: {
      brand_bps: 10_000,
      fees_base_cents: { economy: 360_00, standard: 700_00, express: 1_600_00 },
      minutes: { economy: 360, standard: 120, express: 20 },
      upcharge_bps: 300,
      down_pct: 12,
      up_pct: 3,
    },
    bgs: {
      brand_bps: 9_500,
      fees_base_cents: { economy: 280_00, standard: 550_00, express: 1_300_00 },
      minutes: { economy: 240, standard: 80, express: 15 },
      upcharge_bps: 200,
      half_down_pct: 45,
      half_up_pct: 15,
    },
    cgc: {
      brand_bps: 8_500,
      fees_base_cents: { economy: 150_00, standard: 300_00, express: 700_00 },
      minutes: { economy: 120, standard: 45, express: 10 },
      upcharge_bps: 100,
      down_pct: 8,
      up_pct: 8,
    },
  },
  'grading.upcharge_from_base_cents': 10_000_00,
  // cards at the graders at the same time (more from the Einsende-Slots upgrade and the Master Sets)
  'grading.slots': 3,
  // value factor per grade 1..10 in basis points, BGS 9.5 (Gem Mint) and the Black Label
  'grading.grade_factor_bps': [4_000, 4_500, 5_000, 5_500, 6_000, 8_000, 10_000, 13_000, 22_000, 80_000],
  'grading.gem_mint_bps': 40_000,
  'grading.black_label_bps': 200_000,
  // 10s are worth more while few exist: × (1 + bonus × ref / (ref + 10s of the card at that grader))
  'grading.pop_ref': 5,
  'grading.pop_bonus_bps': 15_000,
  // Vorprüfung: width of the shown range per quality value (3 = e.g. "7–10"); tools and buffs narrow it
  'grading.inspect_width': 3,
  // chance that cracking a slab nicks a corner (corners −1)
  'grading.crack_damage_pct': 10,
  'ep.grading': 60,
  // Skill tree: a respec costs this many Basis-€ cents per player level. Too Big To Fail (once per run) pays
  // share_bps of the net worth when the cash has fallen below below_bps of it.
  'skills.respec_base_cents_per_level': 500_00,
  'skills.bailout': { below_bps: 500, share_bps: 2_500 },
  // Wohnen: moving sells the old home for refund_bps of what it cost; Nebenkosten per day are nebenkosten_bps of the
  // home's price, charged once per German day (never more than the cash).
  'housing.refund_bps': 5_000,
  'housing.nebenkosten_bps': 50,
  // Gästebuch: entries per visitor and host per day, longest entry
  'guestbook.per_day': 1,
  'guestbook.max_len': 200,
  // Vitrine: display places on the profile (housing adds more later)
  'vitrine.slots': 3,

  // Quests: money in minutes of reference income, EP as a share of the current level
  'quest.mini_slots': 3,
  'quest.mini_reward_minutes': 1,
  'quest.mini_pfandbons': 1,
  'quest.mini_ep_share': 0.1,
  'quest.bonus_every': 10,
  'quest.daily_slots': 5,
  'quest.daily_reward_minutes': 20,
  'quest.daily_ep_share': 0.4,
  'quest.daily_pfandbons': 2,
  'quest.daily_bonus_minutes': 60,
  'quest.daily_bonus_ep_share': 1,
  'quest.weekly_slots': 5,
  'quest.weekly_reward_minutes': 180,
  'quest.weekly_ep_share': 1.5,
  'quest.weekly_pfandbons': 5,
  'quest.weekly_chest_boosters': 3,

  // Stempelkarte: stamp n of the week pays minutes[n-1] of reference income; the 7th also a booster
  'stamp.minutes': [10, 20, 30, 45, 60, 90, 120],
  'stamp.ep_share': 0.3,

  // Geldbunker: rate = base * growth^(Ertrag level) per hour, holds base capacity + upgrades hours
  'bunker.base_rate_base_cents': 120_00,
  'bunker.rate_growth': 1.12,
  'bunker.base_capacity_h': 4,
  'bunker.interest_fill': 0.9,
  // visual stage by the sum of all bunker upgrade levels
  'bunker.stages': [0, 3, 8, 15, 25, 40, 60],
  'ep.bunker': 15,

  // Shifts: wage per hour = reference income * share * job wage * rank bonus * (1 + Fleiß)
  'shift.wage_share': 0.55,
  'shift.rank_hours': [0, 10, 40, 120],
  'shift.rank_bonus': [1, 1.15, 1.35, 1.6],
  'shift.checkin_minutes': 30,
  'shift.checkin_bonus_pct': 5,
  'shift.checkin_max': 4,
  'ep.shift_hour': 150,

  // Achievements: EP per tier as a share of the current level (index = tier - 1)
  'ep.achievement_share': [0.25, 0.5, 1, 2],

  // Account
  'account.reset_cooldown_h': 24,
  'recap.min_away_s': 600,

  // Rate limits per minute
  'rate.buy': 30,
  'rate.open': 30,
  'rate.sell': 30,
  'rate.minigame': 6,
  'rate.market': 60,
  'rate.trade': 20,
  'rate.chat': 12,
  'rate.grading': 30,
} as const satisfies Record<string, Json>

export type ConfigKey = keyof typeof config

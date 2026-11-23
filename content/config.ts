// Balance and server config. Source of truth: this file -> `pnpm seed` -> supabase/seed/config.sql
// -> game.config (admins can override single keys live). Money values are Basis-€ cents (`*_base_cents`),
// multiplied by the Preisniveau when charged or paid (docs/ECONOMY.md §4). Odds are parts per million.

type Json = string | number | boolean | readonly Json[] | { readonly [k: string]: Json }

export const config = {
  version: '0.0.1-alpha_12',

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
  // EP rewards grow a little slower than the EP needed: the late game slows down, the first levels do not
  'ep.reward_growth': 1.03,
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
  // Wochenwertung: growth is measured against at least this base (Basis-€ cents); the best three of a week get
  // this many reward boosters
  'league.min_base_base_cents': 1_000_00,
  'league.rewards': [3, 2, 1],
  // Versicherungen: premiums per German day; the risks they cover: lost parcels (basis points of parcels to players
  // from the unlock level on) and Wasserschaden (chance per day for players with a home of their own, share of every
  // bulk stack that is ruined)
  'insurance.policies': { versand: { premium_base_cents: 20_00 }, hausrat: { premium_bps: 30, min_base_cents: 5_00 } },
  'insurance.lost_parcel_bps': 150,
  'insurance.water_damage_pct': 2,
  'insurance.water_damage_share_pct': 10,
  // Vitrine: display places on the profile (housing adds more later)
  'vitrine.slots': 3,
  // Pack Battles: seconds per revealed round, lead before the first, packs per seat; a won pot of at least this much
  // (Basis-€ cents) makes the headlines; emotes everybody can throw
  'battle.round_seconds': 6,
  'battle.lead_seconds': 4,
  'battle.max_packs': 10,
  'battle.headline_base_cents': 300_00,
  'battle.emotes': ['🔥', '💀', '😂', '🤡', '💸', '😭', '👀', '🙏'],
  // Box Breaks: seconds per revealed pack; spot prices between these shares of the booster's Marktwert (basis points)
  'break.round_seconds': 3,
  'break.min_price_bps': 8_000,
  'break.max_price_bps': 15_000,
  // Aushelfen: share of the remaining time taken off a friend's grading orders and shift (at most this many minutes);
  // both get this many minutes of reference income and this much EP. Kaffee und Kuchen: EP bonus for both.
  'help.speedup_pct': 25,
  'help.max_minutes': 60,
  'help.reward_minutes': 3,
  'help.ep': 20,
  'kaffee.ep_pct': 10,
  'kaffee.minutes': 120,
  // Sammelbestellung: displays per case, wholesale price in basis points of the list price, shares per player and
  // week, hours until an unfilled order is cancelled, minutes until the parcels arrive
  'group_order.case_displays': 6,
  'group_order.price_bps': 9_500,
  'group_order.max_shares_week': 6,
  'group_order.open_hours': 48,
  'group_order.delivery_minutes': 60,
  // Privatkredit: interest, days, smallest loan (Basis-€ cents); a burst loan costs Ruf (of 1000) and blocks new loans
  // for some days; a reminder goes out this many hours before the due date. Ehre: titles from kept and broken deals.
  'loan.max_interest_pct': 30,
  'loan.max_days': 14,
  'loan.min_base_cents': 100_00,
  'loan.default_ruf': 100,
  'loan.schufa_days': 7,
  'loan.remind_hours': 6,
  'honor.solide_kept': 3,
  'honor.ehrenmann_kept': 10,
  'honor.judas_broken': 5,
  // Die Firma (content/company.ts has stages, stations, equipment, services, applicants). Gewerbeanmeldung: fee
  // and waiting time. The owner helps at every station like half a worker. Brand (value of the company's slabs
  // and fair price): base + per Ruf point, in basis points of PSA. Customer factors: Ruf (piecewise linear over
  // Ruf 0–1000), price elasticity against the fair price, speed (backlog longer than speed_hours scares them),
  // backlog_max_hours (nobody queues longer). Accuracy = base + per_stat × staff accuracy + equipment. Ruf drift
  // per working hour. A cycle catches up at most catchup_hours; after offline_hours without the owner the staff
  // work at offline_factor. Payouts to the owner pay Kapitalertragsteuer.
  'company.found_fee_base_cents': 50_00,
  'company.found_wait_minutes': 10,
  'company.owner_help': 1,
  'company.material_base_cents': 15_00,
  'company.brand_base_bps': 3_000,
  'company.brand_per_ruf_bps': 8,
  'company.ruf_points': [[0, 0.2], [200, 0.3], [700, 1], [1000, 1.8]],
  'company.price_elasticity': 1.5,
  'company.price_factor_min': 0.1,
  'company.price_factor_max': 1.6,
  'company.speed_hours': 24,
  'company.speed_min': 0.2,
  'company.backlog_max_hours': 72,
  'company.accuracy_base': 70,
  'company.accuracy_per_stat': 0.25,
  'company.accuracy_max': 99,
  'company.ruf_neutral_accuracy': 85,
  'company.ruf_per_accuracy': 0.25,
  'company.ruf_fast': 0.5,
  'company.ruf_slow': 2,
  'company.review_per_orders': 40,
  'company.catchup_hours': 24,
  'company.offline_hours': 12,
  'company.offline_factor': 0.5,
  'company.applicants_per_day': 4,
  'company.train_wage_hours': 20,
  'company.train_gain': 8,
  'company.train_max': 3,
  'company.raise_pct': 10,
  'company.raise_loyalty': 15,
  'company.fire_wage_hours': 8,
  'company.fire_loyalty': 3,
  'company.loyalty_daily': 1,
  'company.loyalty_unpaid': 10,
  'company.quit_below': 20,
  'company.quit_pct': 15,
  'company.payout_tax_pct': 25,
  'company.value_profit_days': 30,
  'company.invest_bps': 5_000,
  // Orders from players: at least the service's own time, longer if the queue is longer. VIP orders (graded by the
  // owner): chance per hour, minutes until they leave, fee as a multiple of the fair Express price, the width of the
  // shown ranges by Prüfung equipment level, the total error at which the fee drops to 0, Ruf for exact, close
  // (error ≤ 2) and bad (error ≥ 6) judgements.
  'company.service_minutes': { economy: 360, standard: 120, express: 20 },
  'company.vip_per_hour': 0.25,
  'company.vip_minutes': 180,
  'company.vip_fee_mult': 3,
  'company.vip_widths': [4, 3, 3, 2, 1, 1],
  'company.vip_error_zero': 8,
  'company.vip_ruf_exact': 5,
  'company.vip_ruf_close': 2,
  'company.vip_ruf_bad': -3,
  // Decisions: chance per hour while none is open, hours until the ignore choice happens. Umsatzsteuer-Voranmeldung
  // every tax_days; late: a fee of tax_late_pct of the week's revenue; a Steuerberater (one-off, × stage wage level)
  // files by himself for tax_advisor_pct. Shady: Schwarzarbeit pays wages × schwarz_wage_pct with a Zoll chance per
  // hour (fine: schwarz_fine_hours of wages, Ruf); evaded Kapitalertragsteuer may meet a Steuerprüfung (chance per
  // hour, back payment + penalty, Ruf); every Gefälligkeitsgutachten may blow up (chance per hour per slab; certain
  // when such a slab is cracked): Ruf, and every slab of the company is worth less for scandal_days. Mystery-Boxen:
  // bulk cards sold at mystery_markup × their value; the buyers' disappointment costs Ruf per box over time.
  // Awards bring Ruf. A repaid loan is a kept deal: Ruf for the borrower.
  'company.decision_per_hour': 0.15,
  'company.decision_hours': 12,
  'company.tax_days': 7,
  'company.tax_late_pct': 10,
  'company.tax_advisor_base_cents': 15_000_00,
  'company.tax_advisor_pct': 2,
  'company.schwarz_wage_pct': 70,
  'company.schwarz_check_per_hour': 0.002,
  'company.schwarz_fine_hours': 72,
  'company.schwarz_ruf': -30,
  'company.audit_per_hour': 0.0015,
  'company.audit_penalty_pct': 50,
  'company.audit_ruf': -25,
  'company.bump_check_per_hour': 0.0005,
  'company.scandal_ruf': -50,
  'company.scandal_brand_pct': 70,
  'company.scandal_days': 7,
  'company.mystery_markup': 1.5,
  'company.mystery_max': 200,
  'company.mystery_ruf_per_box': 0.15,
  'company.mystery_per_hour': 25,
  'company.award_ruf': 20,
  'loan.repaid_ruf': 5,
  // Events: a personal event per hour (players seen in the last day), a random event on the market per hour, the
  // weekly Highlight-Events (ISO weekday, Berlin time).
  'events.enabled': true,
  'events.personal_per_hour': 0.12,
  'events.personal_active_hours': 24,
  'events.random_per_hour': 0.05,
  'events.highlight_times': [[3, '20:00'], [5, '20:00'], [7, '18:00']],
  // Prestige (docs/ECONOMY.md §11): Sterne = per exit + √(empire value in units of 1 Mio. Basis-€); Ruf keeps half of its
  // distance from 500; Omas Dachboden gives back items worth some minutes of reference income per day
  'prestige.stars_base': 10,
  'prestige.value_unit_base_cents': 100_000_000,
  'prestige.ruf_keep_pct': 50,
  'attic.daily_minutes': 120,
  // Platform budget (docs/ARCHITECTURE.md §9): Supabase Free database size and the admin warning threshold
  'platform.db_limit_mb': 500,
  'platform.warn_pct': 60,
  // Streaming (content/streaming.ts): viewers, donations per hit in minutes of reference income per 100 viewers,
  // Followers per hit as a share of the viewers, a daily donation cap
  'stream.start_viewers': 5,
  'stream.follower_viewers_pct': 2,
  'stream.viewers_per_pack': 2,
  'stream.decay_per_pack': 0.97,
  'stream.idle_minutes': 30,
  'stream.donation_minutes': { hit: 2, ultra: 10, grail: 60 },
  'stream.follow_share': { hit: 0.05, ultra: 0.2, grail: 0.5 },
  'stream.viewer_boost': { hit: 5, ultra: 30, grail: 100 },
  'stream.daily_cap_minutes': 60,
  'stream.sponsor_hours': 24,
  'stream.exit_followers_pct': 50,
  // Höhle der Löwen (content/mogul.ts): once a week three offers, cash for a share of the company (at most 49 %)
  'loewen.offers': 3,
  'loewen.cash_min_pct': 10,
  'loewen.cash_max_pct': 35,
  'loewen.share_min_pct': 5,
  'loewen.share_max_pct': 20,
  'loewen.max_share_pct': 49,
  // Megaprojekte and Museum (content/mogul.ts)
  'mega.min_base_cents': 1_000_00,
  'museum.raise_pct': 5,
  'museum.snipe_minutes': 5,
  // Sonntags-Flohmarkt: Flohmarkt-Horst's ads in the Kleinanzeigen, at a share of the Marktwert
  'flohmarkt.stalls': 6,
  'flohmarkt.price_min_pct': 35,
  'flohmarkt.price_max_pct': 70,
  // Bares für Rares (docs/GAME_DESIGN.md §7): once a day an appraisal and three dealer bids, plus the 80-€ man
  'bares.estimate_min_pct': 85,
  'bares.estimate_max_pct': 125,
  'bares.bid_min_pct': 50,
  'bares.bid_max_pct': 100,
  'bares.dealers': 3,
  'bares.fixed_base_cents': 80_00,
  'bares.copies': 60,
  // Schattenwirtschaft (docs/ECONOMY.md §10): attack roll, limits, Rache, Präparierte Booster
  'darkside.angriff_per_skill': 5,
  'darkside.chance_min': 5,
  'darkside.chance_max': 85,
  'darkside.fine_pct': 100,
  'darkside.schadenfreude_pct': 50,
  'darkside.cooldown_minutes': 60,
  'darkside.daily_successes': 2,
  'darkside.loss_cap_bps': 1_000,
  'darkside.revenge_hours': 24,
  'darkside.revenge_cost_pct': 50,
  'darkside.revenge_bonus': 10,
  'darkside.bunker_loot_pct': 25,
  'darkside.tip_pct': 10,
  'darkside.review_ruf': 25,
  'darkside.rumour_pct': 15,
  'darkside.rumour_card_hours': 6,
  'darkside.rumour_cards': 40,
  'darkside.poach_wage_pct': 20,
  'darkside.poach_loyalty': 60,
  'darkside.poach_loyalty_def': 0.2,
  'darkside.reseal_fee_pct': 20,
  'darkside.reseal_max': 20,
  // Research from this stage on. Großhandel (level 40, with a company): displays per week by company stage at
  // price_bps of the list price, delivered after delivery_minutes.
  'company.research_stage': 3,
  'wholesale.price_bps': 8_000,
  'wholesale.displays_per_stage': [2, 4, 8, 12, 18, 24, 30],
  'wholesale.delivery_minutes': 60,

  // Quests: money in minutes of reference income, EP as a share of the current level
  'quest.mini_slots': 3,
  'quest.mini_reward_minutes': 1,
  'quest.mini_pfandbons': 1,
  'quest.mini_ep_share': 0.03,
  'quest.bonus_every': 10,
  'quest.daily_slots': 5,
  'quest.daily_reward_minutes': 20,
  'quest.daily_ep_share': 0.2,
  'quest.daily_pfandbons': 2,
  'quest.daily_bonus_minutes': 60,
  'quest.daily_bonus_ep_share': 0.5,
  'quest.weekly_slots': 5,
  'quest.weekly_reward_minutes': 180,
  'quest.weekly_ep_share': 0.8,
  'quest.weekly_pfandbons': 5,
  'quest.weekly_chest_boosters': 3,

  // Stempelkarte: stamp n of the week pays minutes[n-1] of reference income; the 7th also a booster
  'stamp.minutes': [10, 20, 30, 45, 60, 90, 120],
  'stamp.ep_share': 0.2,

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
  'ep.achievement_share': [0.1, 0.2, 0.4, 0.8],

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
  'rate.attack': 10,
  'rate.chat': 12,
  'rate.grading': 30,
  'rate.battle': 6,
  'rate.emote': 20,
  'rate.friend': 20,
  'rate.email': 5,
} as const satisfies Record<string, Json>

export type ConfigKey = keyof typeof config

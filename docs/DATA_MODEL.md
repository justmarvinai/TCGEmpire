# TCGEmpire — Data Model and RPC Catalog

> Status: **approved plan.** This is the intended shape, not a final schema. It becomes the living reference once
> coding starts: every migration updates this file.

## 1. Schemas

| Schema | Content | Exposed to the client? |
|--------|---------|------------------------|
| `public` | RPC functions only | **Yes** (execute for `authenticated`, never `anon`) |
| `game` | State tables | No |
| `content` | Catalog and balance, generated from `content/` | No (read through RPCs / shipped in the client bundle) |
| `private` | Internal functions (engines, tick, helpers) | No |

Conventions: `snake_case`; primary keys `uuid` (or text keys for content); money `*_cents bigint`;
rates `*_bps`; timestamps `timestamptz`; every foreign key indexed; text + check instead of enums;
RLS enabled on every table with no policies.

## 2. Tables by domain

### Identity and progress

| Table | Key columns | Purpose |
|-------|-------------|---------|
| `game.players` | id, username, cash_cents, level, ep, skill_points, ruf, pfandbons, energy, energy_at, prestige, stars, is_admin, created_at, last_seen_at | The player row; the only place cash lives. |
| `game.player_stats` | player_id, stats jsonb, computed_at | Resolved modifiers (cache). |
| `game.modifiers` | player_id, source_kind, source_key, stat, op, value, expires_at | One row per active effect from upgrades, skills, perks, decor, set goals, buffs. |
| `game.server` | single row: invite_code_hash, price_level, price_level_day, clock_offset | Server-wide settings and the Preisniveau. |
| `game.credentials`, `game.sessions` | password_hash, failed_count, locked_until · auth_uid → player_id | Own login: bcrypt hashes; which anonymous Supabase session is signed in as which player. |
| `game.unlocks` | player_id, feature, unlocked_at, tour_seen | Feature gates and seen tours. |
| `game.settings` | player_id, data jsonb | Sound, animations, etc. |

### Money

| Table | Key columns | Purpose |
|-------|-------------|---------|
| `game.ledger` | id, player_id, delta_cents, balance_after, reason, ref, at | Every money change (kept 14 days). |
| `game.ledger_daily` | day, player_id, reason, sum_cents, count | Permanent daily totals per reason. |
| `game.requests` | player_id, request_id, action, result jsonb, at | Idempotency journal (3 days). |
| `game.rate_limits` | player_id, bucket, window_start, count | Rate limiting. |

### Catalog (generated)

| Table | Purpose |
|-------|---------|
| `content.games`, `content.sets`, `content.cards` | Games, sets (with lifecycle defaults), cards (tier, desirability, base value). |
| `content.products`, `content.pack_slots` | Sealed products and slot odds per product. |
| `content.stores` | Retail stores, schedules, limits. |
| `content.jobs`, `content.minigames` | Jobs, ranks, wages, perks. |
| `content.upgrades`, `content.skills`, `content.perks` | Ladders, costs, modifiers. |
| `content.quests`, `content.achievements` | Templates: event, filter, target, reward. |
| `content.homes`, `content.furnishing`, `content.cosmetics`, `content.luxury` | Housing and vanity. |
| `content.events` | Event definitions and weights. |
| `content.npc_archetypes`, `content.npcs` | NPC behaviour parameters and cast. |
| `content.company_*` | Stages, staff archetypes, equipment, research. |
| `content.levels` | EP table, unlocks and rewards per level. |
| `content.config` | Key → jsonb balance values. |
| `game.config_overrides` | Admin live overrides (survive deploys). |

### Cards and inventory

| Table | Key columns | Purpose |
|-------|-------------|---------|
| `game.card_stacks` | owner_id, card_id, qty, qty_listed | Bulk cards (Common–Rare). |
| `game.card_copies` | id, card_id, owner_id, q_centering, q_corners, q_edges, q_surface, is_fake, grader, grade, label_grade, cert_no, location (inventory / vitrine / attic / listed / grading / escrow), pulled_by, pulled_at | Individual hits and slabs. |
| `game.sealed_stacks` | owner_id, product_id, variant (normal / weighed / resealed), qty | Sealed product. |
| `game.openings` | id, player_id, product_id, cards jsonb, state, at | Decided pack contents awaiting reveal; opening history (thinned). |
| `game.pity` | player_id, set_id, dry_streak | Pech-Schutz counters. |
| `game.collection` | player_id, card_id, first_owned_at, best_grade | Binder progress (survives selling). |
| `game.set_state` | set_id, phase, packs_printed, packs_opened, sealed_left, oop_at | Lifecycle and supply per set. |
| `game.pop_report` | card_id, grader, grade, count | Population per grade. |

### Market

| Table | Purpose |
|-------|---------|
| `game.prices` | Current Marktwert per card/product plus factors (hype, pressure). |
| `game.price_history` | Thinned history (5 min / hourly / daily). |
| `game.market_state` | Hype index per game, cached market snapshot, tick counters. |
| `game.listings`, `game.buy_orders` | Cardmarket. |
| `game.auctions`, `game.bids` | eBay and museum auctions. |
| `game.ads`, `game.ad_offers` | Kleinanzeigen (NPC ads, player ads, haggling state). |
| `game.trades` | Direct trades (offer, both sides' items, state). |
| `game.sales_log` | Completed sales (for charts, tax, anti-wash rules; thinned). |
| `game.shipments` | Shipping timers, insurance. |
| `game.store_stock`, `game.store_purchases` | Shared retail stock per restock and per-player limits. |
| `game.npc_state`, `game.npc_stacks` | NPC budgets, moods and inventories. |

### Work, idle, quests

| Table | Purpose |
|-------|---------|
| `game.bunker` | Level per track, accrual_started_at, security. |
| `game.job_progress`, `game.shifts`, `game.minigame_runs` | Ranks and hours, running shift, issued mini-game rounds (seed, max score). |
| `game.upgrades_owned`, `game.skills_owned`, `game.perks_owned` | Levels per key. |
| `game.quests`, `game.quest_history` | Active quests with progress; recent draws to avoid repeats. |
| `game.achievements`, `game.counters` | Unlocked tiers; lifetime statistics per event type. |
| `game.stamps` | Stempelkarte. |
| `game.buffs` | Temporary effects (Fettfinger, Glückstag …). |

### Grading and company

| Table | Purpose |
|-------|---------|
| `game.grading_orders` | Player submissions to NPC graders or companies: copy, service, fee, due_at, result. |
| `game.companies` | Owner, name, label design, stage, cash, ruf snapshot, prices, settings, last_cycle_at. |
| `game.company_staff`, `game.company_applicants` | Staff with stats, salary, loyalty; daily applicant pool. |
| `game.company_equipment`, `game.company_research` | Owned equipment and research. |
| `game.company_cycles` | Per-cycle results (7 days) and daily summaries. |
| `game.company_decisions` | Pending decision cards. |
| `game.reviews` | Generated and player reviews. |
| `game.shares` | Stille Teilhaberschaft. |

### Life and social

| Table | Purpose |
|-------|---------|
| `game.homes`, `game.furnishing`, `game.vitrine` | Housing tier, furnishing item per slot, displayed copies. |
| `game.cosmetics_owned`, `game.titles_owned` | Cosmetics, titles; the profile picture is a card id on the player row. |
| `game.guestbook`, `game.visits` | Visits. |
| `game.chat_messages` | Stammtisch (capped). |
| `game.feed` | KARTEN-BILD entries: template key + params (text is rendered on the client). |
| `game.notifications` | Personal messages. |
| `game.battles`, `game.battle_seats`, `game.battle_timeline` | Pack battles. |
| `game.breaks`, `game.break_spots` | Box breaks. |
| `game.loans`, `game.gifts`, `game.honor` | Loans, gift allowance, kept/broken deals. |
| `game.attacks` | Every attack: kind, attacker, target, roll, outcome (success / blocked), loot, cooldown. |
| `game.insurance` | Active policies. |
| `game.streams`, `game.sponsor_deals` | Streaming. |

### World

| Table | Purpose |
|-------|---------|
| `game.events_active` | Running global and personal events. |
| `game.megaprojects`, `game.donations` | Server goals. |
| `game.toplist_snapshots`, `game.rivals` | Cached rankings, NPC rivals. |
| `game.leagues` | Wochenwertung. |
| `game.prestige_history` | Past runs. |
| `game.tick_schedule`, `game.job_runs` | Tick systems with intervals; run log. |
| `game.admin_audit` | Admin actions. |
| `game.versions` | State-area version counters per player for `sync`. |

## 3. RPC catalog (planned)

Naming: `<area>_<verb>` in schema `public`. Reads are `stable` and return one jsonb document for a page; writes take
`p_request_id` first and return the changed state.

| Area | Reads | Writes |
|------|-------|--------|
| Session | `sync`, `me_get`, `recap_get` | `join` (username, password, invite code), `login`, `logout`, `recap_collect`, `settings_set`, `tour_seen`, `account_reset`, `account_delete` |
| Packs | `shop_get`, `opening_get` | `store_buy` (qty), `pack_open` (qty 1/5/10/36, returns every pack's content at once), `opening_finish`, `display_unbox` |
| Collection | `binder_get`, `card_get`, `inventory_get` | `bulk_sell`, `vitrine_set`, `attic_move`, `bulk_recycle` |
| Market | `market_overview`, `market_card`, `my_listings`, `ads_get`, `auctions_get`, `trade_get` | `listing_create/cancel/buy`, `order_create/cancel`, `ad_offer`, `ad_post`, `ad_answer`, `auction_create`, `auction_bid`, `trade_propose/update/confirm/cancel`, `ankauf_sell` |
| Grading | `grading_get`, `pop_report_get` | `pregrade`, `grading_submit`, `grading_reveal`, `slab_crack` |
| Jobs | `jobs_get` | `minigame_start`, `minigame_finish`, `shift_start`, `shift_checkin`, `shift_claim`, `energy_refill` |
| Bunker | `bunker_get` | `bunker_collect`, `bunker_upgrade` |
| Progress | `upgrades_get`, `skills_get`, `quests_get`, `achievements_get`, `level_path_get` | `upgrade_buy`, `skill_learn`, `skills_respec`, `quest_claim`, `quest_reroll`, `stamp_claim`, `level_reward_claim` |
| Company | `company_get`, `company_staff_get`, `company_orders_get` | `company_found`, `company_stage_up`, `staff_hire/fire/raise/train`, `equipment_buy`, `research_start`, `prices_set`, `marketing_start`, `decision_answer`, `order_grade_manual`, `payout`, `tax_file` |
| Life | `home_get`, `wardrobe_get`, `profile_get`, `luxury_get` | `home_buy`, `decor_buy/place`, `cosmetic_buy/equip`, `title_set`, `guestbook_sign`, `visit_gift`, `luxury_buy` |
| Social | `chat_get`, `feed_get`, `players_get`, `toplist_get` | `chat_send`, `gift_send`, `loan_offer/accept/repay`, `help_friend`, `feed_react` |
| Battles | `battles_get`, `battle_get`, `break_get` | `battle_create/join/leave/start`, `break_create/buy_spot/start`, `emote_send` |
| Dark side | `attacks_get` (incl. own Abwehr and success preview) | `attack_start` (kind, target), `reseal_packs`, `weigh_packs`, `revenge` |
| Events / world | `events_get`, `megaprojects_get` | `event_claim`, `megaproject_donate`, `insurance_buy/cancel`, `lotto_buy` |
| Prestige | `prestige_get` | `prestige_do`, `perk_buy` |
| Admin | `admin_dashboard`, `admin_players`, `admin_jobs` | `admin_set_phase`, `admin_restock`, `admin_event_start/stop`, `admin_config_set`, `admin_invite_set`, `admin_grant`, `admin_announce`, `admin_auction_create` |

## 4. Engines (internal)

| Function family | Job |
|-----------------|-----|
| `private.money_add`, `private.item_*` | The only ways to change cash and inventory; write ledger and versions. |
| `private.eur(base_cents)` | Basis-€ → real cents at the current Preisniveau. The only way a config amount becomes money. |
| `private.emit` | Event bus → quests, achievements, counters, feed. |
| `private.stat(player, key)` | Effective stat from modifiers, buffs and events. |
| `private.roll_*` | Seeded randomness (pack contents, quality values, events). |
| `private.settle_*` | Lazy settlement (bunker, shift, energy, grading, shipments). |
| `private.tick` and `private.tick_*` | Dispatcher and systems. |
| `private.request_*`, `private.rate_limit`, `private.fail`, `private.require_player` | RPC plumbing. |

## 5. Retention

| Data | Kept |
|------|------|
| Ledger rows | 14 days, then only daily sums |
| Price history | 5-minute points 2 days, hourly 14 days, daily forever |
| Sales log, company cycles, job runs | 7–30 days, daily sums forever |
| Chat | Last 5.000 messages |
| Feed | Last 2.000 entries (highlights forever) |
| Notifications | 30 days |
| Requests journal, rate limits | 3 days / 1 day |
| Openings | Last 200 per player (best pulls forever) |

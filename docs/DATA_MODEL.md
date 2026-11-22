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
| `game.trades` | alpha_04 · open Direkthandel offers: both sides as goods JSON (`money_cents`, `items`), nothing reserved; expire after `trade.expiry_hours`. |
| `game.gift_days` | alpha_04 · gift value given per player and Berlin day (against the allowance). |
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
| `game.company_founding`, `game.companies` | alpha_09 · Gewerbeanmeldung progress (step, ready_at). The company: owner, name (unique among open ones), slogan, label (`bg`, `fg` colour keys, 8×8 `emblem` as 16 hex digits), stage and a pending stage with its ready time, own account `cash_cents`, prices per service, equipment level per station (jsonb), backlog, fractional Ruf drift, invested money (stages and equipment), lifetime orders, `last_cycle_at`, `closed_at` (a reset closes it; its slabs keep the label). |
| `game.company_staff`, `game.company_applicants` | alpha_09 · Staff (archetype, name indexes into the content pools, station, Tempo, Genauigkeit, Treue, wage per hour in Basis-€, trainings) and the applicants of the German day. |
| `game.company_research` | Research (planned; equipment is `companies.equipment`). |
| `game.company_days` | alpha_09 · Orders, revenue and costs per company and German day (14 days kept). Cycles run in the tick `company` and on every `company_get`. |
| `game.company_decisions` | Pending decision cards. |
| `game.company_reviews` | alpha_09 · Generated customer reviews (stars, text index into the content pool); the newest 50 are kept. |
| `game.shares` | Stille Teilhaberschaft. |

### Life and social

| Table | Purpose |
|-------|---------|
| `game.homes`, `game.furnishing`, `game.vitrine` | Housing tier, furnishing item per slot, displayed copies. |
| `game.cosmetics_owned`, `game.titles_owned` | Cosmetics, titles; the profile picture is a card id on the player row. |
| `game.guestbook`, `game.visits` | Visits. |
| `game.chat` | alpha_04 · Stammtisch: body (≤ 280), optional linked card/product, author set null on account deletion; the newest `chat.keep` stay. |
| `game.feed` | KARTEN-BILD entries: template key + params (text is rendered on the client). alpha_04 adds `overtake`, `big_deal` (trigger on `game.shipments`), `price_move` (tick `headlines`, once per day and direction). |
| `game.notifications` | Personal messages. |
| `game.battles`, `game.battle_seats`, `game.battle_pulls`, `game.battle_emotes` | alpha_08 · Pack Battles: lobby (mode, booster, packs, seats, stake per seat = Marktwert × packs, state open/running/done/cancelled, `started_at`, `round_seconds`, `ends_at`, `result` with winning seats and totals); seats (player or NPC bot, paid stake, total); every card rolled at the start (seat, round, value then, quality of hits); emotes. Clients only get rounds whose time has come. Settled by the tick `battles` or the first `battle_get` after `ends_at`. |
| `game.breaks`, `game.break_spots`, `game.break_pulls`, `game.break_emotes` | alpha_08 · Box Breaks: the display on the table (taken from the host's shelf, given back on cancel), its booster and pack count, spot price, state and timeline; sold spots per pack number with the escrowed payment; every card rolled at the start per pack; emotes. Settled by the tick `battles` or the first `break_get` after `ends_at`. |
| `game.loans`, `players.honor_kept`, `players.honor_broken`, `players.schufa_until` | alpha_08 · Privatkredit: lender, borrower, principal, interest %, days, state (offered/active/repaid/defaulted/cancelled), due date, reminder flag; open loans count in net worth (lender +, borrower −). Ehre: kept and broken deals on the player row (a title is derived from them); Schufa blocks new loans after a burst one. Gifts: `game.gift_days` (alpha_04). |
| `game.attacks` | Every attack: kind, attacker, target, roll, outcome (success / blocked), loot, cooldown. |
| `game.insurance` | Active policies. |
| `game.streams`, `game.sponsor_deals` | Streaming. |

### World

| Table | Purpose |
|-------|---------|
| `game.events_active` | Running global and personal events. |
| `game.megaprojects`, `game.donations` | Server goals. |
| `game.licenses` | alpha_05 · Händlerlizenzen per player and game; the first is the favourite (`game.players.fav_game`, free). Triggers on `store_purchases` and `store_buys` refuse unlicensed games (`no_license`). |
| `game.goal_defs`, `game.goals_done` | alpha_05 · Sammelziele (card groups and a bonus, seeded from `content/goals.ts`) and reached goals; a trigger on `game.collection` checks them and books a permanent modifier `goal:<key>`. alpha_06 adds `goal_defs.min_grade` (Master Set: a group counts only with `collection.best_grade` at or above it). |
| `game.card_copies` (alpha_06 columns) | `grader` (psa/bgs/cgc), `grade` numeric(3,1), `subgrades` (BGS: centering, corners, edges, surface), `black_label`, `cert_no` (unique), `graded_at`, `inspected_w` (width of the Vorprüfung ranges seen), `vitrine_pos`; `location` adds `grading` and `vitrine`. A slab is a copy with a grader; a trigger on owner or grade changes keeps `collection.best_grade` and runs the goal check. |
| `game.grading_orders` | alpha_06 · one row per card at a grader: grader, service, fee, `submitted_at`, `due_at`, `notified`. Deleted at the reveal. |
| `game.pop_report` | alpha_06 · slabs ever made per card, grader, grade and Black Label; never decremented (cracked slabs stay counted). |
| `game.cert_seq`, `game.sales_log.slab` | alpha_06 · certificate numbers (scrambled per grader); slab sales are logged with their label and do not move the Marktwert. |
| `game.skill_defs`, `game.skills_owned` | alpha_07 · Skillbaum from `content/skills.ts` (branch, tier, cost, requirements, stat); learned nodes book modifiers `skill:<key>`; a reset clears them. |
| `game.home_defs`, `game.furniture_defs`, `game.homes`, `game.furnishings` | alpha_07 · Wohnen from `content/housing.ts`; the current home (paid price, Nebenkosten day, disaster day) and one item per furnishing slot (paid price). Modifiers `home` and `furniture:<slot>`. |
| `game.guestbook` | alpha_07 · entries on a player's profile (host, author, body); one per visitor and host per day. |
| `game.cosmetic_defs`, `game.cosmetics_owned`, `players.style`, `players.avatar_card` | alpha_07 · Stil from `content/cosmetics.ts`; equipped look per kind (jsonb) and the card used as profile picture. |
| `players.best_pull_card`, `players.best_pull_cents`, `game.league` | alpha_07 · the most valuable card ever pulled (value then); Wochenwertung per week and player: start net worth, value moved to/from other players (`adjust_cents`), final growth and rank. |
| `game.insurance` | alpha_07 · policies (versand, hausrat) with the day the premium was paid. |
| `game.friend_acts` | alpha_08 · Aushelfen and Kaffee und Kuchen: actor, target, kind and German day (one per pair, kind and day). |
| `game.group_orders`, `game.group_order_shares` | alpha_08 · Sammelbestellung: a case of displays (product, wholesale unit price fixed at the start, state, expiry) and each player's shares and payment; a full case becomes one shipment per player. |
| `players.rt_topic` | alpha_08 · random id of the player's private Realtime channel (`player:<rt_topic>`); triggers on notifications, feed, chat and battles send pokes (`private.rt_send`). |
| `game.worth_snapshots` | alpha_04 · net worth per player, hourly for `snapshots.hourly_days`, then the last one per Berlin day; deleted on reset. |
| `game.rivals` | alpha_04 · 40 NPC tycoons (seeded from `content/rivals.ts`); their numbers are pure functions of the days since `game.server.started_at`. `game.server.worth_ranking` remembers the last Vermögen order for overtake headlines. |
| `game.leagues` | Wochenwertung. |
| `game.prestige_history` | Past runs. |
| `game.tick_schedule`, `game.job_runs` | Tick systems with intervals; run log. |
| `game.admin_audit` | Admin actions. |
| `game.versions` | State-area version counters per player for `sync`. |

## 2a. Implemented so far (alpha_01–03)

| Table | Purpose |
|-------|---------|
| `game.server` | single row: invite code hash, Preisniveau, clock offset (tests) |
| `game.players`, `game.credentials`, `game.sessions` | player, bcrypt login, anonymous session → player |
| `game.config`, `game.config_overrides` | seeded balance values, live admin overrides |
| `game.ledger`, `game.ledger_daily` | every money change (14 days), daily sums per reason |
| `game.requests`, `game.rate_limits` | idempotency journal, rate limits |
| `game.modifiers`, `game.counters` | stat bonuses; lifetime event counters |
| `game.notifications`, `game.feed` | personal messages; server feed (kind + data) |
| `game.tick_systems`, `game.job_runs` | tick dispatcher and its log |
| `game.set_defs`, `game.card_defs`, `game.product_defs` | catalog from `content/` (phase is admin-owned) |
| `game.sealed`, `game.card_stacks`, `game.card_copies`, `game.collection` | sealed boosters; Common–Rare stacks; Holo+ copies with four hidden quality values; ever-pulled cards |
| `game.pity`, `game.store_purchases` | dry streak per set; Kiosk daily limit |
| `game.quest_templates`, `game.quests` | mini-quest templates (seeded) and active/claimed quests |
| `game.tutorial_steps` | seeded steps; progress in `players.tutorial_step` (-1 = done) |
| `game.minigame_runs` | started/finished minijob rounds |
| `game.stamps` | alpha_03 · Stempelkarte of the week: stamped days, last day, joker used |
| `game.upgrade_defs`, `game.upgrades_owned` | alpha_03 · upgrade catalog (seeded); level per player; effects are `modifiers` rows (source `upgrade:<key>`, unique per player, source and stat) |
| `game.bunker` | alpha_03 · accrual start; rate, capacity, interest and security come from upgrades |
| `game.job_defs`, `game.job_hours`, `game.shifts` | alpha_03 · jobs (seeded); hours per job for ranks; one running shift per player with check-ins |
| `game.consumable_defs` | alpha_03 · snacks and Pfandautomat items (seeded); buffs are `modifiers` rows with `expires_at` |
| `game.achievement_defs`, `game.achievements` | alpha_03 · tiers and titles (seeded); reached tier per player |
| new columns | alpha_03 · `players.title, reroll_day, daily_bonus_day, weekly_bonus_week, reset_at`; `quest_templates.kind, min_level`; `quests.kind, period` |

| RPC | Kind | Notes |
|-----|------|-------|
| `me_get`, `sync` | read | player doc incl. energy, sealed count, ready quests, net worth |
| `join`, `login`, `logout` | write | own login on anonymous sessions |
| `shop_get` | read | Kiosk offers, own sealed products |
| `store_buy(qty 1/5/10)` | write | Kiosk price = list × markup × P; daily limit |
| `pack_open(qty 1..10)` | write | rolls and books everything; returns all packs |
| `binder_get(set)` | read | all cards of a set with holdings and values |
| `ankauf_sell(stacks, copies)` | write | 60 % of value |
| `quests_get`, `quest_claim` | read/write | endless mini-quests, bonus booster every 10th |
| `tutorial_ack`, `tutorial_skip` | write | steps complete through `private.emit` |
| `minigame_start`, `minigame_finish` | write | energy cost, time check, score cap |
| `level_path_get` | read | EP and rewards per level |
| `quests_get`, `quest_claim`, `quest_reroll`, `stamp_claim(joker)` | read/write | alpha_03 · mini, daily (00:00) and weekly (Monday) quests; one free reroll a day; Stempelkarte |
| `bunker_get`, `bunker_collect` | read/write | idle money up to capacity; interest when at least 90 % full |
| `upgrades_get`, `upgrade_buy` | read/write | now → next per upgrade; bunker upgrades pay the bunker out first |
| `jobs_get`, `shift_start`, `shift_checkin`, `shift_claim` | read/write | shifts of 15 min–8 h, ranks from hours, check-ins every 30 min; early end pays the time worked |
| `consumable_use` | write | snacks (money) and Pfandautomat items (Pfandbons) |
| `stats_get`, `title_set` | read/write | counters, achievements, titles |
| `recap_get`, `recap_collect` | read/write | "Willkommen zurück": bunker and finished shift in one click |
| `account_reset`, `account_delete` | write | Gefahrenzone; confirmed with the username; reset once per 24 h |
| `home_get` | read | home page document: latest Holo-or-better pull (index `card_copies_pulled`); alpha_04 adds `worth` (now, 7-day hourly history ending now, value at the end of yesterday) |
| `toplist_get(list, npcs)` | read | alpha_04 · `worth`, `level`, `cash`, `collection`; top `toplist.size` rows plus the caller and the row directly ahead; rivals optional |
| `players_get`, `trade_inventory(player)`, `trade_quote(to, give, take)` | read | alpha_04 · players with presence and trade lock; tradeable goods of any player; values and Schenkungssteuer of a planned gift or trade |
| `gift_send`, `trade_offer`, `trade_answer(trade, accept)` | write | alpha_04 · gifts move at once; trades on acceptance (both sides re-checked, players locked by id); the side giving more value books the difference against its allowance and pays 20 % above it; the offerer withdraws with `accept = false` |
| `chat_get`, `chat_send(body, item)` | read/write | alpha_04 · last 100 messages plus who is online; the chat page polls every 5 s until Realtime |
| `admin_get`, `admin_set_phase`, `admin_restock`, `admin_invite_set`, `admin_config_set`, `admin_grant`, `admin_announce` | read/write | alpha_04 · admin only (`forbidden`); every write returns the console document. Out of Print stores `oop_at` and `sealed_at_oop`; a step back from OOP/Vintage is a reprint and clears both |
| `licenses_get`, `starter_pick(game)`, `license_buy(game)` | read/write | alpha_05 · the first pick is free and completes tutorial step 0; further licences at `license.levels` for `license.fees_base_cents`. `sealed_add` resolves the product alias `reward-booster` to the favourite game's booster |
| `goals_get` | read | alpha_05 · every goal with groups owned (`have` / `total`), `done_at` and the bonus. The `game.collection` trigger also emits `collect_<game>` for the collector achievements |
| `grading_get` | read | alpha_06 · slots, Lupe width, graders with fees per service (real cents) and minutes, raw copies with their Vorprüfung ranges and upcharges, open orders, slabs with value and label |
| `grading_inspect(copy, card)` | write | alpha_06 · Vorprüfung of a hit, or of one card of a bulk stack (it becomes a copy). Ranges are deterministic per copy, value and width (`private.q_range`) |
| `grading_submit(copies, grader, service)` | write | alpha_06 · fee per card (`private.grading_fee`: service fee + upcharge above the threshold), slots checked, copies move to `grading` |
| `grading_reveal(orders)` | write | alpha_06 · due orders only (`not_ready`); rolls the grade (`private.grade_roll`), certificate, Pop Report, EP, events `graded`/`graded_10`/`black_label`, headline for 10s and Ultra/Grail disasters |
| `slab_crack(copy)`, `pop_report_get(card)` | write/read | alpha_06 · cracking makes the copy raw again (chance to lose a corner point); the Pop Report lists every grade with its slab value |
| `vitrine_set(copies)`, `profile_get(player)` | write/read | alpha_06 · the Vitrine holds up to `vitrine.slots` hits or slabs in order; any player's profile: level, net worth, counters, Vitrine |
| `skills_get`, `skill_learn(key)`, `skills_respec`, `bailout_claim` | read/write | alpha_07 · points, owned nodes, respec price; Too Big To Fail pays a share of the net worth once per run when the cash is below a share of it |
| `housing_get`, `home_buy(tier)`, `furniture_buy(key)` | read/write | alpha_07 · moving sells the old home for half; furnishing only in slots the home has; Nebenkosten by the `housing` tick |
| `guestbook_sign(host, body)`, `guestbook_delete(entry)` | write | alpha_07 · visitors once a day, the host deletes |
| `cosmetics_get`, `cosmetic_buy(key)`, `cosmetic_equip(kind, key)`, `avatar_set(card)` | read/write | alpha_07 · looks (CSS keys) and the card picture (only cards owned) |
| `insurance_get`, `insurance_set(kind, on)` | read/write | alpha_07 · daily premiums by the `insurance` tick (no money ends the policy); lost parcels and Wasserschaden |
| changed in alpha_07 | | `toplist_get` (lists ruf, best_pull, pechvogel, league; `look`, `card_id`, `week_ends_at`), `profile_get` (look, trophies, home, Gästebuch), `players_get` and `chat_doc` (look), `titles_of` (bought titles), `give_card` (best pull), `goods_move` (league adjustment), `shipment_deliver` (lost parcels), `net_worth` (half of housing and furnishing), plus the skill hooks in `roll_pack_cards`, `ankauf_sell`, `binder_get`, `sale_ship`, `ad_npc_offer`, `npc_buy_cheap`, `bunker_rate_base`, `gift_tax`, `gift_allowance_left`, `ads_doc` and a trigger on `chargebacks` |
| changed in alpha_06 | | `net_worth`, `goods_value`/`goods_doc`, `trade_inventory`, `binder_get` (raw `copies` + `slabs`), `cardmarket_item_doc` (owned `slabs`, listing labels), `my_market_doc`, `seller_get`, `ads_doc` (`suspicious` with the Echt-oder-Fake buff), `ad_npc_offer`, `npc_buy_cheap` and `sale_ship` value slabs by `private.slab_value`; `order_fill` never takes a slab; `minigame_finish` grants a job's buff (`buff:mj_<game>`) for a good round |
| `sync(after_notification, after_feed, after_chat)` | read | alpha_04 adds `chat_unread` (messages by others after the device's last seen id; 0 before the first visit) and `chat_last_id` |



Naming: `<area>_<verb>` in schema `public`. Reads are `stable` and return one jsonb document for a page; writes take
`p_request_id` first and return the changed state.

| Area | Reads | Writes |
|------|-------|--------|
| Session | `sync`, `me_get`, `recap_get` | `join` (username, password, invite code), `login`, `logout`, `recap_collect`, `settings_set`, `account_reset`, `account_delete` |
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

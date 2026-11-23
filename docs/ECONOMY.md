# TCGEmpire — Economy and Balancing

> Status: **approved plan** (owner answers of 21 Nov 2026 included). All numbers are *starting values*.
> They live in config, not in code, and are tuned with the simulation (§13). Formulas are implemented
> **once**, in SQL; the client never recalculates them.

## 1. Principles

1. **Our own price scale, between real life and idle-game inflation.** Prices start about 20× above real
   life (a booster costs 100 €), incomes grow about ×2.000 during a run, and a slow server-wide
   **Preisniveau** (§4) lets all numbers creep up with the group's progress. Late game is millions and
   billions, never trillions of trillions.
2. **Open economy with a full audit trail.** Money is created by sources and destroyed by sinks. Every
   change goes through one function and is logged with a reason code.
3. **Scarcity is real.** Out-of-print product is finite. Every opened pack is gone forever.
4. **NPC money is finite.** NPC traders have budgets; you cannot dump unlimited cards on them.
5. **Idle is capped, active is rewarded.**
6. **Losses are capped and explained.**
7. **Balance by measurement**, in base euros (§4), so inflation never distorts a comparison.

## 2. Units

| Thing | Storage | Notes |
|-------|---------|-------|
| Money | `bigint` cents, sent to the browser as a JSON number | Hard cap 9 × 10¹⁵ cents (exact in JavaScript). Exponential formulas compute in `numeric` and clamp. |
| Config money values | **Basis-€** (`*_base_cents`) | Turned into real cents only by `private.eur()`, which multiplies by the Preisniveau. |
| Rates, fees, odds | basis points (`_bps`) or parts per million | No floats stored. |
| Time | `timestamptz`, server clock only | Daily reset **00:00 Europe/Berlin**; weekly reset Monday 00:00. |

## 3. Progression targets

Owner target: **level 100 in about 2–3 weeks** for an active player.

```
minutes_for_level(n) = 0.5 + 0.17 × n^1.3            (standard active play)
ep_to_next(n)        = round( (25 + 8.5 × n^1.3) × 1.035^n )
reward_scale(n)      = 1.03^n                        (all EP rewards are multiplied by this; since alpha_12 it grows
                                                      slower than ep_to_next, so the late game slows down step by step)
```

| Level | Minutes for this level | Active hours so far | Reached on (2.5 h/day, before idle EP) |
|-------|------------------------|---------------------|-----------------------------------------|
| 10 | 4 | 0.3 | first 20 minutes |
| 20 | 9 | 1.3 | day 1 |
| 30 | 15 | 3.2 | day 2 |
| 50 | 28 | 10 | day 4–5 |
| 75 | 47 | 26 | day 10–11 |
| 90 | 60 | 39 | day 15–16 |
| 100 | — | 49 | day 18–20 (idle EP brings it nearer to 2.5 weeks) |

**Reference income** — what an active player at level *n* should earn per hour from all non-trading
sources, in Basis-€. It is the unit for rewards ("a daily quest pays 20 minutes of reference income").

```
ref_income(n) = 900 × 1.08^n   Basis-€ per hour
```

| Level | Reference income / h | Typical mix |
|-------|----------------------|-------------|
| 1 | ~1.000 € | Pfandflaschen |
| 10 | ~1.900 € | Minijobs, bunker, selling pulls |
| 20 | ~4.200 € | Shifts, bunker, trading |
| 30 | ~9.100 € | First company orders |
| 50 | ~42.000 € | Company, wholesale, streaming |
| 75 | ~290.000 € | Large company |
| 100 | ~2 Mio. € | Everything maxed |

**Catch-up:** a player more than 10 levels below the server median gets +25 % EP (shown as
"Aufholbonus"), so friends who start later or play less stay in reach.

### 3.1 Where EP comes from (tuned with the simulation, alpha_03)

| Source | EP | Why |
|--------|----|-----|
| Minijob round | 40–120 level-1 units by score | Drives the first hour (energy-limited) |
| Booster | 15 + 3 per new card | The core action; money-limited |
| Mini / daily / weekly quest | 0.03 / 0.2 / 0.8 **of the current level** each; all five dailies +0.5 level | Proportional at every level, so quests never flood early levels and stay worth it late (halved in alpha_12, see below) |
| Stempel | 0.2 of a level | Daily return |
| Achievement tier | 0.1 / 0.2 / 0.4 / 0.8 of a level | Milestones feel big; 199 tiers add up |
| Shift hour | 150 level-1 units | Idle progress |
| Bunker collect, sale | 15, 5 | Small acknowledgement |

Measured by `pnpm sim` (bot, 150 active minutes per day, 22 Nov 2026): level 10 after 12 min, level 20 at the start of
day 2, level 30 on day 3, level 40 on day 4, level 45 on day 5. The early game is a firehose of playing; mid game is
driven by quests and shifts. Remaining gap to the target (level 30 on day 2): idle waiting once energy and money run
out on day 1 — the market features of alpha_04 add things to do there. `sim/pace.test.ts` guards the pace in CI.
Since alpha_10 the sim runs the events and calendar ticks too, from a fixed Monday morning (23 Nov 2026, so that
weekly events fall the same way on every run) and the bot syncs once a day like a client. 5 days: level 10 after
12 min, 20 and 25 on day 2, 30 and 35 on day 3, 40 on day 4, level 44 at the end; income 49 % shifts, 18 % quests,
13 % level rewards, 10 % Stempelkarte, 7 % bunker; events change the pace by about one level, within the bands.
alpha_11 (with ~200 achievement tiers paying EP): level 30 on day 2, 40 on day 4, level 47 after 5 days; the 20-day run
ends at level 68 (see §11 for the late-game finding).

**alpha_12 balance pass** (`SIM_EP=1 SIM_TRACE=1 pnpm sim 36 150 2`): the bot now plays like an active player who does
every quest (decision 107), and the EP shares and the reward growth were set from it (decision 109). Level 30 on day 2,
50 on day 5, 75 on day 9, **100 on day 14** (34 active hours). The bot wastes no second, so a real player at 2,5 hours
a day should land at about 2,5–3 weeks, the owner's target. EP by level band: up to level 10 mostly minijobs; levels
10–60 packs ≈ 40 %, quests 20–25 %, achievements 10–20 %, minijobs 10–15 %; from level 60 quests ≈ 45 %, packs ≈ 35 %.
The slow late game measured in alpha_11 came from the bot, not the game: it idled once its one kiosk product was sold
out, spent game time on actions that failed and, from day 6 on, moved one worker back and forth between two stations
all day. Money: shifts bring about 65 % of the income, quests 13 %, bunker 9 %, stamps 7 % (the bot keeps its company
profit in the company); the playtest shows the real mix in the admin console (Geldfluss).

## 4. Preisniveau (the game's own inflation)

One server-wide number, **P**. Everything the game itself prices or pays is defined in Basis-€ and
multiplied by P: store prices, card values, NPC budgets, wages, bunker yield, quest rewards, fees, upgrade
and housing prices, fines.

```
C_med = median "career level" (level + 100 × prestige) of players active in the last 72 hours
P     = min( 250, 1.018 ^ max(0, C_med − 20) )
```

- Updated once a day at 00:00; never falls; rises at most 10 % per day.
- P stays at 1.0 until the group is past level 20, so the first day has stable prices.
- Guide values: end of the first run ×4.2 (booster 420 €), end of the second ×25, cap ×250.
- **Not** multiplied: money you already hold, prices players set themselves, private loans. So cash and
  old debts slowly lose value — holding cards and sealed is the hedge. That is the whole real effect;
  in Basis-€ nothing changes, which keeps balancing simple.
- The feed reports it daily ("Inflation heute: +2,3 %. Döner jetzt 387 €."); the Döner price is the
  visible gauge. The "i" explains it in two sentences.
- One config value sets the rate; 1.0 switches inflation off.

All euro amounts in the rest of this document are **Basis-€**.

## 5. Card and sealed prices

### 5.1 Base values (in print, neutral market, ungraded)

Each card has a **tier** and a **desirability** `d` from 1 to 10 (from the set files).

```
base_value = lo × (hi / lo)^((d − 1) / 9)
```

| Tier | lo | hi |
|------|----|----|
| Common | 0,20 € | 2,40 € |
| Uncommon | 0,80 € | 7 € |
| Rare | 3 € | 24 € |
| Holo | 24 € | 160 € |
| Alternative | 250 € | 1.250 € |
| Ultra | 6.950 € | 22.200 € |
| Grail | 29.170 € | 48.620 € |

A rarer tier is worth more by the same factor, so its share of a booster's value, and with it every other card's
value, stays: `0.0.3` Ultra 1:200 and Grail 1:2.000 (×2,78; were 1:72 and 1:720), `0.0.4` Alternative 1:50 (×2,08;
was 1:24), Ultra 1:1.000 (×5) and Grail 1:3.500 (×1,75). The ranges before: Alternative 120–600 €, Ultra 500–1.600 €,
Grail 6.000–10.000 €.

**Empiremon** (house sets, 0.0.5) has its own ranges because its odds are its own (Ultra 1:10.000, Grail 1:50.000,
otherwise a Common; `pack.house_hit_odds_ppm`): Common 0,05–2 €, Ultra 400.000–800.000 €, Grail 2,5–5 Mio. € before
calibration (`HOUSE_TIER_VALUE` in `content/catalog.ts`). After calibration to the same 72 % a Common is worth
0,04–0,15 €, an Ultra about 590.000–640.000 € and a Grail about 4,0–4,3 Mio. €: nearly the whole booster value sits in
two tiers nobody pulls.

The same Glurak is worth a multiple as a PSA 10 (§5.3) and again a multiple once the set is out of print
(§5.2) — that is where the big numbers come from.

A calibration script scales each set's values so that the **expected value of a booster = 72 % ± 3 % of
its price** with that set's odds (expected scaling factor 0.8–1.25). A test fails the build if a set
leaves the band. A typical Holo is worth less than the booster it came from; opening packs is a gamble,
not an income source.

### 5.2 Market value formula

```
marktwert(card) = base_value × P
                × set_factor(set)          -- supply phase and scarcity
                × hype_index(game)         -- market cycle, shared per game
                × card_hype(card)          -- mean-reverting noise + event shocks
                × pressure(card)           -- recent net buying or selling
```

| Factor | Behaviour |
|--------|-----------|
| **set_factor, in print** | Starts at 1.25 at release, decays towards 0.60 as packs are opened and supply builds up. |
| **set_factor, out of print** | `1 + a × (1 − sealed_left / sealed_at_oop)^b + c × weeks_since_oop`, starting values a = 4, b = 1.5, c = 0.04, capped at 12. Sealed uses a steeper curve than singles. |
| **hype_index** | One value per game, range 0.55–2.2, mean 1.0. Slow random walk plus event shocks (Hype-Welle, Blase platzt). The boom/bust risk for investors. |
| **card_hype** | Range 0.7–1.6, reverts to 1.0 within days. Rumours and events push single cards. |
| **pressure** | Each trade moves it a little (bounded per player and day); half-life of a few hours. Makes dumping lower the price and blocks free arbitrage. |

Daily movement of a Marktwert is bounded (+18 % / −22 %, on top of P), except during named crash or hype
events. Prices are recalculated every 5 minutes; history is thinned (5-minute points for 2 days, hourly
for 14 days, daily forever).

### 5.3 Slab value

```
slab_value = marktwert(card) × grade_factor(grade) × pop_factor × brand_factor(grader)
```

| Grade | grade_factor | Share of pack-fresh hits (before skills) |
|-------|--------------|-------------------------------------------|
| 10 | 8.0 | 12 % |
| 9 | 2.2 | 38 % |
| 8 | 1.3 | 30 % |
| 7 | 1.0 | 13 % |
| ≤ 6 | 0.8 → 0.4 | 7 % |
| BGS 9.5 (Gem Mint) | 4 | BGS only; other half grades take the mean of their neighbours |
| BGS Black Label 10 | 20 | ~1 % (all four sub-grades 10; decision 066) |

- `pop_factor` for grade 10: `1 + 1.5 × pop_ref / (pop_ref + pop10)` — the fewer 10s exist, the more each
  is worth (up to ×2.5).
- `brand_factor`: PSA 1.00, BGS 0.95, CGC 0.85, player companies 0.40–1.10 from their Ruf.
- The lowest of the four hidden quality values dominates the grade; BGS shows all four (decision 066).
- Waiting times (Economy / Standard / Express): PSA 60 / 30 / 10 min, BGS 40 / 20 / 8 min, CGC 20 / 12 / 5 min
  (0.0.2, owner request after the first live days; were up to 6 h, which felt like waiting, not playing). Three cards at the
  graders at once at the start; the Einsende-Slots upgrade and each Master Set add more.
- The first 10s are worth the most: with `pop_ref` 5 the first 10 of a card at a grader gets ×2,25, the tenth ×1,5.

### 5.4 Sealed

| Set | Booster | Display | Case (wholesale) |
|-----|---------|---------|------------------|
| Pokémon Basis-Set (36 per display) | 100 € | 3.200 € | 18.200 € |
| Yu-Gi-Oh! LOB (24) | 80 € | 1.700 € | 9.700 € |
| One Piece OP-01 (24) | 100 € | 2.100 € | 12.000 € |
| Riftbound Origins (24) | 100 € | 2.100 € | 12.000 € |
| Empiremon (each of the five sets, kiosk only) | 200 € | — | — |

Sealed Marktwert in print = price × launch premium (1.0–1.6, decaying), never below 92 % of price. Out of
print it follows `set_factor` for sealed; a display also carries its guaranteed-hit premium.

## 6. Sources of money

| Source | Size (minutes of reference income unless stated) | Cap / gate |
|--------|---------------------------------------------------|------------|
| Start capital | 400 € from Mutti | Once |
| Minijob round (15–45 s) | 0.6–2.0 by performance | Energy |
| Shift | 55 % of reference income per hour × rank bonus | One at a time, max 8 h |
| Geldbunker | Base 120 €/h; Ertrag level k: `120 × 1.12^k` €/h; cost `500 × 1.17^k` € | Capacity 4–24 h |
| Mini-quest | 1 + 1 Pfandbon | Endless, deliberately tiny |
| Tagesquest | 20 each, +60 for all five | 5 per day |
| Wochenquest | 180 each + weekly chest | 5 per week |
| Level reward | 8 + booster every 5 levels | Per level |
| Stempelkarte | 10 → 120 over 7 days | Daily |
| Selling to NPCs | Marktwert × 60 % (Ankauf) up to ~100 % (NPC collectors) | NPC budgets, pressure |
| Company | §9 | Capacity, demand, Ruf |
| Streaming | Viewers × pull excitement | While opening packs |
| Achievements, events, league | Fixed tables | One-time or scheduled |

P2P trades, gifts and loans move money between players and are not sources.

## 7. Sinks

| Sink | Size |
|------|------|
| Store purchases | Booster 80–100 € (the largest early sink) |
| Market fees | Cardmarket 5 %, eBay 10 %, auction listing fee |
| Grading fees | Per card: PSA 360 / 700 / 1.600 €, BGS 280 / 550 / 1.300 €, CGC 150 / 300 / 700 € (Economy / Standard / Express), plus an upcharge on the card value above 10.000 € (PSA 3 %, BGS 2 %, CGC 1 %) |
| Upgrades (incl. Abwehr) | Geometric ladders, factor 1.15–1.6 per level |
| Skill respec | 500 € × level (decision 073) |
| Housing | 5.000 € → 5 Mrd. € over 11 tiers (decision 074); furnishing 400 € → 500 Mio. € per item; Nebenkosten 0,5 % of the home price per day |
| Company | Founding 25.000 €, stages 150.000 € → 6 Mrd. €; wages, rent, power, material, equipment, research, marketing, late fees, fines |
| Taxes | Kapitalertragsteuer 25 % on company payouts; Schenkungssteuer 20 % above the daily gift allowance; late fees |
| Insurance, Nebenkosten | Versand 20 € per day; Hausrat 0,3 % of the bulk value per day (at least 5 €) |
| Consumables | Döner 150 €, Club-Mate 50 €, Kaffee 35 € |
| Cosmetics and luxury | 1.000 € → 100 Mrd. € |
| Megaprojekte | 20 Mrd. € → 2 Bio. € shared server goals (tracked in Basis-€) |
| Museum auctions | Open-ended |
| Attacks, fines, rerolls, Rubbellose | Various |

Target sink share (money destroyed ÷ money created per day): 55–70 % early, 80–95 % late.

## 8. Idle caps

| System | Cap |
|--------|-----|
| Geldbunker | Capacity in hours (4 → 24) |
| Shift | Chosen length, max 8 h; staff shifts once the company exists |
| Company pipeline | Full speed for 12 h without owner login, then 50 % |
| Grading orders | Parallel slots (3 → 20) |
| Listings | Slots (10 → 200); NPC buying limited by budgets |
| Energy | 100 (→ 200), +1 per 3 min |

## 9. Company model (grading)

Settled in 10-minute cycles by the server tick; missed cycles are caught up oldest-first with a cap.

```
demand/h   = base_demand(stage) × hype_index × ruf_factor × price_factor × marketing × speed_factor
capacity/h = min over stations ( Σ staff_tempo × equipment_factor )
finished   = min(backlog + demand, capacity)
revenue    = Σ finished × fee(service level)
costs      = wages + rent + materials × finished + electricity
accuracy   = weighted staff Genauigkeit × equipment → share of correct grades → Ruf drift
```

- `ruf_factor` 0.3 (★1) … 1.0 (★3.5) … 1.8 (★5); `price_factor` falls when you charge more than the NPC
  graders adjusted for your brand; `speed_factor` falls when the backlog exceeds one day.
- Player orders use the same pipeline but get their real grade from the card's hidden quality values —
  unless the owner bumps it (shady).
- Scandal check per bumped slab: small chance per day while it exists, certain on re-grade elsewhere.
- Company value (net worth, prestige) = 30 × average daily profit of the last 7 days + assets.
- Wages are never paid from negative cash: a broke company cuts output, it does not spiral.
- Target: a well-run company provides 50–70 % of reference income from level 35 on; a neglected one about
  breaks even; a badly mis-priced one loses money visibly, with the reason shown.
- **Calibrated in alpha_09** (`content/company.ts`, `company.*` config): customers per hour by stage 70 / 140 / 330 /
  800 / 2.000 / 5.000 / 13.000; staff 2 / 4 / 8 / 16 / 30 / 60 / 120; stage costs 25.000 € / 150.000 € / 1,2 Mio. € /
  12 Mio. € / 100 Mio. € / 800 Mio. € / 6 Mrd. € (stage 2 on paid from the company account); per worker and hour
  (Tempo 50) Annahme 40, Prüfung 16, Einschweißen 24, Versand 40, the owner counts as one worker everywhere;
  equipment ×1 → ×4,8 per station; fair price = big graders' average × brand (30 % + Ruf × 0,08 %); material 15 €
  per card. Simulation (bot founds at level 30 on day 2): the company earns 25–30 % of the day's income on stage 1,
  60 % once it is a GbR (day 7, level ~55); levelling pace unchanged. A full pass over levels 1–100 follows in the
  balance milestone.

## 10. Attacks, defence and other risks

### 10.1 Attack and block (owner decision: medium intensity, blockable)

Every hostile action is one roll:

```
success % = clamp( base % + attacker's Angriff bonus − defender's Abwehr bonus , 5 % , 85 % )
```

- **Angriff** comes mainly from **skills** (Schlitzohr branch): higher success, bigger loot share, lower
  cost, shorter cooldown.
- **Abwehr** comes mainly from **account upgrades** (bought with money, one ladder per attack type) plus a
  few defensive skills. A maxed defence against an unskilled attacker blocks 95 % of attempts.
- A **blocked** attack costs the attacker the price plus a fine, and the defender gets a notification, a
  small "Schadenfreude" payout and the feed headline.

| Attack | Base success | Cost (min of ref. income) | Loot / effect | Matching Abwehr upgrade |
|--------|--------------|---------------------------|---------------|-------------------------|
| Bunker knacken | 45 % | 10 | 25 % of the *uncollected* bunker content (within the loss cap) | Sicherheit ("Wachhund Rex") |
| Beim Finanzamt anschwärzen | 50 % (only if there is something to find) | 10 | Target pays back tax + penalty (and the Zoll fine for Schwarzarbeit); tipster gets 10 % | Steuerkanzlei |
| 1-Stern-Bewertung | 55 % | 5 | −25 Ruf and a 1-star review | Rechtsschutz |
| Gerücht streuen | 50 % | 5 | One card's price pressure ±15 %, fading with the 4 h half-life | Faktencheck (the best one at the Stammtisch defends) |
| Abwerben | 40 % | 20 | Take the best employee (+20 % wage, loyalty 60) | Betriebsklima (+ loyalty / 5) |
| Präparierte Booster | 55 % (when opened) | 20 % of the booster value to prepare | Opener gets commons only | Prüfgerät (catches it; preparer pays the booster's value) |
| Kredit platzen lassen | — | — | Borrower keeps the money now (decision 085 consequences) | — |

Angriff: +5 per learned Schlitzohr skill, +10 as Rache. Abwehr: +5 per upgrade level, 10 levels. A blocked
attack costs the price again as a fine; 50 % of the fine goes to the defender as Schadenfreude.

Limits: max 2 successful attacks of one kind on the same victim per day; one action per attacker–victim pair
per hour; **daily loss cap from other players = 10 % of net worth excluding the collection**; targets need
level 35 like the attacker. Victims get Rache for 24 hours: half price and +10. Einbruch (slabs from the
Vitrine) is not built (decision 094).

### 10.2 Other risks

| Risk | Starting value | Protection |
|------|----------------|------------|
| Market crash | Hype index −30 … −45 % in a day, recovery over 5–10 days, about once per 2–3 weeks | Diversify across games; Insider skill |
| Bad grade | 20 % of hits grade ≤ 7 | Vorprüfung |
| Fake on Kleinanzeigen | 4 % of ads (12 % during Fälschungswelle) | Prüfgerät, job perk, skills |
| Lost / damaged parcel | 1.5 % uninsured | Versandversicherung |
| Chargeback (Kevin) | 15 % of Kevin sales | Decline Kevin; PayPal upgrade |
| Steuerprüfung | Back tax + 50 % penalty on undeclared amounts | Be honest, Steuerberater |
| Scandal | −150 … −400 Ruf, slab brand factor −30 % for 3 days | Do not bump grades |
| Negative personal events | Each ≤ 3 % of cash, max one per day | Insurance |
| Inflation | Cash loses value as P rises | Spend or invest |

Safety net: events cannot push a balance below zero; Pfandflaschen always work; and after a ruinous day
Mutti sends pocket money.

## 11. Prestige: not a shortcut back to riches

- Cash resets to the start capital; level, upgrades, skills, company and home reset.
- The kept collection goes to Omas Dachboden. Bringing items back is limited by storage (which reset with
  the home) **and** by a daily retrieval limit that grows with level, and selling them still hits NPC
  budgets and price pressure. A prestiged player is asset-rich but cash-poor for the first days.
- Empire-Perks give modest permanent multipliers (first prestige about +15 % income, +5 % Pack-Glück),
  with rising Sterne cost. Each run is faster, not trivial.
- Simulation target: after a prestige, reaching the previous run's peak net worth takes at least 50 % of
  the previous run's time.
- **Built in alpha_11 (decision 098):** Sterne per exit = 10 + ⌊√(value given up / 1 Mio. Basis-€)⌋, where the value
  given up is net worth without the collection. The 20-day simulation (150 active minutes a day) ends at level 68
  with 17,9 Mio. € net worth (company 7,1 Mio. €); extrapolated to level 100 a first exit gives about 17–20 Sterne,
  enough for +15 % wage and +5 % EP (Fleißiges Erbe 3, Schnellstarter 1). Perk cost per level: `costBase ×
  growth^level` (3 × 1,4ⁿ for most, 4 × 1,5ⁿ for Pack-Glück).
- **Measured in alpha_12** (36 simulated days, two exits): exits on day 15 and day 29 with 18 Sterne each. The second
  run reached level 100 in 14 days like the first and the first run's peak net worth (46 Mio. €) only on its last day,
  so the target (at least 50 % of the previous run's time) holds with room to spare; with the perks of two exits the
  third run reached level 75 in 7 days instead of 9. The alpha_11 pace finding was a bot artefact (see §3).

## 12. Anti-exploit rules

- Price influence only from trades within ±25 % of Marktwert; one counted trade per player pair and card
  per 24 h; self-trading impossible.
- Gift allowance per day by level; above it Schenkungssteuer. Loans count as debt for the borrower and as
  an asset for the lender.
- Wochenwertung ignores gifts, loans and off-market trades between players, Cardmarket prices away from the Marktwert
  and what a company charges a player above its fair price.
- **Fair play against second accounts (decision 111).** Extra accounts are allowed, so value must not flow freely
  between accounts, while normal play does not notice the limits:
  - Cardmarket: players list and bid only within **50–200 %** of the Marktwert (slabs at their value); NPC trade is
    the market itself and unchanged.
  - Company prices stay within **50–300 %** of the fair price; an order never pays more, even if the fair price fell.
  - Privatkredit: at most **a day (1.440 minutes) of the borrower's reference income**, and one running loan per
    borrower, so several loans cannot burst at once.
  - What a player **receives** as gifts or trade surpluses is capped at **120 minutes of their reference income per
    day**, next to the 20 % Schenkungssteuer of the giver. Fair trades (equal Marktwert) never count.
  - EP from opening packs only for the first **400 packs a day** (an all-out player opens about 250); new cards
    always count. Buying a second account's boosters no longer speeds up levelling.
  - At most **3 Aushelfen** received per player and day; Box Break spots at most **120 %** of the booster.
  - The admin console lists the largest one-way flows between players (gifts, trade surpluses, market prices away
    from the Marktwert, burst loans and interest, company orders) and the players who receive the most.
- New and freshly reset accounts: trade and gift lock for the first hour of play; account reset has a
  cooldown, and items of a reset or deleted account are destroyed, not handed to anyone.
- Pack battles and attacks have cooldowns and hourly limits.
- Mini-game payouts are capped by the theoretical maximum score; implausible scores pay zero.
- Every write is idempotent (request id) and rate-limited per player.
- Store limits are enforced per player and per restock on the server.

## 13. Balancing method (kept lean)

- **Bot players** (a few simple policies: casual, active, trader, idler) play against the real server
  logic in an in-memory database with an accelerated clock. One command, one table as output.
- Reported per bot: time to level, income per source, spending per sink, pack value, net worth.
- A handful of assertions in CI with wide bands: the level table (§3) ± 25 %, pack value band, sink share
  band, "no bot is broke for more than a day", "trader bot cannot earn risk-free".
- In production the admin console shows the same numbers from the ledger.

## 14. Formulas in one place

| Formula | Definition |
|---------|------------|
| EP to next level | `round((25 + 8.5 × n^1.3) × 1.035^n)` |
| Reference income | `900 × 1.08^n` Basis-€/h |
| Preisniveau | `min(250, 1.018^max(0, C_med − 20))`, daily, +10 % max per day |
| Any game-set amount | `Basis-€ × P` |
| Upgrade cost | `base × growth^level` |
| Bunker yield | `120 × 1.12^k` €/h × multipliers |
| Card base value | `lo × (hi/lo)^((d−1)/9)` × set calibration |
| Ankauf price | `marktwert × (0.60 + skills, max 0.80)` × pressure |
| Haggle acceptance | Logistic in (offer ÷ ask), seller stubbornness, your Händler skill |
| Attack success | `clamp(base + Angriff − Abwehr, 5 %, 85 %)` |
| Ruf → stars | `stars = ruf / 200` |
| Net worth | cash + bunker + cards + slabs + sealed + company value + 50 % housing and furnishing + loans given − loans taken |

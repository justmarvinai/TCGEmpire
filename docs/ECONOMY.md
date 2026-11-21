# TCGEmpire — Economy and Balancing

> Status: **PLAN.** All numbers are *starting values*. They live in config tables, not in code, and are
> tuned with the simulation harness (§12) before each alpha release. Formulas are implemented **once**,
> in SQL; the client never recalculates them.

## 1. Principles

1. **Real-feeling prices.** A booster costs 4,99 €, a Döner costs what a Döner costs. No secular
   inflation mechanic: "numbers go up" comes from income growth, scarcity and prestige, not from
   devaluing the euro.
2. **Open economy with a full audit trail.** Money is created by sources and destroyed by sinks. Every
   single change goes through one function and is logged with a reason code, so the admin dashboard shows
   exactly where money comes from and goes.
3. **Scarcity is real.** Out-of-print product is finite. Every opened pack is gone forever.
4. **NPC money is finite.** NPC traders have budgets; you cannot dump unlimited cards on them.
5. **Idle is capped, active is rewarded.** Idle income needs check-ins; skilled trading beats waiting.
6. **Losses are capped and explained.** No mechanic can take more than a stated share per day.
7. **Balance by measurement.** Pace and income targets below are asserted by automated simulations.

## 2. Units

| Thing | Storage | Notes |
|-------|---------|-------|
| Money | `bigint` cents | Hard cap 9 × 10¹⁵ cents so values stay exact as JSON numbers in the browser. Exponential formulas compute in `numeric` and clamp. |
| Rates, fees, odds | basis points (`_bps`) or parts per million (`_ppm`) | No floats in stored values. |
| Multipliers | `numeric(12,4)` in stats | Combined as additive % within a group, multiplicative across groups. |
| Time | `timestamptz`, server clock only | Daily reset 04:00 Europe/Berlin (Q-22). |

## 3. Progression targets

### 3.1 Level curve

```
ep_to_next(n) = round( 60 × n^1.1 × 1.035^n )        for n = 1 … 99
ep_scale(n)   = 1.035^n                              (all EP rewards are multiplied by this)
```

EP numbers grow with level (so rewards feel bigger), while the *time* per level follows `1.2 × n^1.1`
minutes of standard active play:

| Level | Active minutes for this level | Cumulative active hours | Target calendar time (2–3 h/day + idle) |
|-------|-------------------------------|-------------------------|------------------------------------------|
| 1 | 1 | 0 | first minutes |
| 10 | 15 | 1.3 | day 1 |
| 20 | 32 | 5.5 | day 3–4 |
| 30 | 51 | 13 | day 7 |
| 50 | 89 | 37 | ~2.5 weeks |
| 75 | 139 | 85 | ~4.5 weeks |
| 99 | 188 | 148 | ~6–7 weeks |

### 3.2 Reference income

`ref_income(n) = 45 × 1.08^n` € per hour — the income an active player at level *n* should roughly have
from all non-trading sources. It is the unit for scaling rewards ("a daily quest pays 20 minutes of
reference income").

| Level | Reference income / h | Typical mix |
|-------|----------------------|-------------|
| 1 | ~50 € | Pfandflaschen |
| 10 | ~100 € | Minijobs, bunker, selling pulls |
| 20 | ~210 € | Shifts, bunker, trading, first company orders |
| 35 | ~670 € | Company, wholesale, streaming |
| 50 | ~2.100 € | Company stage 3–4 |
| 75 | ~14.500 € | Company stage 5–6 |
| 100 | ~99.000 € | Company stage 7, everything upgraded |

Skilled trading, lucky pulls and risky plays can earn a multiple of this. Each prestige adds permanent
multipliers on top.

## 4. Card and sealed prices

### 4.1 Base values (in print, neutral market)

Each card has a **tier** and a **desirability** `d` from 1 to 10 (from the set files).

```
base_value = lo × (hi / lo)^((d − 1) / 9)
```

| Tier | lo | hi |
|------|----|----|
| Common | 0,02 € | 0,25 € |
| Uncommon | 0,10 € | 0,80 € |
| Rare | 0,40 € | 4 € |
| Holo | 2,50 € | 30 € |
| Alternative | 12 € | 90 € |
| Ultra | 35 € | 250 € |
| Grail | 300 € | 900 € |

A calibration script scales each set's values so that the **expected value of a booster = 72 % ± 3 % of
its UVP** with that set's odds. A test fails the build if a set leaves the band.

### 4.2 Market value formula

```
marktwert(card) = base_value
                × set_factor(set)          -- supply phase and scarcity
                × hype_index(game)         -- market cycle, shared per game
                × card_hype(card)          -- mean-reverting noise + event shocks
                × pressure(card)           -- recent net buying or selling
```

| Factor | Behaviour |
|--------|-----------|
| **set_factor, in print** | Starts at 1.25 at release (launch hype), decays towards 0.60 as packs are opened and supply builds up. |
| **set_factor, out of print** | `1 + a × (1 − sealed_left / sealed_at_oop)^b + c × weeks_since_oop`, starting values a = 4, b = 1.5, c = 0.04, capped at 12. Sealed product uses a steeper curve than singles. |
| **hype_index** | One value per game, range 0.55–2.2, mean 1.0. Moves by a slow random walk plus event shocks (Hype-Welle, Blase platzt). This is the boom/bust risk for investors. |
| **card_hype** | Range 0.7–1.6, reverts to 1.0 within days. Rumours and events push single cards. |
| **pressure** | Each trade moves it a little (bounded per player and day); decays with a half-life of a few hours. Prevents free arbitrage and makes dumping lower the price. |

Daily movement of any Marktwert is bounded (starting values +18 % / −22 %), except during named crash or
hype events. Prices are recalculated every 5 minutes; history is stored in thinned form (5-minute points
for 2 days, hourly for 14 days, daily forever).

### 4.3 Slab value

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
| BGS Black Label 10 | 20 | ~1 % (all four quality values = 10) |

- `pop_factor` for grade 10: `1 + 1.5 × pop_ref / (pop_ref + pop10)` — the fewer 10s exist, the more each is
  worth (up to ×2.5).
- `brand_factor`: PSA 1.00, BGS 0.95, CGC 0.85, player companies 0.40–1.10 from their Ruf.
- Grade from the four hidden quality values: the lowest value dominates (PSA style); BGS shows all four.

### 4.4 Sealed

- UVP: booster see `SETS.md`; display = packs × UVP × 0.89; case = 6 displays × 0.95 (wholesale EK lower).
- Sealed Marktwert in print = UVP × launch premium (1.0–1.6, decaying), never below 92 % of UVP.
- Out of print: follows `set_factor` for sealed; a display also carries its guaranteed-hit premium.

## 5. Sources of money

| Source | Size (in minutes of reference income unless stated) | Cap / gate |
|--------|-----------------------------------------------------|------------|
| Minijob round (45 s) | 0.6–2.0 by performance | Energy |
| Shift | 55 % of reference income per hour, × rank bonus | One shift at a time, max 8 h |
| Geldbunker | Base 6 €/h; Ertrag level k: `6 × 1.12^k` €/h; cost `25 × 1.17^k` € | Capacity 4–24 h |
| Mini-quest | 1 + 1 Pfandbon | Endless, deliberately tiny |
| Tagesquest | 20 each, +60 for all five | 5 per day |
| Wochenquest | 180 each + weekly chest | 5 per week |
| Level reward | 60 + item | Per level |
| Stempelkarte | 10 → 120 over 7 days | Daily |
| Selling to NPCs | Marktwert × 60 % (Ankauf) up to ~100 % (NPC collectors) | NPC budgets, pressure |
| Company | See §8 | Capacity, demand, Ruf |
| Streaming | Viewers × pull excitement | While opening packs |
| Achievements, events, league | Fixed tables | One-time or scheduled |

P2P trades, gifts and loans move money between players and are not sources.

## 6. Sinks

| Sink | Size |
|------|------|
| Retail purchases | UVP (the largest early sink) |
| Market fees | Cardmarket 5 %, eBay 10 %, auction listing fee |
| Grading fees | PSA 18 € Economy / 35 € Standard / 80 € Express, plus 3 % upcharge above 500 € card value; BGS and CGC cheaper |
| Upgrades | Geometric ladders, factor 1.15–1.6 per level |
| Skill respec | 500 € × level |
| Housing | 5.000 € → 250 Mio. € over 11 tiers; decor 20 € → 25 Mio. € per item |
| Company | Stage costs 25.000 € → 500 Mio. €; wages, rent, equipment, research, marketing |
| Taxes | Kapitalertragsteuer 25 % on company payouts; Schenkungssteuer 20 % above the daily gift allowance; late fees |
| Insurance, Nebenkosten | Recurring, scaled to what is insured |
| Consumables | Döner 7,50 €, Club-Mate 2,50 €, Kaffee 1,80 € (the Döner price creeps up as a running gag) |
| Cosmetics and luxury | 50 € → 5 Mrd. € |
| Megaprojekte | 1 Mrd. € → 100 Mrd. € shared server goals |
| Museum auctions | Open-ended |
| Hostile actions, fines, rerolls, Rubbellose | Various |

Target sink share (money destroyed ÷ money created per day): 55–70 % early game, 80–95 % late game, so
cash piles grow but stay meaningful. The admin dashboard shows this ratio.

## 7. Idle caps

| System | Cap |
|--------|-----|
| Geldbunker | Capacity in hours (4 → 24) |
| Shift | Chosen length, max 8 h; staff shifts from level 20 |
| Company pipeline | Full speed for 12 h without owner login, then 50 % ("Dienst nach Vorschrift") |
| Grading orders | Parallel slots (3 → 20) |
| Listings | Slots (10 → 200); NPC buying limited by budgets |
| Energy | 100 (→ 200), +1 per 3 min |

## 8. Company model (grading)

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
- Company value (for net worth and prestige) = 30 × average daily profit of the last 7 days + assets.
- Wages are never paid from negative cash: a broke company cuts output, it does not go into free fall.
- Target: a well-run company provides 50–70 % of reference income from level 25 on; a neglected one about
  breaks even; a badly mis-priced one loses money visibly, with the reason shown.

## 9. Risk and loss parameters

| Risk | Starting value | Protection |
|------|----------------|------------|
| Market crash | Hype index −30 … −45 % within a day, recovery over 5–10 days, about once per 2–3 weeks | Diversify across games; Insider skill |
| Bad grade | 20 % of hits grade ≤ 7 | Vorprüfung |
| Fake on Kleinanzeigen | 4 % of ads (12 % during Fälschungswelle) | "Echt oder Fake?" job perk, skills |
| Lost / damaged parcel | 1.5 % uninsured | Versandversicherung |
| Chargeback (Kevin) | 15 % of Kevin sales | Decline Kevin; PayPal upgrade |
| Bunker heist | Max 25 % of uncollected content per heist; max 2 successful heists on one victim per day | Sicherheit, collecting |
| Burglary | 1 slab, needs level 25, long cooldown | Alarm, insurance pays 80 % |
| Steuerprüfung | Back tax + 50 % penalty on undeclared amounts | Be honest, tax advisor |
| Scandal | −150 … −400 Ruf, slab brand factor −30 % for 3 days | Do not bump grades |
| Negative personal events | Each ≤ 3 % of cash, max one per day | Insurance |
| **Daily loss cap** from other players | 10 % of net worth excluding collection (Q-7 scales this) | — |

Safety net: balance cannot go below zero through events; Pfandflaschen always work; "Too Big To Fail"
keystone; and after a ruinous day Mutti sends 20 €.

## 10. Anti-exploit rules

- Price influence only from trades within ±25 % of Marktwert; one counted trade per player pair and card
  per 24 h; self-trading impossible.
- Gift allowance per day by level; above it Schenkungssteuer. Loans count as debt for the borrower and as
  an asset for the lender, so friends cannot inflate net worth.
- Wochenwertung ignores gifts, loans and trades between players far from Marktwert.
- New accounts: trade lock for the first hour of play.
- Pack battles and heists have cooldowns and hourly limits.
- Mini-game payouts are capped per round by the theoretical maximum score; implausible scores pay zero.
- Every write is idempotent (request id) and rate-limited per player.
- Retail limits are enforced per player and per restock on the server.

## 11. Formulas in one place

| Formula | Definition |
|---------|------------|
| EP to next level | `round(60 × n^1.1 × 1.035^n)` |
| Reference income | `45 × 1.08^n` €/h |
| Upgrade cost | `base × growth^level` (computed in `numeric`, clamped to the money cap) |
| Bunker yield | `6 × 1.12^k` €/h × multipliers |
| Card base value | `lo × (hi/lo)^((d−1)/9)` × set calibration |
| Ankauf price | `marktwert × (0.60 + skills, max 0.80)` × pressure |
| Haggle acceptance | Logistic in (offer ÷ ask), seller stubbornness, your Händler skill |
| Heist success | `base 45 % + thief skills − target security`, clamped 5–85 % |
| Ruf → stars | `stars = ruf / 200` |
| Net worth | cash + bunker + cards + slabs + sealed + company value + 50 % housing and decor + loans given − loans taken |

## 12. Balancing method (simulation harness)

- **Bot players** (scripts with simple policies: casual, active, trader, idler, whale) play against the
  real server logic in an in-memory database with an accelerated clock.
- Reported per bot and level: time to level, income per source, spending per sink, pack EV, net worth,
  company profit, share of idle vs. active income.
- **Assertions** in CI (wide bands at first): time-to-level table (§3.1) ± 25 %, pack EV band, sink share
  band, "no bot is broke for more than a day", "trader bot cannot earn risk-free".
- Every balance change states which number it is expected to move, and the harness confirms it.
- In production the admin dashboard shows the same KPIs from the ledger, so reality is compared with the
  simulation after each alpha.

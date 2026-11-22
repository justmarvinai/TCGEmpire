# TCGEmpire — Roadmap to 0.0.1

> **Current phase: `alpha_08` (Freunde) in progress — owner go on 22 Nov 2026.**

Versions: every milestone ships as `0.0.1-alpha_NN`. The first full release is `0.0.1`.
Each alpha is deployable and playable on its own, ends with a changelog entry, in-game patch notes and a
short report to the owner.

Legend: ☐ open · ◐ in progress · ☑ done · **M** must for 0.0.1 · **S** should (first to slip to 0.0.2)

## Phase 0 — Plan (this phase)

| | Task |
|---|------|
| ☑ | Game design, economy, architecture, data model, art direction, humour bible, decisions |
| ☑ | Curated card lists for the four first sets (`docs/sets/`) |
| ☑ | Agent guides (`CLAUDE.md`, `AGENTS.md`), changelog, roadmap |
| ☑ | Owner answered `USER_QUESTIONS.md`; answers worked into all documents |
| ☑ | **Owner gave the go for coding alpha_01** |

## Milestones

### alpha_01 — Fundament

Goal: a friend can register with an invite code on the live site and see an empty but real game shell.

| | Scope | |
|---|-------|---|
| ☑ | Repo setup: Vite, React, TypeScript strict, Tailwind tokens, ESLint, Prettier, Vitest, Playwright, CI | M |
| ☑ | **Spike:** the unchanged SQL runs in PGlite (Node tests and in the browser) and on Postgres 16 | M |
| ☐ | **Spike:** Realtime broadcast from the database — needs the real Supabase project; moved to the first feature that needs it (feed/chat in alpha_04). Polling `sync` covers everything until then. | M |
| ☑ | Database core: schemas, players, ledger, requests, config, Preisniveau (`private.eur`), modifiers engine, event bus, tick dispatcher, `sync` | M |
| ☑ | Login: own username + password on anonymous sessions, shared invite code; first account becomes admin | M |
| ☑ | App shell: sidebar, top bar HUD, feed rail, page frame, routing, locked-feature states | M |
| ☑ | Design system v1 on `/dev/ui`: tokens, buttons, panels, dialogs, toasts, number ticker, InfoTip ("i"), empty/skeleton/error states | M |
| ☑ | Painter toolkit v1 + atlas build + contact sheets; the small icon set (56 icons); bitmap fonts | M |
| ☑ | Audio synth v1 with a handful of presets; settings (sound, reduced motion) | M |
| ☑ | Deploy pipeline: Vercel config, migration runner from CI, keep-alive, owner guide `docs/SETUP.md` (the owner's one-time setup is still to do) | M |
| ☑ | **Art quality sample** for the owner: Pokémon card frame; Glurak (Grail) and Turtok (Ultra) at full detail; Pikachu, Professor Eich, Feuer-Energie as lower-tier cards; a booster and a slab. (Reduced from ten detailed cards by the owner's rule of 22 Nov: detail only for Ultra and Grail.) | M |

### alpha_02 — Rip

Goal: the core loop is fun on its own — earn a little, buy boosters, open them, collect.

| | Scope | |
|---|-------|---|
| ☑ | Content pipeline (TypeScript → seed) and the complete **Pokémon Basis-Set**: data; hero art for the remaining Ultras; simple template art in batches for all lower tiers | M |
| ☑ | Kiosk: buy boosters ×1/×5/×10; inventory for sealed, stacks and copies; quality values on hits | M |
| ☑ | **Pack opening**: tear, reveal, hit suspense by tier, summary, multi-rip ×5/×10, **Sofort aufdecken** (instant reveal, also as default setting), keyboard, fake chat | M |
| ☑ | Foil system and card inspect view | M |
| ☑ | Sammlung: binder per set, card detail, set progress | M |
| ☑ | Kartenladen-Ankauf (instant sell), bulk sell | M |
| ☑ | EP, levels 1–100 table, level-up overlay, level rewards, Level-Pfad | M |
| ☑ | Minijob **Pfandflaschen sammeln**, energy | M |
| ☑ | Tutorial with Mutti and Opa; mini-quests v1 | M |
| ☑ | Grail broadcast to everyone online | M |
| ☑ | Owner requests of 22 Nov: one reusable slab frame per grader with runtime text, one card back for all cards, reusable card model below Ultra | M |

### alpha_03 — Grind

Goal: there is always something to do and something running while away.

| | Scope | |
|---|-------|---|
| ☑ | Quest engine: mini, daily, weekly, Stempelkarte; rerolls; deep links | M |
| ☑ | Geldbunker with four upgrade tracks and visual tiers (simplified: the seven stages take the seven card-tier colours, no extra pixel art) | M |
| ☑ | Jobs: 3 more minijobs (Regale, Karten sortieren, Pakete), shifts with ranks and check-ins | M |
| ☑ | Upgrades (all groups, first tiers) with "jetzt → danach" | M |
| ☑ | "Willkommen zurück" recap; notifications centre (Mutti writes) | M |
| ☑ | Profile page with **Gefahrenzone** (account reset, account deletion) | M |
| ☑ | Achievements v1, statistics page, titles | M |
| ☑ | Pfandbons and the Pfandautomat shop; consumables (Döner, Fettfinger) | M |
| ☑ | Simulation harness v1 with pace assertions for levels 1–30 | M |
| ☑ | Unlock moments: NEU badge and a 2–3 step tour by Mutti for every level-unlocked feature (generic, data in `src/texts/de.ts`) | M |

Measured pace (simulation, 150 active minutes a day): level 10 after 12 minutes, 20 on day 2, 30 on
day 3, 45 on day 5. Level 30 is a day later than the design's curve: day 1 has idle waiting that the
market (alpha_04) is meant to fill; the simulation will tell after alpha_04.

### Redesign — own site layout (owner request, 22 Nov 2026)

Goal: the site gets its own, unmistakable layout. Icons and pixel art (cards, products) stay as they are.

| | Scope | |
|---|-------|---|
| ☑ | Mockups of layout directions (five, plus a variant), same screen each; the owner picked D2 "Nachtschicht" | M |
| ☑ | Build the chosen direction: shell, navigation, HUD, feed, panels, buttons, dialogs, overlays; 1440 px and 390 px | M |

### alpha_04 — Flip

Goal: a living market with NPCs, and stores worth racing for.

| | Scope | |
|---|-------|---|
| ☑ | Price model, tick, history, charts; Hype-Index per game; daily Preisniveau update with feed line | M |
| ☑ | **Cardmarket**: listings, buy orders, fees, shipping timers, seller pages | M |
| ☑ | **Kleinanzeigen**: NPC ads, haggling, own ads, lowballers, fakes | M |
| ☑ | NPC traders v1 (scalper, collector, investor, bulk buyer, Kevin) | M |
| ☑ | Retail stores with shared stock, restock schedule, limits; displays; Lager capacity | M |
| ☑ | Set lifecycle + admin console v1 (phases, restocks, invite code, config, job log) | M |
| ☑ | Net worth; toplists (Vermögen, Level, Bargeld, Sammlung) with NPC rivals | M |
| ☑ | Direkthandel and gifts with allowance | M |
| ☑ | KARTEN-BILD feed and Stammtisch chat; presence | M |

Kept lean or moved (alpha_04): Kaufland and Pokémon Center Online come with the event engine (alpha_10),
Großhandel with the company (alpha_09); shipping insurance and lost parcels with alpha_10; the display hit
guarantee is left to the Pech-Schutz; Kleinanzeigen deals are picked up at once; the Lager limits store
purchases only; the `preorder` phase only stops sales (no preorder mechanics yet). Chat, presence and
feed still poll: the Realtime spike needs the deployed Supabase project.

### alpha_05 — Vier Spiele

Goal: all four games are in, each with its own look.

| | Scope | |
|---|-------|---|
| ☑ | **Yu-Gi-Oh! LOB**, **One Piece OP-01**, **Riftbound Origins**: data, frames, card backs, packs, displays; hero art for Ultra and Grail, simple template art for the rest (one shared card back by owner rule; Riftbound hero style kept, Q-24) | M |
| ☑ | Starter choice and Händlerlizenzen | M |
| ☑ | Themed collection goals (Exodia, Strohhut crew, starters) and set bonuses | M |
| ☑ | Hobby lore worked into events, achievements and feed lines for all four games (events follow with the event engine in alpha_10) | M |

### alpha_06 — Grading

Goal: the gamble that multiplies value.

| | Scope | |
|---|-------|---|
| ☑ | Vorprüfung with tools; submission to PSA / BGS / CGC; service levels; timers | M |
| ☑ | Slab renderer (all label styles), grade reveal, Pop Report | M |
| ☑ | Slab pricing, crack and re-submit, Black Label | M |
| ☑ | Vitrine on the profile | M |
| ☑ | Minijobs "Echt oder Fake?" and "Grading-Praktikum" | M |

### alpha_07 — Leben

Goal: identity, build choices and the first big sinks.

| | Scope | |
|---|-------|---|
| ☑ | Skill tree (4 branches, keystones, respec) | M |
| ☑ | Housing ladder with furnishing slots (list UI, no room scenes), Wohnwert, storage, visits and Gästebuch | M |
| ☑ | Cosmetics (titles, name colours, frames, sleeves, binder skins, pack effects); profile picture from owned cards | M |
| ☑ | Profile pages; more toplists (Ruf, Bester Pull, joke lists); Wochenwertung | M |
| ☑ | Insurance (Versand, Hausrat; Rechtsschutz and Betriebshaftpflicht with their risks in alpha_09/10) | M |

### alpha_08 — Freunde

Goal: playing together, live.

| | Scope | |
|---|-------|---|
| ☑ | **Pack Battles**: lobby, modes, synced replay, spectators, emotes, bots | M |
| ☑ | Realtime layer in full (world, player, battle channels) | M |
| ☑ | Aushelfen, Kaffee und Kuchen, Sammelbestellung | M |
| ☐ | Box Breaks | S |
| ☐ | Privatkredit, Ehre record | S |

### alpha_09 — Firma

Goal: the business sim.

| | Scope | |
|---|-------|---|
| ☐ | Gewerbeanmeldung quest chain; founding; label designer | M |
| ☐ | Pipeline simulation, demand, costs, cycles, "Wo es hakt" panel | M |
| ☐ | Staff (applicants, hiring, training, loyalty), equipment, stages 1–4 | M |
| ☐ | Player orders to companies; brand factor on slabs; reviews; Ruf system complete | M |
| ☐ | Decisions, manual grading mini-game, marketing, taxes | M |
| ☐ | Shady options and scandals | M |
| ☐ | Großhandel | M |
| ☐ | Research, stages 5–7, Stille Teilhaberschaft | S |

### alpha_10 — Risiko

Goal: the world happens to you.

| | Scope | |
|---|-------|---|
| ☐ | Event engine with at least 25 events; **Tagesereignis** at 00:00, random events, 2–3 announced **Highlight-Events** per week | M |
| ☐ | Schattenwirtschaft: Bunker knacken, Finanzamt, 1-Stern, Gerücht, Abwerben, resealed/gewogen, Rache; **attack roll with Abwehr upgrades and Angriff skills, blocked outcomes**; daily loss cap | M |
| ☐ | Sonntags-Flohmarkt | S |
| ☐ | eBay-Auktionen | S |
| ☐ | Bares für Rares | S |
| ☐ | Calendar event framework + first calendar event | S |

### alpha_11 — Mogul

Goal: the endgame and the reason to start again.

| | Scope | |
|---|-------|---|
| ☐ | **Prestige (Exit)**: Empire-Sterne, perks, Omas Dachboden with retrieval limit, ranks | M |
| ☐ | Achievements complete (~200), titles | M |
| ☐ | Luxus, Megaprojekte, Museum auctions | S |
| ☐ | Streaming with Followers and sponsors | S |
| ☐ | Höhle der Löwen | S |

### alpha_12 — Feinschliff → **0.0.1**

Goal: it feels finished.

| | Scope | |
|---|-------|---|
| ☐ | Onboarding pass: every unlock has a tour; "i" on every panel; TCG-Lexikon; rules page | M |
| ☐ | Balance pass with the simulation over levels 1–100 and two prestiges; admin economy dashboard | M |
| ☐ | Art pass (cards and products only): Ultra and Grail hero art reviewed once more; animated Grails | M |
| ☐ | Sound pass; performance pass (bundle, atlas loading, tick duration); database size report | M |
| ☐ | Full playtest by the group; bug bash; final data policy decision (wipe or keep) | M |
| ☐ | Release `0.0.1` | M |

## After 0.0.1 (not planned in detail)

More sets (admin-released), further business units (Kartenladen, Automaten, Auktionshaus), drawn room
scenes and avatars, tournaments, Vereine (guilds), music, more calendar events, phone polish.

## Working agreement

- **Lean:** the smallest implementation that meets the design; no extras nobody asked for. If a planned
  item turns out to be expensive for little fun, it is cut or simplified and noted here.
- One milestone at a time; inside a milestone small commits that each pass typecheck, lint and tests.
- Each milestone starts with a short task breakdown in this file and ends with: changelog entry, version
  bump, deploy, a "what to try" list for the group, and open questions for the owner.
- Balance values are never guessed twice: the simulation says what a change did.
- Scope changes are written here before they are built.

# TCGEmpire — Guide for coding agents

German multiplayer browser game (desktop-first, pixel-art charm): an incremental business sim about the
trading-card hobby. Private game for one friend group. Must run on **Vercel Hobby + Supabase Free**.

## 0. Gate: are you allowed to code?

**Project phase: PLAN APPROVED, CODING NOT STARTED.** The owner answered all open questions on
21 Nov 2026 (`USER_QUESTIONS.md`) but has **not yet given the explicit go for `alpha_01`**.

- Until this section names an approved milestone, do not create application code, configs, migrations
  or content data. Documentation and planning only.
- When the owner explicitly says go, update this section to name the approved milestone, and work on
  that milestone only.
- After each alpha: report and wait for the go for the next one.
- Never start a later milestone, deploy, or change platform settings without the owner's go.

## 1. Read first

| Question | Document |
|----------|----------|
| What is the game? | `docs/GAME_DESIGN.md` |
| What is next? | `ROADMAP.md` |
| Numbers and formulas | `docs/ECONOMY.md` |
| How is it built? | `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md` |
| Why is it built that way? | `docs/DECISIONS.md` (append new decisions) |
| Look, pixel art, sound | `docs/ART_DIRECTION.md` |
| Tone of German texts | `docs/HUMOR.md` |
| Cards and sets | `docs/SETS.md`, `docs/sets/*.md` |
| Owner decisions and open questions | `USER_QUESTIONS.md` |

## 2. Stack (planned)

Vite, React 19, TypeScript strict, TanStack Router and Query, Zustand, Zod 4, Tailwind CSS 4 (own tokens
only), Radix UI, Motion, own WebAudio synth, own pixel painter toolkit. Supabase: Postgres with PL/pgSQL
RPCs, Auth, Realtime, pg_cron. Tests: Vitest, PGlite, Playwright. Package manager: pnpm.

Commands are added here when the repo is scaffolded (alpha_01). Until then there are none.

## 3. Hard rules

### Server authority

- Money, items, EP, timers and randomness change **only** inside `api.*` Postgres functions.
- The client has no table access. No `.from()` calls. No service-role key in the frontend.
- Every write RPC takes `p_request_id` and is idempotent.
- **A rule is implemented once, in SQL.** The client shows what RPCs return and never recomputes costs,
  odds or outcomes. The only client maths is interpolating time from server-provided rates.

### SQL

- Functions: `SECURITY DEFINER`, `set search_path = ''`, execute granted to `authenticated` only.
- Follow the RPC template in `docs/ARCHITECTURE.md` §5 (require player → replay check → rate limit → lock
  in fixed order → validate → change through engines → emit → return state).
- Cash changes only through `private.money_add` (ledger). Items only through the item helpers.
- Never call `now()` or `random()` directly: use the injectable clock and seeded rolls.
- No enum types. No `UPDATE`/`DELETE` without `WHERE`. Index every foreign key. RLS on every table.
- Schema changes are new migration files; never edit an applied migration.
- Loops over many entities in the tick use one sub-transaction per entity and log failures.
- Exponential formulas compute in `numeric` and clamp to the money cap.

### Money and numbers

- Money is `bigint` cents (`*_cents`); rates are basis points (`*_bps`). No floats for stored values.
- Convert to display strings only in the formatting helpers.

### Balancing and content

- No game value in code. Values live in `content/` and reach the database through the generated seed.
- Config money is **Basis-€** (`*_base_cents`). It becomes real money only through `private.eur()`
  (Preisniveau). Never charge or pay a raw config amount.
- Every balance change names the metric it should move; run the simulation and report the result.
- All names of brands, people and NPCs live in content files so they can be swapped in one place.

### UI

- Tokens only: no raw hex values or default Tailwind colours in components (exception: art palettes).
- All German text in `src/texts/` or content files, never inline in components.
- Every page: skeleton, empty and error state. Every action: hover, pressed, focus, disabled, loading,
  success. No bare spinners.
- Animate transform and opacity only; respect reduced motion; reveals are always skippable.
- Pixel art only through the pixel components, integer scaling only.
- Every panel, stat and price has an InfoTip ("i") with a plain-German explanation.
- New feature = unlock entry + tour + NEU badge. New component = entry on `/dev/ui`.
- Timers use the server clock offset.

### Art

- Art is code under `art/`, built into atlases. No binary art files are committed.
- **Pixel-art budget** (`docs/ART_DIRECTION.md` §0): full effort for cards and products only; elsewhere
  the small fixed icon set. Do not add avatars, scenes, portraits or decorative sprites.
- Card and product art goes through the review loop: build the contact sheet, look at it, compare with
  the art brief and checklist, refine. Produce template-based cards in batches with one review each.

### Language

- Code, identifiers, comments, commits, docs: **English**. Player-facing text: **German**.
- Tone: dark, rude, roasting in-game behaviour; hard swearing allowed; no slurs about protected traits,
  no party politics, real people only in their public role. Details: `docs/HUMOR.md`.

### Never

- Real money, purchases, ads, tracking.
- Public exposure of the game (it is invite-only and `noindex`).

## 4. Build lean (owner rule: fast, simple, token-efficient)

- Build the smallest thing that meets the design. No speculative abstractions, feature flags, options or
  config that the design does not ask for. Three similar lines beat a premature helper.
- Prefer the generic engines (modifiers, events, quests, timers, attack roll) over feature-specific code;
  new content should be data, not code.
- Reuse existing components and SQL helpers before writing new ones. One way to do each thing.
- Tests where money or items can be lost or duplicated, and one contract test per RPC. No exhaustive UI
  tests; a few Playwright smoke flows per milestone.
- Read only the docs and files the task needs (use search, not full re-reads). Keep reports short.
- If something planned turns out expensive for little fun, simplify it and note it in `ROADMAP.md`.
- Works with **two** players is the bar for every multiplayer feature.

## 5. Workflow

- Work in small, verifiable steps; commit after each logical step (Conventional Commits:
  `feat(market): …`, `fix(ui): …`, `docs: …`, `art(pokemon): …`).
- Before each commit: typecheck, lint, tests green.
- Visible changes: one Playwright screenshot at 1440 px per feature, and look at it; 390 px once per
  milestone.
- Record assumptions as a decision in `docs/DECISIONS.md`; tick progress in `ROADMAP.md`; update
  `docs/DATA_MODEL.md` with every migration.
- End of a milestone: `CHANGELOG.md` entry, version bump (`0.0.1-alpha_NN`), patch notes, report to the
  owner, then wait.
- Questions that only the owner can answer go into `USER_QUESTIONS.md` with a recommended default; do not
  block on them if a sensible default exists and the choice is cheap to change.

## 6. Definition of done (per feature)

1. Works with two players at the same time; no way to duplicate or lose money or items (invariant tests).
2. SQL tests: happy path, each error code, idempotent replay. Contract test for every RPC answer.
3. UI states complete; German texts reviewed against `HUMOR.md`; InfoTips present.
4. Unlock level, tour and quests wired; feed and notification lines where it makes sense.
5. Balance values in content; simulation still within its bands.
6. Docs updated (data model, decisions, roadmap).

# TCGEmpire — Guide for coding agents

German multiplayer browser game (desktop-first, pixel-art charm): an incremental business sim about the
trading-card hobby. Private game for one friend group. Must run on **Vercel Hobby + Supabase Free**.

## 0. Gate: are you allowed to code?

**Approved milestone: `alpha_12` (Feinschliff → 0.0.1)** — owner go on 23 Nov 2026 (scope: `ROADMAP.md`). The
group playtest, the data policy and the release itself need the owner; deploy only with the owner's go.
- When the owner approves the next milestone, update this section to name it.
- Never deploy or change platform settings without the owner's go.

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

Vite, React 19, TypeScript strict, React Router, TanStack Query, Zustand, Zod 4, Tailwind CSS 4 (own tokens
only), Radix UI, Motion, own WebAudio synth, own pixel painter toolkit. Supabase: Postgres with PL/pgSQL
RPCs, Auth, Realtime, pg_cron. Tests: Vitest, PGlite, Playwright. Package manager: pnpm.

```bash
pnpm dev          # dev server; without .env.local it runs in local mode (real server SQL in the browser)
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint
pnpm test         # Vitest: SQL logic and RPC contracts (in-memory Postgres), formatting, art quality gates
pnpm test:e2e     # Playwright smoke tests against the production build in local mode
pnpm build        # art atlases + type check + production build
pnpm seed         # regenerate supabase/seed/config.sql from content/ (run after changing content/)
pnpm art:build    # build the PNG atlases into public/atlas (not committed)
pnpm art:sheet    # contact sheets for art review into art/.sheets (not committed)
bash scripts/db-migrate.sh   # apply migrations + seed to $DATABASE_URL (CI does this on main)
bash scripts/db-migrate-api.sh  # the same over Supabase's HTTPS API when Actions cannot run (owner's go each time)
```

Where things are: `supabase/migrations` (schema and RPCs), `supabase/tests` (SQL tests and the harness),
`content/` (balance and content data), `src/lib/schemas.ts` (one Zod contract per RPC), `src/lib/backend`
(Supabase and local mode), `src/texts/de.ts` (all German UI text), `src/components/ui` (building blocks,
shown on `/dev/ui`), `art/` (painter toolkit, frames, card art), `docs/SETUP.md` (owner's one-time setup).

New RPC checklist: SQL function in a migration → `select private.expose(...)` → contract in
`RPC_SCHEMAS` → test in `supabase/tests` (a test fails if an exposed function has no contract).

## 3. Hard rules

### Server authority

- Money, items, EP, timers and randomness change **only** inside the RPC functions (schema `public`,
  which holds nothing but the API; tables live in `game`, helpers in `private`).
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
- **Detail only where it pays (owner rule):** Ultra and Grail cards are individually crafted (up to four
  review rounds). Every lower tier is simple: template-based, few shapes, small palette, produced in
  batches with ONE contact-sheet review per batch. Do not polish lower-tier cards beyond clean and
  recognisable.
- **Reuse before drawing (owner rule):** every card below Ultra comes from the reusable card model in
  `art/kit/` (data spec per card, no bespoke draw code). One card back for every card of every game
  (`card-back`). One reusable slab frame per grading company; card art and label text (normal font) are
  put on top at runtime, never baked into a slab image.

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

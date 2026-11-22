# Changelog

All notable changes to TCGEmpire. Versions before the first full release are `0.0.1-alpha_NN`;
the first full release will be `0.0.1`.

## [0.0.1-alpha_01] — Fundament (22 Nov 2026)

The foundation: no gameplay yet, but a real, running game shell.

### Added

- **Login:** register with username, password and the shared invite code; the first account sets the code
  and becomes admin. Sign in from any browser, sign out, account lock after too many wrong passwords.
- **Server core:** players, money with a full ledger, levels 1–100 with EP and skill points, the
  Preisniveau (daily, tied to the group's progress), notifications, news feed, the server tick with daily
  reset at 00:00, and automatic clean-up of old data.
- **App shell:** sidebar with every planned area (locked ones show their level, unfinished ones say
  "Bald"), top bar with money, level, Ruf, energy and Preisniveau, the KARTEN-BILD feed, start page.
  Every stat has an "i" that explains it.
- **Look and sound:** dark pixel-framed design, 56 pixel icons, sound effects generated in code, settings
  for volume and reduced animations.
- **Card art pipeline:** cards, card backs, boosters and slabs are drawn by code. Quality sample: Glurak
  (Grail) and Turtok (Ultra) in full detail, three lower-tier cards plus the red-cheeks Pikachu, a
  Glurak booster, and PSA-, BGS- and CGC-style slabs.
- **Operations:** local mode (the whole game runs in one browser for development), automatic tests,
  database migrations and a daily keep-alive for the free Supabase plan, setup guide `docs/SETUP.md`.

## [Unreleased]

### Planning

- Complete project plan: game design, economy, architecture, data model, art direction, humour bible
  and decision log under `docs/`.
- Curated card lists for the four launch sets under `docs/sets/`: Pokémon Basis-Set, Yu-Gi-Oh! Legend of
  Blue Eyes White Dragon, One Piece OP-01 Romance Dawn, Riftbound Origins.
- Roadmap with twelve alpha milestones up to release 0.0.1.
- Guides for coding agents (`AGENTS.md`, `CLAUDE.md`) and the list of open questions for the owner
  (`USER_QUESTIONS.md`).

- Owner decisions of 21 Nov 2026 worked into the plan: level 100 in 2–3 weeks, own price scale (booster
  100 €) with a slow server-wide Preisniveau, blockable attacks (Abwehr upgrades vs. Angriff skills),
  one shared invite code, first account is admin, daily reset at 00:00, daily and highlight events,
  darker tone, Gefahrenzone (account reset and deletion), multi-pack opening with instant reveal from
  level 1, pixel art concentrated on cards and products.

No game code exists yet. Coding starts with the owner's go for alpha_01.

# TCGEmpire

**Vom Pfandflaschen-Sammler zum Karten-Mogul.**

A private, German multiplayer browser game (desktop-first, pixel-art charm): an incremental business sim
about the trading-card hobby. Open packs, flip cards, scalp restocks, grade, run your own grading company,
help and betray your friends.

> **Status: plan approved, coding not started.** No game code exists yet. See `ROADMAP.md`.

## Documents

| Document | Content |
|----------|---------|
| [`USER_QUESTIONS.md`](./USER_QUESTIONS.md) | Owner decisions and open questions |
| [`ROADMAP.md`](./ROADMAP.md) | Milestones `0.0.1-alpha_01` … `0.0.1` |
| [`CHANGELOG.md`](./CHANGELOG.md) | What changed |
| [`docs/GAME_DESIGN.md`](./docs/GAME_DESIGN.md) | The game: systems, loops, unlocks, scope |
| [`docs/ECONOMY.md`](./docs/ECONOMY.md) | Formulas, sources and sinks, risk, balancing method |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Stack, data flow, free-plan budget, testing, deployment |
| [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) | Planned tables and RPCs |
| [`docs/ART_DIRECTION.md`](./docs/ART_DIRECTION.md) | Look, pixel-art pipeline, UI, motion, sound |
| [`docs/HUMOR.md`](./docs/HUMOR.md) | Tone, cast, running gags, real-name rules |
| [`docs/SETS.md`](./docs/SETS.md) + [`docs/sets/`](./docs/sets) | Launch sets, tiers, pack odds, curated card lists |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Decision log |
| [`AGENTS.md`](./AGENTS.md), [`CLAUDE.md`](./CLAUDE.md) | Rules for coding agents |

## Platform

Vercel Hobby (static site) + Supabase Free (Postgres, Auth, Realtime). Private and invite-only.

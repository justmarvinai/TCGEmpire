# Changelog

All notable changes to TCGEmpire. Versions before the first full release are `0.0.1-alpha_NN`;
the first full release will be `0.0.1`.

## [0.0.1-alpha_04] — Flip (22 Nov 2026)

The market is alive: prices move, NPC traders compete with you, stores run out, and your friends can
trade with you, chat with you and overtake you on the toplists.

### Added

- **Marktwert** for every card and sealed product, updated every five minutes: hype per game, supply and
  demand, daily limits, price charts (day, week, month, all).
- **Cardmarket** (from level 10): fixed-price listings and buy orders with money held in escrow, parcels
  that take a few minutes, a 5 % seller fee, seller pages, ten places (more with the Verkaufsfläche upgrade).
- **NPC traders:** Scalper-Sven empties stores and flips on the Cardmarket; collectors, investors and a bulk
  buyer trade with you; Kevin (12) pays too much.
- **Stores** (from level 4): Müller and Smyths restock at fixed times with stock shared by everybody,
  limits per player, closed on Sundays; the Würfelbude keeps a weekly allocation that grows with your Ruf.
  **Displays** with 36 boosters. **Lager** (from level 18): stores only sell you what you can store.
- **Kleinanzeigen** (from level 4): attic finds, normal sellers and dreamers; haggle, get blocked, buy
  fakes or bent cards, sellers who vanish after payment. Your own ads are free; Lars lowballs, Kevin
  overpays and his mum may book it back.
- **Toplisten:** Vermögen, Level, Bargeld and Sammlung, with 40 NPC tycoons who grow every day (you can
  hide them) and "noch X bis Platz N". Overtakes make the news.
- **Net worth** now counts everything you own at Marktwert, also listed, shipped or advertised cards; the
  home page shows its last seven days.
- **Tausch and gifts** (from level 10): offer goods and money to a friend, both sides confirm; gifts and
  lopsided trades are free up to a daily allowance, above it 20 % Schenkungssteuer. New accounts wait an
  hour.
- **Spieler** page with who is online; **Stammtisch** chat with card links and emotes; KARTEN-BILD now
  reports big deals and the day's biggest price moves.
- **Admin console:** set phases (out of print, reprint), instant restocks, invite code, live balance
  values, money flow, players, compensation and announcements.

### Changed

- **New look "Nachtschicht":** dark glass panels on soft colour glows, a floating sidebar with every page,
  stats as pills that explain themselves on click, your level as a ring around your avatar, page search
  with Strg+K, and KARTEN-BILD as a news button. The home page shows your last big pull, net worth, the
  next step, the bunker, quests, the Stempelkarte and the latest headlines at a glance. Cards and boosters
  look exactly as before.

### Fixed

- Unlock messages named some features by their internal key ("Neu freigeschaltet: cardmarket"); they now
  use the real name.

## [0.0.1-alpha_03] — Grind (22 Nov 2026)

There is always something to do now, and something keeps running while you are away.

### Added

- **Tagesquests** (from level 2): five a day, new at midnight, one free reroll per day, a bonus for all
  five. **Wochenquests** (from level 13): five per week, new on Monday, a chest with three boosters for
  all five. "Hin" takes you straight to where a quest gets done.
- **Stempelkarte** (from level 2): stamp once a day for a little more money each day and a booster on day
  7; a weekly joker catches up one missed day.
- **Geldbunker** (from level 3): fills with money on its own, offline too, until it is full. Four upgrade
  tracks: Ertrag, Kapazität, Zinsen (a bonus when you empty it at least 90 % full) and Sicherheit. Seven
  stages from Sparschwein to Geldspeicher.
- **Upgrades** (from level 5): nine upgrades for opening, work, progress and the bunker; each shows
  "jetzt → danach", income upgrades also when they have paid for themselves.
- **New minijobs:** Regale einräumen bei Müller (level 3), Karten sortieren in der Würfelbude (level 6),
  Pakete ausliefern für DHL (level 10).
- **Schichten** (from level 7): 15 minutes to 8 hours, running while you do other things; check in every
  30 minutes for more pay; ranks from Aushilfe to Filialleitung pay more per hour.
- **Snacks and the Pfandautomat:** Döner (lots of energy, but Fettfinger: fresh hits get worse surfaces
  for 10 minutes), Club-Mate and Kaffee at the Kiosk; Pfandbons from quests buy Energie-Bon, Lern-Bon,
  Glücks-Bon and a Kiosk-Gutschein. Running effects sit as icons in the top bar.
- **Profil:** statistics, 18 achievements with tiers, and titles to wear next to your name.
- **Gefahrenzone:** reset your account to a fresh start (once per 24 h) or delete it for good; type your
  name and hold the button.
- **Willkommen zurück:** after ten minutes away you get a summary and collect bunker and finished shift
  with one click.
- **Neu freigeschaltet:** every feature a level unlocks gets a NEU badge in the menu and a short tour
  from Mutti on its page.

### Changed

- Quests, stamps and achievements pay EP relative to your level, so they stay worth it all the way up.
  Level-up money is a little smaller in return.

## [0.0.1-alpha_02] — Rip (22 Nov 2026)

The first real gameplay: earn a little, buy boosters, rip them, collect, sell.

### Added

- **Pokémon Basis-Set** with all 90 cards: Glurak, Turtok, Bisaflor and Mewtu in full detail, every other
  card from the new reusable card model. One card back for every card in the game.
- **Kiosk am Eck:** boosters ×1 / ×5 / ×10, 10 % Kioskzuschlag, daily limit.
- **Booster öffnen:** tear the pack, reveal card by card, suspense on the hit slot (longer the rarer),
  flashes and particles for hits, a fake live chat that roasts your pulls, ×5 / ×10 in one go, and
  **Sofort aufdecken** for the impatient. Summary with verdict, profit or loss, top hits and bulk sell.
  God Packs, Doppel-Hits and Pech-Schutz exist. Exact odds behind the "i" in the shop.
- **Sammlung:** binder for the set with filters, progress, value, card detail with tilt and foil.
- **Kartenladen-Ankauf:** sell single cards or all duplicates at 60 % of the value.
- **Levels:** every level pays money, every fifth a booster; level-up celebration; **Level-Pfad** shows
  what each level brings.
- **Pfandflaschen sammeln:** 45-second minijob for money, EP and Pfandbons; costs energy.
- **Mini-Quests:** always three, endless, every tenth gives a bonus booster.
- **Mamas Tutorial:** Opa's booster, the first steps through the game; skippable after step 3.
- **Big pulls** (Ultra, Grail) are announced to everyone and land in KARTEN-BILD.
- Slab frames for PSA, BGS, CGC and player companies (used from the grading update on).

### Changed

- Prices follow the new price scale: a booster costs 100 € (110 € at the Kiosk).

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

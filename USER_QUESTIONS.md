# Owner decisions

The owner answered on **21 Nov 2026**. Everything not answered explicitly uses the recommended default.
New questions are appended at the bottom with a recommended default.

**Still open: the explicit go to start coding `alpha_01`.**

## Decisions

| # | Topic | Decision | Source |
|---|-------|----------|--------|
| Q-1 | Rhythm | Build one alpha, report, wait for the go for the next one. | default |
| Q-2 | Accounts and deployment | Owner creates the Supabase project (Frankfurt) and the Vercel project and adds three GitHub secrets; every merge to `main` then deploys site and database. `*.vercel.app` domain. | default |
| Q-3 | Players | **2–10.** Everything must be fun with two. | owner |
| Q-4 | Login | Username + password + **one shared invite code** that is set once and can be used any number of times. Since Q-31 also an e-mail. | owner |
| Q-5 | Admin | **The first account created** is the admin. It plays normally and additionally sees the admin console. | owner |
| Q-6 | Pace | **Level 100 in about 2–3 weeks.** | owner |
| Q-7 | Betrayal | Medium. Attacks can be **blocked**: defence through account upgrades, more efficient attacks through skills. | owner |
| Q-8 | Humour | No insider jokes. **Dark humour and hard swearing are fine**; the group insults and rage-baits each other. Real brands and public figures as listed. No party politics. | owner |
| Q-9 | Card names | German where a German print exists, otherwise English. | owner |
| Q-10 | Four games | Pick a favourite at the start; the other three unlock as Händlerlizenzen. | default |
| Q-11 | Price scale | **Own economy between real life and idle inflation**: booster 100 €, incomes grow about ×2.000 per run, plus a slow server-wide Preisniveau (inflation). | owner |
| Q-12 | Prestige | Reset as proposed, collection kept in Omas Dachboden, and **getting hyper-rich again must not be easy**. | owner |
| Q-13 | NPC players | NPC rivals on toplists and as pack battle opponents, always labelled. | default |
| Q-14 | Phones | Desktop-first; phones work but are not polished. | default |
| Q-15 | Sound | Effects on, generated in code, volume sliders; no music in 0.0.1. | default |
| Q-16 | Sets and art | About 85–90 cards per set as listed in `docs/sets/`; ten finished cards, a booster and a slab are shown before mass production. | default |
| Q-17 | Releasing sets | Phases are switched by the owner in the admin console; new sets come with a game update. | default |
| Q-18 | Events | **Random daily events plus a few more exciting events spread over the week.** | owner |
| Q-19 | Discord | Not in 0.0.1. | default |
| Q-20 | Doc language | English. | default |
| Q-21 | Alpha save data | Wipes allowed during alpha, announced; fresh start at 0.0.1. | default |
| Q-22 | Daily reset | **00:00 German time**; weekly reset Monday 00:00. | owner |
| Q-23 | Additions | See below. | owner |
| Q-24 | Riftbound hero art | Keep our own archetypes ("your current take on the art is fine"). | owner |
| Q-25 | Kredit platzen lassen | An explicit button comes with the dark side in alpha_10; until then a loan bursts only when the money is missing on the due date. | owner |
| Q-26 | Pack Battles against bots | Keep: bots pay nothing, what they win is gone. | owner |
| Q-27 | eBay-Auktionen | Backlog for after 0.0.1. | owner |
| Q-28 | Anfängerschutz | Keep: players below level 35 can neither attack nor be attacked. | owner |
| Q-31 | E-Mail | **Register with e-mail, username and password** (23 Nov 2026), no verification. Login with the e-mail or the username. The shared invite code stays, so the game stays invite-only (default; say so if it should go). | owner |

## Additional owner requirements (21 Nov 2026)

1. **Gefahrenzone** in the profile: reset the account to a fresh one, and delete the account entirely.
2. **Multi-pack buying and ripping** (5 or 10 at a time) and **skip-rip** (instant reveal of everything).
3. **Pixel art only where it counts**: card and product artwork gets the full effort; elsewhere little
   pixel art, but what there is must be excellent. Keep usage low.
4. **Build lean**: no over-engineering; efficient on development time and tokens.
5. **Card art detail (22 Nov 2026):** only the two rarest tiers (Ultra, Grail) get detailed artwork;
   Common to Alternative are deliberately simpler.
6. **Art approved (22 Nov 2026):** Glurak/Turtok quality is the bar for top-tier cards; booster and card back
   are fine. One card back for every card in the game. Slabs: one reusable model per grading company with
   card name and grade in normal font. A reusable card model for everything below Ultra. Reuse wherever
   possible to save tokens.
7. **Go for alpha_02** given on 22 Nov 2026.
8. **Card text in real fonts for later sets (22 Nov 2026):** for every set added after the first full release
   (`0.0.1`), the text on cards is rendered at runtime in a real font; pixel art covers only the artwork and the
   card frame. Ultra and Grail keep their full hand-made art. Go for `alpha_06` given the same day.

## How to answer later

Write to Claude in chat. Changed decisions are recorded here and in `docs/DECISIONS.md` before any code
changes.

## Open questions

- Deployment still needs (see Q-2) the Supabase project, the Vercel project and three GitHub secrets — exact steps
  are given when deployment is wanted; coding and local testing work without them.
- **Q-29 Data at 0.0.1 (alpha_12):** what happens to the playtest's data when `0.0.1` goes live?
  **Recommended: keep the logins, reset all progress** — on release day every account starts fresh like after the
  Gefahrenzone reset (level 1, start money, no items, no company), usernames, passwords, the invite code and the admin
  stay; NPCs, market and Preisniveau start over. Fair toplists, nobody has to register again, and nothing from the
  alpha balance or the dev tools carries over. Alternatives: (b) keep everything from the playtest; (c) wipe
  everything including the accounts (everyone registers again).
  **Status 23 Nov 2026:** `0.0.1` is released and nothing was reset; a fresh start would now be a one-time step on the
  owner's explicit go.
- **Q-30 Playtest:** the group playtest needs the deployment (Q-2) first; `docs/PLAYTEST.md` is the one-page checklist
  for the group. Recommended: one week, everyone at least once a day, bugs to the owner with a screenshot.
- **Q-32 Firma late in the game (QA pass, 24 Nov 2026):** from about level 60 the company earns small change next to an
  overnight shift (about 5 % of the income at levels 90–100 in the simulation; ECONOMY §9 aims at 50–70 % from level 35),
  because stages 4–7 cost 12 Mio. / 100 Mio. / 800 Mio. / 6 Mrd. Basis-€ (× Preisniveau, about 3,5 at level 90) from the
  company account, and nothing new unlocks between level 66 and 99. **Recommended:** stages 4–7 for about 2 Mio. /
  10 Mio. / 50 Mio. / 250 Mio. Basis-€, stages 5–7 only from level 70 / 80 / 90 as the unlock table in GAME_DESIGN says
  (the server does not check that yet), measured first with a sim bot that grows its company. Alternatives: (b) leave it,
  the late game is about the collection and the toplists; (c) only the level checks. Not urgent: players reach level 60
  after about a week. Prestige stays as it is: a second run is not faster than the first, which Q-12 asks for.

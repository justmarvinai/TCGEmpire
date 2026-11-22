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
| Q-4 | Login | Username + password + **one shared invite code** that is set once and can be used any number of times. | owner |
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
- **Q-25 Kredit platzen lassen (alpha_08):** today the server collects a loan on its due date whenever the borrower
  has the money; a loan only bursts when the cash is not there (so betraying means spending it first). Should the
  dark side (level 35) add an explicit "Kredit platzen lassen" button? **Recommended default: yes, with the dark
  side in alpha_10; until then the automatic rule stays.**
- **Q-26 Pack Battles against bots (alpha_08):** bots pay nothing and their winnings vanish, so a battle against
  bots is worth the same as opening the packs yourself, just with more swing. **Recommended default: keep it.**
